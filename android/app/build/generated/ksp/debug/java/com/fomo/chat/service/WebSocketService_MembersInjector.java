package com.fomo.chat.service;

import com.fomo.chat.data.remote.WebSocketClient;
import dagger.MembersInjector;
import dagger.internal.DaggerGenerated;
import dagger.internal.InjectedFieldSignature;
import dagger.internal.QualifierMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

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
public final class WebSocketService_MembersInjector implements MembersInjector<WebSocketService> {
  private final Provider<WebSocketClient> webSocketClientProvider;

  public WebSocketService_MembersInjector(Provider<WebSocketClient> webSocketClientProvider) {
    this.webSocketClientProvider = webSocketClientProvider;
  }

  public static MembersInjector<WebSocketService> create(
      Provider<WebSocketClient> webSocketClientProvider) {
    return new WebSocketService_MembersInjector(webSocketClientProvider);
  }

  @Override
  public void injectMembers(WebSocketService instance) {
    injectWebSocketClient(instance, webSocketClientProvider.get());
  }

  @InjectedFieldSignature("com.fomo.chat.service.WebSocketService.webSocketClient")
  public static void injectWebSocketClient(WebSocketService instance,
      WebSocketClient webSocketClient) {
    instance.webSocketClient = webSocketClient;
  }
}
