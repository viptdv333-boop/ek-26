package com.fomo.chat.ui.settings;

import com.fomo.chat.data.remote.api.UsersApi;
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
public final class SettingsViewModel_Factory implements Factory<SettingsViewModel> {
  private final Provider<UsersApi> usersApiProvider;

  public SettingsViewModel_Factory(Provider<UsersApi> usersApiProvider) {
    this.usersApiProvider = usersApiProvider;
  }

  @Override
  public SettingsViewModel get() {
    return newInstance(usersApiProvider.get());
  }

  public static SettingsViewModel_Factory create(Provider<UsersApi> usersApiProvider) {
    return new SettingsViewModel_Factory(usersApiProvider);
  }

  public static SettingsViewModel newInstance(UsersApi usersApi) {
    return new SettingsViewModel(usersApi);
  }
}
