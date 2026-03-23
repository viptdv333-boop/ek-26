package com.fomo.chat.data.repository;

import com.fomo.chat.data.local.db.dao.ContactDao;
import com.fomo.chat.data.remote.api.ContactsApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
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
public final class ContactRepository_Factory implements Factory<ContactRepository> {
  private final Provider<ContactsApi> contactsApiProvider;

  private final Provider<ContactDao> contactDaoProvider;

  public ContactRepository_Factory(Provider<ContactsApi> contactsApiProvider,
      Provider<ContactDao> contactDaoProvider) {
    this.contactsApiProvider = contactsApiProvider;
    this.contactDaoProvider = contactDaoProvider;
  }

  @Override
  public ContactRepository get() {
    return newInstance(contactsApiProvider.get(), contactDaoProvider.get());
  }

  public static ContactRepository_Factory create(Provider<ContactsApi> contactsApiProvider,
      Provider<ContactDao> contactDaoProvider) {
    return new ContactRepository_Factory(contactsApiProvider, contactDaoProvider);
  }

  public static ContactRepository newInstance(ContactsApi contactsApi, ContactDao contactDao) {
    return new ContactRepository(contactsApi, contactDao);
  }
}
