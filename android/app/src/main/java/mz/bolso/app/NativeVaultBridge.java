package mz.bolso.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/** Encrypted local store behind the app's offline WebView. Nothing is sent to a server. */
public final class NativeVaultBridge {
    private static final String STORE = "bolsomz_native_v2";
    private static final int ROUNDS = 260_000;
    private static final SecureRandom RNG = new SecureRandom();
    private final SharedPreferences preferences;
    private final Map<String,String> sessions = new HashMap<>();

    public NativeVaultBridge(Context context) {
        preferences = context.getApplicationContext().getSharedPreferences(STORE, Context.MODE_PRIVATE);
    }
    private interface Operation {JSONObject run() throws Exception;}
    private static JSONObject response(boolean ok, String error) {
        JSONObject result=new JSONObject();
        try {result.put("ok",ok); if(error!=null) result.put("error",error);} catch(Exception ignored) {}
        return result;
    }
    private String run(Operation operation) {
        try { return operation.run().toString(); }
        catch(Exception ex) { return response(false,ex.getMessage()==null?"Não foi possível concluir a operação.":ex.getMessage()).toString(); }
    }
    private static String normalized(String raw) { return raw==null?"":raw.trim().toLowerCase(java.util.Locale.ROOT); }
    private static String b64(byte[] data) {return Base64.encodeToString(data,Base64.NO_WRAP);}
    private static byte[] decoded(String data) {return Base64.decode(data,Base64.NO_WRAP);}
    private static byte[] randomBytes(int count) {byte[] bytes=new byte[count]; RNG.nextBytes(bytes);return bytes;}
    private static String token() {return b64(randomBytes(32));}
    private static SecretKeySpec key(String password, byte[] salt, int rounds) throws Exception {
        if(password==null || password.isEmpty())throw new IllegalArgumentException("Introduz a palavra-passe.");
        PBEKeySpec spec=new PBEKeySpec(password.toCharArray(),salt,rounds,256);
        try{return new SecretKeySpec(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(),"AES");}
        finally {spec.clearPassword();}
    }
    private static byte[] encrypt(String text, SecretKeySpec key, byte[] nonce) throws Exception {
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,key,new GCMParameterSpec(128,nonce));
        return cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));
    }
    private static String decrypt(JSONObject record,String password) throws Exception {
        int rounds=record.getInt("iterations");
        if(rounds<100000||rounds>1000000)throw new SecurityException("Formato do cofre inválido.");
        SecretKeySpec k=key(password,decoded(record.getString("salt")),rounds);
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,k,new GCMParameterSpec(128,decoded(record.getString("iv"))));
        return new String(cipher.doFinal(decoded(record.getString("ciphertext"))),StandardCharsets.UTF_8);
    }
    private static JSONObject validateVault(String raw) throws Exception {
        if(raw==null||raw.length()>10_000_000)throw new IllegalArgumentException("Dados financeiros demasiado grandes.");
        JSONObject data=new JSONObject(raw);
        if(data.optInt("version",-1)!=1||!(data.opt("transactions") instanceof JSONArray)||!(data.opt("wallets") instanceof JSONArray))
            throw new IllegalArgumentException("Dados financeiros incompatíveis.");
        return data;
    }
    private static JSONObject encryptedRecord(String id,String name,String password,String vault) throws Exception {
        if(name==null||name.trim().isEmpty()||name.length()>60)throw new IllegalArgumentException("Introduz um nome válido.");
        if(password==null||password.length()<10)throw new IllegalArgumentException("A palavra-passe precisa de pelo menos 10 caracteres.");
        validateVault(vault);
        byte[] salt=randomBytes(16),iv=randomBytes(12);
        JSONObject record=new JSONObject();
        record.put("id",id).put("name",name.trim()).put("schema",1).put("iterations",ROUNDS)
                .put("salt",b64(salt)).put("iv",b64(iv))
                .put("ciphertext",b64(encrypt(vault,key(password,salt,ROUNDS),iv)))
                .put("updatedAt",new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.ROOT).format(new java.util.Date()));
        return record;
    }
    private JSONObject recordFor(String id) throws Exception {
        String value=preferences.getString(id,null);
        if(value==null)throw new IllegalArgumentException("Conta local inexistente neste dispositivo.");
        return new JSONObject(value);
    }
    private void save(String id,JSONObject record) {
        if(!preferences.edit().putString(id,record.toString()).commit())
            throw new IllegalStateException("Não foi possível guardar os dados no telemóvel.");
    }
    private void requireSession(String id,String session) {
        if(session==null||!session.equals(sessions.get(id)))throw new SecurityException("A sessão terminou. Entra novamente.");
    }
    @JavascriptInterface public synchronized String listUsers() {
        return run(() -> {
            JSONArray accounts=new JSONArray();
            for(Map.Entry<String,?> e:preferences.getAll().entrySet()) {
                try {JSONObject r=new JSONObject(String.valueOf(e.getValue()));
                    accounts.put(new JSONObject().put("id",r.getString("id")).put("name",r.getString("name")).put("updatedAt",r.optString("updatedAt")));
                } catch(Exception ignored) {}
            }
            return response(true,null).put("users",accounts);
        });
    }
    @JavascriptInterface public synchronized String exists(String rawId) {
        return run(() -> response(true,null).put("exists",preferences.contains(normalized(rawId))));
    }
    @JavascriptInterface public synchronized String createUser(String rawId,String name,String password,String vault) {
        return run(() -> {
            String id=normalized(rawId);
            if(!id.matches("[a-z0-9._@+\\-]{3,80}"))throw new IllegalArgumentException("Utiliza um identificador entre 3 e 80 caracteres, sem espaços.");
            if(preferences.contains(id))throw new IllegalArgumentException("Já existe uma conta com esse identificador.");
            save(id,encryptedRecord(id,name,password,vault));
            String session=token();sessions.put(id,session);unlock(id,password);
            return response(true,null).put("token",session);
        });
    }
    @JavascriptInterface public synchronized String loginUser(String rawId,String password) {
        return run(() -> {
            String id=normalized(rawId);
            JSONObject record=recordFor(id);
            JSONObject vault;
            try {vault=validateVault(decrypt(record,password));}
            catch(Exception ex) {throw new SecurityException("Palavra-passe incorreta ou cofre danificado.");}
            String session=token();sessions.put(id,session);unlock(id,password);
            return response(true,null).put("token",session).put("vault",vault)
                    .put("record",new JSONObject().put("id",id).put("name",record.getString("name")));
        });
    }
    @JavascriptInterface public synchronized String persist(String rawId,String session,String vault) {
        return run(() -> {
            String id=normalized(rawId);requireSession(id,session);
            JSONObject record=recordFor(id);
            // Session must already be unlocked, but it never stores a plaintext password.
            // The active encryption key is kept in memory by the native bridge.
            SecretKeySpec key=unlockedKeys.get(id);
            if(key==null)throw new SecurityException("O cofre está bloqueado.");
            byte[] nonce=randomBytes(12);
            record.put("iv",b64(nonce)).put("ciphertext",b64(encrypt(validateVault(vault).toString(),key,nonce)));
            save(id,record);
            return response(true,null);
        });
    }
    private final Map<String,SecretKeySpec> unlockedKeys=new HashMap<>();
    @JavascriptInterface public synchronized String endSession(String rawId,String session) {
        return run(() -> {
            String id=normalized(rawId);requireSession(id,session);
            sessions.remove(id);unlockedKeys.remove(id);return response(true,null);
        });
    }
    @JavascriptInterface public synchronized String backup(String rawId,String session) {
        return run(() -> {
            String id=normalized(rawId);requireSession(id,session);
            JSONObject data=new JSONObject().put("kind","bolsomz-backup").put("format",1).put("user",recordFor(id));
            return response(true,null).put("backup",data.toString(2));
        });
    }
    @JavascriptInterface public synchronized String changePassword(String rawId,String session,String oldPass,String newPass) {
        return run(() -> {
            String id=normalized(rawId);requireSession(id,session);
            if(newPass==null||newPass.length()<10||newPass.equals(oldPass))throw new IllegalArgumentException("Escolhe uma nova palavra-passe com 10 ou mais caracteres.");
            JSONObject prior=recordFor(id);
            String plain;
            try {plain=decrypt(prior,oldPass);}catch(Exception ex){throw new SecurityException("A palavra-passe atual não está correta.");}
            JSONObject next=encryptedRecord(id,prior.getString("name"),newPass,plain);
            save(id,next);
            unlockedKeys.put(id,key(newPass,decoded(next.getString("salt")),ROUNDS));
            return response(true,null);
        });
    }
    @JavascriptInterface public synchronized String restore(String json,String password) {
        return run(() -> {
            if(json==null||json.length()>12_000_000)throw new IllegalArgumentException("Backup demasiado grande.");
            JSONObject parsed=new JSONObject(json);
            if(!"bolsomz-backup".equals(parsed.optString("kind"))||parsed.optInt("format")!=1)
                throw new IllegalArgumentException("Backup inválido.");
            JSONObject record=parsed.getJSONObject("user");
            String id=normalized(record.getString("id"));
            if(!id.equals(record.getString("id"))||!id.matches("[a-z0-9._@+\\-]{3,80}"))throw new IllegalArgumentException("Conta inválida.");
            if(preferences.contains(id))throw new IllegalArgumentException("A conta já existe neste telemóvel.");
            try {validateVault(decrypt(record,password));}
            catch(Exception ex){throw new SecurityException("Palavra-passe incorreta ou backup danificado.");}
            save(id,record);
            return response(true,null).put("id",id);
        });
    }
    // Called by the Android shell only after createUser/loginUser. Never expose the key to JavaScript.
    private void unlock(String id,String password) throws Exception {
        JSONObject record=recordFor(id);
        unlockedKeys.put(id,key(password,decoded(record.getString("salt")),record.getInt("iterations")));
    }
}
