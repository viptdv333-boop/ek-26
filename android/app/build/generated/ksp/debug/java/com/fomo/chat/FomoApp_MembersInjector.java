package com.fomo.chat;

import com.fomo.chat.data.local.crypto.TokenManager;
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
public final class FomoApp_MembersInjector implements MembersInjector<FomoApp> {
  private final Provider<TokenManager> tokenManagerProvider;

  public FomoApp_MembersInjector(Provider<TokenManager> tokenManagerProvider) {
    this.tokenManagerProvider = tokenManagerProvider;
  }

  public static MembersInjector<FomoApp> create(Provider<TokenManager> tokenManagerProvider) {
    return new FomoApp_MembersInjector(tokenManagerProvider);
  }

  @Override
  public void injectMembers(FomoApp instance) {
    injectTokenManager(instance, tokenManagerProvider.get());
  }

  @InjectedFieldSignature("com.fomo.chat.FomoApp.tokenManager")
  public static void injectTokenManager(FomoApp instance, TokenManager tokenManager) {
    instance.tokenManager = tokenManager;
  }
}
