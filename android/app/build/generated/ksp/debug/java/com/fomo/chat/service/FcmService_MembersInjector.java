package com.fomo.chat.service;

import com.fomo.chat.data.local.crypto.TokenManager;
import com.fomo.chat.data.remote.api.UsersApi;
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
public final class FcmService_MembersInjector implements MembersInjector<FcmService> {
  private final Provider<UsersApi> usersApiProvider;

  private final Provider<TokenManager> tokenManagerProvider;

  public FcmService_MembersInjector(Provider<UsersApi> usersApiProvider,
      Provider<TokenManager> tokenManagerProvider) {
    this.usersApiProvider = usersApiProvider;
    this.tokenManagerProvider = tokenManagerProvider;
  }

  public static MembersInjector<FcmService> create(Provider<UsersApi> usersApiProvider,
      Provider<TokenManager> tokenManagerProvider) {
    return new FcmService_MembersInjector(usersApiProvider, tokenManagerProvider);
  }

  @Override
  public void injectMembers(FcmService instance) {
    injectUsersApi(instance, usersApiProvider.get());
    injectTokenManager(instance, tokenManagerProvider.get());
  }

  @InjectedFieldSignature("com.fomo.chat.service.FcmService.usersApi")
  public static void injectUsersApi(FcmService instance, UsersApi usersApi) {
    instance.usersApi = usersApi;
  }

  @InjectedFieldSignature("com.fomo.chat.service.FcmService.tokenManager")
  public static void injectTokenManager(FcmService instance, TokenManager tokenManager) {
    instance.tokenManager = tokenManager;
  }
}
