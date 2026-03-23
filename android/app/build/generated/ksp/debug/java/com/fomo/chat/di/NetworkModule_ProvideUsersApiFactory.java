package com.fomo.chat.di;

import com.fomo.chat.data.remote.api.UsersApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;
import retrofit2.Retrofit;

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
public final class NetworkModule_ProvideUsersApiFactory implements Factory<UsersApi> {
  private final Provider<Retrofit> retrofitProvider;

  public NetworkModule_ProvideUsersApiFactory(Provider<Retrofit> retrofitProvider) {
    this.retrofitProvider = retrofitProvider;
  }

  @Override
  public UsersApi get() {
    return provideUsersApi(retrofitProvider.get());
  }

  public static NetworkModule_ProvideUsersApiFactory create(Provider<Retrofit> retrofitProvider) {
    return new NetworkModule_ProvideUsersApiFactory(retrofitProvider);
  }

  public static UsersApi provideUsersApi(Retrofit retrofit) {
    return Preconditions.checkNotNullFromProvides(NetworkModule.INSTANCE.provideUsersApi(retrofit));
  }
}
