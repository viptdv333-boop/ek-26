package com.fomo.chat.ui.calls;

import androidx.lifecycle.SavedStateHandle;
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
public final class CallViewModel_Factory implements Factory<CallViewModel> {
  private final Provider<SavedStateHandle> savedStateHandleProvider;

  public CallViewModel_Factory(Provider<SavedStateHandle> savedStateHandleProvider) {
    this.savedStateHandleProvider = savedStateHandleProvider;
  }

  @Override
  public CallViewModel get() {
    return newInstance(savedStateHandleProvider.get());
  }

  public static CallViewModel_Factory create(Provider<SavedStateHandle> savedStateHandleProvider) {
    return new CallViewModel_Factory(savedStateHandleProvider);
  }

  public static CallViewModel newInstance(SavedStateHandle savedStateHandle) {
    return new CallViewModel(savedStateHandle);
  }
}
