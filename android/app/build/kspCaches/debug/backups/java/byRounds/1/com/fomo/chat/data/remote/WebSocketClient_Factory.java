package com.fomo.chat.data.remote;

import com.fomo.chat.data.local.crypto.TokenManager;
import com.google.gson.Gson;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;
import okhttp3.OkHttpClient;

@ScopeMetadata("javax.inject.Singleton")
@QualifierMetadata
@DaggerGenerated
@Generated(
    value = "dagger.internal.codegen.ComponentProcessor",
    comments = "https://dagger.dev"
)
@SuppressWarnings({
    "unchecked",
    "rawtypes",
    "KotlinInternal",
    "KotlinInternalInJava",
    "cast",
    "deprecation",
    "nullness:initialization.field.uninitialized"
})
public final class WebSocketClient_Factory implements Factory<WebSocketClient> {
  private final Provider<OkHttpClient> okHttpClientProvider;

  private final Provider<TokenManager> tokenManagerProvider;

  private final Provider<Gson> gsonProvider;

  public WebSocketClient_Factory(Provider<OkHttpClient> okHttpClientProvider,
      Provider<TokenManager> tokenManagerProvider, Provider<Gson> gsonProvider) {
    this.okHttpClientProvider = okHttpClientProvider;
    this.tokenManagerProvider = tokenManagerProvider;
    this.gsonProvider = gsonProvider;
  }

  @Override
  public WebSocketClient get() {
    return newInstance(okHttpClientProvider.get(), tokenManagerProvider.get(), gsonProvider.get());
  }

  public static WebSocketClient_Factory create(Provider<OkHttpClient> okHttpClientProvider,
      Provider<TokenManager> tokenManagerProvider, Provider<Gson> gsonProvider) {
    return new WebSocketClient_Factory(okHttpClientProvider, tokenManagerProvider, gsonProvider);
  }

  public static WebSocketClient newInstance(OkHttpClient okHttpClient, TokenManager tokenManager,
      Gson gson) {
    return new WebSocketClient(okHttpClient, tokenManager, gson);
  }
}
