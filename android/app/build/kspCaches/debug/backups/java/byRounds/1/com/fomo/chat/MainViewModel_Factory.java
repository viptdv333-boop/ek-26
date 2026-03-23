package com.fomo.chat;

import com.fomo.chat.data.local.crypto.TokenManager;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata
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
public final class MainViewModel_Factory implements Factory<MainViewModel> {
  private final Provider<TokenManager> tokenManagerProvider;

  public MainViewModel_Factory(Provider<TokenManager> tokenManagerProvider) {
    this.tokenManagerProvider = tokenManagerProvider;
  }

  @Override
  public MainViewModel get() {
    return newInstance(tokenManagerProvider.get());
  }

  public static MainViewModel_Factory create(Provider<TokenManager> tokenManagerProvider) {
    return new MainViewModel_Factory(tokenManagerProvider);
  }

  public static MainViewModel newInstance(TokenManager tokenManager) {
    return new MainViewModel(tokenManager);
  }
}
