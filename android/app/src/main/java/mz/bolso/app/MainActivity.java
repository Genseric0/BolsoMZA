package mz.bolso.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Android WebView container: all app resources are packaged locally and loaded using a secure HTTPS origin. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int EXPORT_DOCUMENT = 1002;
    private static final int IMPORT_DOCUMENT = 1003;
    private WebView webView;
    private String pendingContent;
    private String pendingMime;
    private ValueCallback<Uri[]> uploadCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(false);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain("appassets.androidplatform.net")
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView = new WebView(this);
        webView.setBackgroundColor(0xff0b0b13);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if(uploadCallback!=null)uploadCallback.onReceiveValue(null);
                uploadCallback=callback;
                try { startActivityForResult(params.createIntent(),IMPORT_DOCUMENT); return true; }
                catch(Exception ex) { uploadCallback=null; return false; }
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url=request.getUrl();
                return !("https".equals(url.getScheme()) && "appassets.androidplatform.net".equals(url.getHost()) && url.getPath()!=null && url.getPath().startsWith("/assets/"));
            }
        });
        // Only our packaged app is allowed to run JS. The bridge never reads files or exposes private data.
        webView.addJavascriptInterface(new ExportBridge(), "BolsoMZAndroid");
        setContentView(webView);
        webView.loadUrl(ORIGIN + "/assets/index.html");
    }

    private final class ExportBridge {
        @JavascriptInterface public void saveFile(String name, String content, String mime) {
            if(content==null || content.length()>12000000 || name==null ||
                    !(name.matches("BolsoMZ-[a-zA-Z0-9_.-]{1,90}\\.(json|csv)")) ||
                    !("application/json".equals(mime)||"text/csv;charset=utf-8".equals(mime))) return;
            runOnUiThread(() -> {
                pendingContent=content;
                pendingMime=mime;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mime);
                intent.putExtra(Intent.EXTRA_TITLE, name);
                try { startActivityForResult(intent,EXPORT_DOCUMENT); }
                catch(Exception ex) { Toast.makeText(MainActivity.this,"Não foi possível abrir o gestor de ficheiros.",Toast.LENGTH_LONG).show(); }
            });
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==IMPORT_DOCUMENT){
            if(uploadCallback!=null){uploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));uploadCallback=null;}
            return;
        }
        if(requestCode!=EXPORT_DOCUMENT)return;
        if(resultCode!=RESULT_OK || data==null || data.getData()==null){pendingContent=null;pendingMime=null;return;}
        if(pendingContent==null)return;
        try(OutputStream stream=getContentResolver().openOutputStream(data.getData())){
            if(stream==null)throw new IllegalStateException("Sem acesso ao ficheiro");
            stream.write(pendingContent.getBytes(StandardCharsets.UTF_8));
            Toast.makeText(this,"Cópia guardada.",Toast.LENGTH_SHORT).show();
        }catch(Exception ex){Toast.makeText(this,"Erro ao guardar a cópia. Tenta novamente.",Toast.LENGTH_LONG).show();}
        finally{pendingContent=null;pendingMime=null;}
    }

    @Override public void onBackPressed() {
        if(webView==null){super.onBackPressed();return;}
        webView.evaluateJavascript("window.bolsoAndroidBack ? window.bolsoAndroidBack() : false", result -> {
            if(!"true".equals(result)) MainActivity.super.onBackPressed();
        });
    }
    @Override protected void onDestroy() {
        if(webView!=null){webView.removeJavascriptInterface("BolsoMZAndroid");webView.destroy();webView=null;}
        super.onDestroy();
    }
}
