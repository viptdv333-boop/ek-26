package com.fomo.chat.ui.contacts;

import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;

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
public final class ContactsViewModel_Factory implements Factory<ContactsViewModel> {
  @Override
  public ContactsViewModel get() {
    return newInstance();
  }

  public static ContactsViewModel_Factory create() {
    return InstanceHolder.INSTANCE;
  }

  public static ContactsViewModel newInstance() {
    return new ContactsViewModel();
  }

  private static final class InstanceHolder {
    private static final ContactsViewModel_Factory INSTANCE = new ContactsViewModel_Factory();
  }
}
