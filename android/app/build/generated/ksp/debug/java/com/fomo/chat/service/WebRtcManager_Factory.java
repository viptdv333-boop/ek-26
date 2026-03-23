package com.fomo.chat.service;

import android.content.Context;
import com.fomo.chat.data.remote.WebSocketClient;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata("javax.inject.Singleton")
@QualifierMetadata("dagger.hilt.android.qualifiers.ApplicationContext")
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
public final class WebRtcManager_Factory implements Factory<WebRtcManager> {
  private final Provider<Context> contextProvider;

  private final Provider<WebSocketClient> webSocketClientProvider;

  public WebRtcManager_Factory(Provider<Context> contextProvider,
      Provider<WebSocketClient> webSocketClientProvider) {
    this.contextProvider = contextProvider;
    this.webSocketClientProvider = webSocketClientProvider;
  }

  @Override
  public WebRtcManager get() {
    return newInstance(contextProvider.get(), webSocketClientProvider.get());
  }

  public static WebRtcManager_Factory create(Provider<Context> contextProvider,
      Provider<WebSocketClient> webSocketClientProvider) {
    return new WebRtcManager_Factory(contextProvider, webSocketClientProvider);
  }

  public static WebRtcManager newInstance(Context context, WebSocketClient webSocketClient) {
    return new WebRtcManager(context, webSocketClient);
  }
}
