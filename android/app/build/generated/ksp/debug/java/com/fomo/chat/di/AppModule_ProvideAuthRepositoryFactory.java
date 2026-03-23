package com.fomo.chat.di;

import com.fomo.chat.data.local.crypto.TokenManager;
import com.fomo.chat.data.remote.api.AuthApi;
import com.fomo.chat.data.repository.AuthRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

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
public final class AppModule_ProvideAuthRepositoryFactory implements Factory<AuthRepository> {
  private final Provider<AuthApi> authApiProvider;

  private final Provider<TokenManager> tokenManagerProvider;

  public AppModule_ProvideAuthRepositoryFactory(Provider<AuthApi> authApiProvider,
      Provider<TokenManager> tokenManagerProvider) {
    this.authApiProvider = authApiProvider;
    this.tokenManagerProvider = tokenManagerProvider;
  }

  @Override
  public AuthRepository get() {
    return provideAuthRepository(authApiProvider.get(), tokenManagerProvider.get());
  }

  public static AppModule_ProvideAuthRepositoryFactory create(Provider<AuthApi> authApiProvider,
      Provider<TokenManager> tokenManagerProvider) {
    return new AppModule_ProvideAuthRepositoryFactory(authApiProvider, tokenManagerProvider);
  }

  public static AuthRepository provideAuthRepository(AuthApi authApi, TokenManager tokenManager) {
    return Preconditions.checkNotNullFromProvides(AppModule.INSTANCE.provideAuthRepository(authApi, tokenManager));
  }
}
