package mz.bolso.app;

import static org.junit.Assert.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class NativeVaultInstrumentedTest {
    private JSONObject result(String s) throws Exception {return new JSONObject(s);}
    @Test public void registrationLoginPasswordReopenPersistAndBackup() throws Exception {
        NativeVaultBridge vault=new NativeVaultBridge(InstrumentationRegistry.getInstrumentation().getTargetContext());
        String id="test-"+System.currentTimeMillis();
        String pass="UmaSenhaForte_2026!";
        String original="{\"version\":1,\"wallets\":[],\"goals\":[],\"transactions\":[]}";
        JSONObject created=result(vault.createUser(id,"Teste Android",pass,original));
        assertTrue(created.toString(),created.getBoolean("ok"));
        assertTrue(result(vault.exists(id)).getBoolean("exists"));
        assertFalse(result(vault.loginUser(id,"senha-errada")).getBoolean("ok"));
        String token=created.getString("token");
        String altered="{\"version\":1,\"wallets\":[],\"goals\":[],\"transactions\":[{\"amount\":1500}]}";
        assertTrue(result(vault.persist(id,token,altered)).getBoolean("ok"));
        JSONObject backup=result(vault.backup(id,token));
        assertTrue(backup.getBoolean("ok"));
        assertFalse("Encrypted backup leaked transaction plaintext",backup.getString("backup").contains("amount"));
        assertTrue(result(vault.endSession(id,token)).getBoolean("ok"));
        assertFalse("Old token must be rejected",result(vault.persist(id,token,original)).getBoolean("ok"));
        JSONObject logged=result(vault.loginUser(id,pass));
        assertTrue(logged.toString(),logged.getBoolean("ok"));
        assertEquals(1500,logged.getJSONObject("vault").getJSONArray("transactions").getJSONObject(0).getInt("amount"));
        assertTrue(result(vault.changePassword(id,logged.getString("token"),pass,"OutraSenhaForte_2026!")).getBoolean("ok"));
        assertFalse(result(vault.loginUser(id,pass)).getBoolean("ok"));
        assertTrue(result(vault.loginUser(id,"OutraSenhaForte_2026!")).getBoolean("ok"));
    }
}
