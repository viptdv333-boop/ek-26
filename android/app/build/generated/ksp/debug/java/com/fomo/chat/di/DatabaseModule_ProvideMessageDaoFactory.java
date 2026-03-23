package com.fomo.chat.di;

import com.fomo.chat.data.local.db.FomoDatabase;
import com.fomo.chat.data.local.db.dao.MessageDao;
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
public final class DatabaseModule_ProvideMessageDaoFactory implements Factory<MessageDao> {
  private final Provider<FomoDatabase> dbProvider;

  public DatabaseModule_ProvideMessageDaoFactory(Provider<FomoDatabase> dbProvider) {
    this.dbProvider = dbProvider;
  }

  @Override
  public MessageDao get() {
    return provideMessageDao(dbProvider.get());
  }

  public static DatabaseModule_ProvideMessageDaoFactory create(Provider<FomoDatabase> dbProvider) {
    return new DatabaseModule_ProvideMessageDaoFactory(dbProvider);
  }

  public static MessageDao provideMessageDao(FomoDatabase db) {
    return Preconditions.checkNotNullFromProvides(DatabaseModule.INSTANCE.provideMessageDao(db));
  }
}
