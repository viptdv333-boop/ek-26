package com.fomo.chat.di;

import com.fomo.chat.data.remote.api.MessagesApi;
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
public final class NetworkModule_ProvideMessagesApiFactory implements Factory<MessagesApi> {
  private final Provider<Retrofit> retrofitProvider;

  public NetworkModule_ProvideMessagesApiFactory(Provider<Retrofit> retrofitProvider) {
    this.retrofitProvider = retrofitProvider;
  }

  @Override
  public MessagesApi get() {
    return provideMessagesApi(retrofitProvider.get());
  }

  public static NetworkModule_ProvideMessagesApiFactory create(
      Provider<Retrofit> retrofitProvider) {
    return new NetworkModule_ProvideMessagesApiFactory(retrofitProvider);
  }

  public static MessagesApi provideMessagesApi(Retrofit retrofit) {
    return Preconditions.checkNotNullFromProvides(NetworkModule.INSTANCE.provideMessagesApi(retrofit));
  }
}
