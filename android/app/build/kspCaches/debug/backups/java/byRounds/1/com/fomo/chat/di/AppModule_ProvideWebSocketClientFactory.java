package com.fomo.chat.di;

import com.fomo.chat.data.local.crypto.TokenManager;
import com.fomo.chat.data.remote.WebSocketClient;
import com.google.gson.Gson;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
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
public final class AppModule_ProvideWebSocketClientFactory implements Factory<WebSocketClient> {
  private final Provider<OkHttpClient> okHttpClientProvider;

  private final Provider<TokenManager> tokenManagerProvider;

  private final Provider<Gson> gsonProvider;

  public AppModule_ProvideWebSocketClientFactory(Provider<OkHttpClient> okHttpClientProvider,
      Provider<TokenManager> tokenManagerProvider, Provider<Gson> gsonProvider) {
    this.okHttpClientProvider = okHttpClientProvider;
    this.tokenManagerProvider = tokenManagerProvider;
    this.gsonProvider = gsonProvider;
  }

  @Override
  public WebSocketClient get() {
    return provideWebSocketClient(okHttpClientProvider.get(), tokenManagerProvider.get(), gsonProvider.get());
  }

  public static AppModule_ProvideWebSocketClientFactory create(
      Provider<OkHttpClient> okHttpClientProvider, Provider<TokenManager> tokenManagerProvider,
      Provider<Gson> gsonProvider) {
    return new AppModule_ProvideWebSocketClientFactory(okHttpClientProvider, tokenManagerProvider, gsonProvider);
  }

  public static WebSocketClient provideWebSocketClient(OkHttpClient okHttpClient,
      TokenManager tokenManager, Gson gson) {
    return Preconditions.checkNotNullFromProvides(AppModule.INSTANCE.provideWebSocketClient(okHttpClient, tokenManager, gson));
  }
}
