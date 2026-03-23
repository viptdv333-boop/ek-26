package com.fomo.chat.di;

import com.fomo.chat.data.remote.api.UploadApi;
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
public final class NetworkModule_ProvideUploadApiFactory implements Factory<UploadApi> {
  private final Provider<Retrofit> retrofitProvider;

  public NetworkModule_ProvideUploadApiFactory(Provider<Retrofit> retrofitProvider) {
    this.retrofitProvider = retrofitProvider;
  }

  @Override
  public UploadApi get() {
    return provideUploadApi(retrofitProvider.get());
  }

  public static NetworkModule_ProvideUploadApiFactory create(Provider<Retrofit> retrofitProvider) {
    return new NetworkModule_ProvideUploadApiFactory(retrofitProvider);
  }

  public static UploadApi provideUploadApi(Retrofit retrofit) {
    return Preconditions.checkNotNullFromProvides(NetworkModule.INSTANCE.provideUploadApi(retrofit));
  }
}
