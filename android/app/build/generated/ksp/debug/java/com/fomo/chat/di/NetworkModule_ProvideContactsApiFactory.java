package com.fomo.chat.di;

import com.fomo.chat.data.remote.api.ContactsApi;
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
public final class NetworkModule_ProvideContactsApiFactory implements Factory<ContactsApi> {
  private final Provider<Retrofit> retrofitProvider;

  public NetworkModule_ProvideContactsApiFactory(Provider<Retrofit> retrofitProvider) {
    this.retrofitProvider = retrofitProvider;
  }

  @Override
  public ContactsApi get() {
    return provideContactsApi(retrofitProvider.get());
  }

  public static NetworkModule_ProvideContactsApiFactory create(
      Provider<Retrofit> retrofitProvider) {
    return new NetworkModule_ProvideContactsApiFactory(retrofitProvider);
  }

  public static ContactsApi provideContactsApi(Retrofit retrofit) {
    return Preconditions.checkNotNullFromProvides(NetworkModule.INSTANCE.provideContactsApi(retrofit));
  }
}
