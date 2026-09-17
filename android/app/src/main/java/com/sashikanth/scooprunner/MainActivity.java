package com.sashikanth.scooprunner;
import android.annotation.SuppressLint;import android.os.Bundle;import android.webkit.*;import androidx.activity.OnBackPressedCallback;import androidx.appcompat.app.AppCompatActivity;import androidx.webkit.*;
public class MainActivity extends AppCompatActivity{
 WebView w;
 @SuppressLint("SetJavaScriptEnabled")@Override protected void onCreate(Bundle b){super.onCreate(b);w=new WebView(this);setContentView(w);w.getSettings().setJavaScriptEnabled(true);w.getSettings().setDomStorageEnabled(true);WebViewAssetLoader l=new WebViewAssetLoader.Builder().setDomain("appassets.androidplatform.net").addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();w.setWebViewClient(new WebViewClientCompat(){public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){return l.shouldInterceptRequest(r.getUrl());}});w.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){public void handleOnBackPressed(){if(w.canGoBack())w.goBack();else{setEnabled(false);getOnBackPressedDispatcher().onBackPressed();}}});}
 @Override protected void onResume(){super.onResume();w.onResume();}@Override protected void onPause(){w.onPause();super.onPause();}@Override protected void onDestroy(){w.destroy();super.onDestroy();}
}
