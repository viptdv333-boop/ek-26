package com.fomo.chat.di;

import com.fomo.chat.data.local.db.dao.ContactDao;
import com.fomo.chat.data.remote.api.ContactsApi;
import com.fomo.chat.data.repository.ContactRepository;
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
public final class AppModule_ProvideContactRepositoryFactory implements Factory<ContactRepository> {
  private final Provider<ContactsApi> contactsApiProvider;

  private final Provider<ContactDao> contactDaoProvider;

  public AppModule_ProvideContactRepositoryFactory(Provider<ContactsApi> contactsApiProvider,
      Provider<ContactDao> contactDaoProvider) {
    this.contactsApiProvider = contactsApiProvider;
    this.contactDaoProvider = contactDaoProvider;
  }

  @Override
  public ContactRepository get() {
    return provideContactRepository(contactsApiProvider.get(), contactDaoProvider.get());
  }

  public static AppModule_ProvideContactRepositoryFactory create(
      Provider<ContactsApi> contactsApiProvider, Provider<ContactDao> contactDaoProvider) {
    return new AppModule_ProvideContactRepositoryFactory(contactsApiProvider, contactDaoProvider);
  }

  public static ContactRepository provideContactRepository(ContactsApi contactsApi,
      ContactDao contactDao) {
    return Preconditions.checkNotNullFromProvides(AppModule.INSTANCE.provideContactRepository(contactsApi, contactDao));
  }
}
