package com.fomo.chat;

import android.app.Activity;
import android.app.Service;
import android.view.View;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.SavedStateHandle;
import androidx.lifecycle.ViewModel;
import com.fomo.chat.data.local.crypto.TokenManager;
import com.fomo.chat.data.local.db.FomoDatabase;
import com.fomo.chat.data.local.db.dao.ContactDao;
import com.fomo.chat.data.local.db.dao.ConversationDao;
import com.fomo.chat.data.local.db.dao.MessageDao;
import com.fomo.chat.data.remote.WebSocketClient;
import com.fomo.chat.data.remote.api.AuthApi;
import com.fomo.chat.data.remote.api.ContactsApi;
import com.fomo.chat.data.remote.api.ConversationsApi;
import com.fomo.chat.data.remote.api.MessagesApi;
import com.fomo.chat.data.remote.api.UploadApi;
import com.fomo.chat.data.remote.api.UsersApi;
import com.fomo.chat.data.repository.AuthRepository;
import com.fomo.chat.data.repository.ChatRepository;
import com.fomo.chat.data.repository.ContactRepository;
import com.fomo.chat.di.AppModule_ProvideAuthRepositoryFactory;
import com.fomo.chat.di.AppModule_ProvideChatRepositoryFactory;
import com.fomo.chat.di.AppModule_ProvideContactRepositoryFactory;
import com.fomo.chat.di.AppModule_ProvideTokenManagerFactory;
import com.fomo.chat.di.AppModule_ProvideWebSocketClientFactory;
import com.fomo.chat.di.DatabaseModule_ProvideContactDaoFactory;
import com.fomo.chat.di.DatabaseModule_ProvideConversationDaoFactory;
import com.fomo.chat.di.DatabaseModule_ProvideDatabaseFactory;
import com.fomo.chat.di.DatabaseModule_ProvideMessageDaoFactory;
import com.fomo.chat.di.NetworkModule_ProvideAuthApiFactory;
import com.fomo.chat.di.NetworkModule_ProvideAuthInterceptorFactory;
import com.fomo.chat.di.NetworkModule_ProvideContactsApiFactory;
import com.fomo.chat.di.NetworkModule_ProvideConversationsApiFactory;
import com.fomo.chat.di.NetworkModule_ProvideGsonFactory;
import com.fomo.chat.di.NetworkModule_ProvideLoggingInterceptorFactory;
import com.fomo.chat.di.NetworkModule_ProvideMessagesApiFactory;
import com.fomo.chat.di.NetworkModule_ProvideOkHttpClientFactory;
import com.fomo.chat.di.NetworkModule_ProvideRetrofitFactory;
import com.fomo.chat.di.NetworkModule_ProvideUploadApiFactory;
import com.fomo.chat.di.NetworkModule_ProvideUsersApiFactory;
import com.fomo.chat.service.CallService;
import com.fomo.chat.service.FcmService;
import com.fomo.chat.service.FcmService_MembersInjector;
import com.fomo.chat.service.WebSocketService;
import com.fomo.chat.service.WebSocketService_MembersInjector;
import com.fomo.chat.ui.auth.AuthViewModel;
import com.fomo.chat.ui.auth.AuthViewModel_HiltModules;
import com.fomo.chat.ui.auth.AuthViewModel_HiltModules_BindsModule_Binds_LazyMapKey;
import com.fomo.chat.ui.auth.AuthViewModel_HiltModules_KeyModule_Provide_LazyMapKey;
import com.fomo.chat.ui.calls.CallViewModel;
import com.fomo.chat.ui.calls.CallViewModel_HiltModules;
import com.fomo.chat.ui.calls.CallViewModel_HiltModules_BindsModule_Binds_LazyMapKey;
import com.fomo.chat.ui.calls.CallViewModel_HiltModules_KeyModule_Provide_LazyMapKey;
import com.fomo.chat.ui.chats.ChatListViewModel;
import com.fomo.chat.ui.chats.ChatListViewModel_HiltModules;
import com.fomo.chat.ui.chats.ChatListViewModel_HiltModules_BindsModule_Binds_LazyMapKey;
import com.fomo.chat.ui.chats.ChatListViewModel_HiltModules_KeyModule_Provide_LazyMapKey;
import com.fomo.chat.ui.chats.ChatRoomViewModel;
import com.fomo.chat.ui.chats.ChatRoomViewModel_HiltModules;
import com.fomo.chat.ui.chats.ChatRoomViewModel_HiltModules_BindsModule_Binds_LazyMapKey;
import com.fomo.chat.ui.chats.ChatRoomViewModel_HiltModules_KeyModule_Provide_LazyMapKey;
import com.fomo.chat.ui.contacts.ContactsViewModel;
import com.fomo.chat.ui.contacts.ContactsViewModel_HiltModules;
import com.fomo.chat.ui.contacts.ContactsViewModel_HiltModules_BindsModule_Binds_LazyMapKey;
import com.fomo.chat.ui.contacts.ContactsViewModel_HiltModules_KeyModule_Provide_LazyMapKey;
import com.fomo.chat.ui.settings.SettingsViewModel;
import com.fomo.chat.ui.settings.SettingsViewModel_HiltModules;
import com.fomo.chat.ui.settings.SettingsViewModel_HiltModules_BindsModule_Binds_LazyMapKey;
import com.fomo.chat.ui.settings.SettingsViewModel_HiltModules_KeyModule_Provide_LazyMapKey;
import com.google.errorprone.annotations.CanIgnoreReturnValue;
import com.google.gson.Gson;
import dagger.hilt.android.ActivityRetainedLifecycle;
import dagger.hilt.android.ViewModelLifecycle;
import dagger.hilt.android.internal.builders.ActivityComponentBuilder;
import dagger.hilt.android.internal.builders.ActivityRetainedComponentBuilder;
import dagger.hilt.android.internal.builders.FragmentComponentBuilder;
import dagger.hilt.android.internal.builders.ServiceComponentBuilder;
import dagger.hilt.android.internal.builders.ViewComponentBuilder;
import dagger.hilt.android.internal.builders.ViewModelComponentBuilder;
import dagger.hilt.android.internal.builders.ViewWithFragmentComponentBuilder;
import dagger.hilt.android.internal.lifecycle.DefaultViewModelFactories;
import dagger.hilt.android.internal.lifecycle.DefaultViewModelFactories_InternalFactoryFactory_Factory;
import dagger.hilt.android.internal.managers.ActivityRetainedComponentManager_LifecycleModule_ProvideActivityRetainedLifecycleFactory;
import dagger.hilt.android.internal.managers.SavedStateHandleHolder;
import dagger.hilt.android.internal.modules.ApplicationContextModule;
import dagger.hilt.android.internal.modules.ApplicationContextModule_ProvideContextFactory;
import dagger.internal.DaggerGenerated;
import dagger.internal.DoubleCheck;
import dagger.internal.LazyClassKeyMap;
import dagger.internal.MapBuilder;
import dagger.internal.Preconditions;
import dagger.internal.Provider;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import javax.annotation.processing.Generated;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;

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
public final class DaggerFomoApp_HiltComponents_SingletonC {
  private DaggerFomoApp_HiltComponents_SingletonC() {
  }

  public static Builder builder() {
    return new Builder();
  }

  public static final class Builder {
    private ApplicationContextModule applicationContextModule;

    private Builder() {
    }

    public Builder applicationContextModule(ApplicationContextModule applicationContextModule) {
      this.applicationContextModule = Preconditions.checkNotNull(applicationContextModule);
      return this;
    }

    public FomoApp_HiltComponents.SingletonC build() {
      Preconditions.checkBuilderRequirement(applicationContextModule, ApplicationContextModule.class);
      return new SingletonCImpl(applicationContextModule);
    }
  }

  private static final class ActivityRetainedCBuilder implements FomoApp_HiltComponents.ActivityRetainedC.Builder {
    private final SingletonCImpl singletonCImpl;

    private SavedStateHandleHolder savedStateHandleHolder;

    private ActivityRetainedCBuilder(SingletonCImpl singletonCImpl) {
      this.singletonCImpl = singletonCImpl;
    }

    @Override
    public ActivityRetainedCBuilder savedStateHandleHolder(
        SavedStateHandleHolder savedStateHandleHolder) {
      this.savedStateHandleHolder = Preconditions.checkNotNull(savedStateHandleHolder);
      return this;
    }

    @Override
    public FomoApp_HiltComponents.ActivityRetainedC build() {
      Preconditions.checkBuilderRequirement(savedStateHandleHolder, SavedStateHandleHolder.class);
      return new ActivityRetainedCImpl(singletonCImpl, savedStateHandleHolder);
    }
  }

  private static final class ActivityCBuilder implements FomoApp_HiltComponents.ActivityC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private Activity activity;

    private ActivityCBuilder(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
    }

    @Override
    public ActivityCBuilder activity(Activity activity) {
      this.activity = Preconditions.checkNotNull(activity);
      return this;
    }

    @Override
    public FomoApp_HiltComponents.ActivityC build() {
      Preconditions.checkBuilderRequirement(activity, Activity.class);
      return new ActivityCImpl(singletonCImpl, activityRetainedCImpl, activity);
    }
  }

  private static final class FragmentCBuilder implements FomoApp_HiltComponents.FragmentC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private Fragment fragment;

    private FragmentCBuilder(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, ActivityCImpl activityCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;
    }

    @Override
    public FragmentCBuilder fragment(Fragment fragment) {
      this.fragment = Preconditions.checkNotNull(fragment);
      return this;
    }

    @Override
    public FomoApp_HiltComponents.FragmentC build() {
      Preconditions.checkBuilderRequirement(fragment, Fragment.class);
      return new FragmentCImpl(singletonCImpl, activityRetainedCImpl, activityCImpl, fragment);
    }
  }

  private static final class ViewWithFragmentCBuilder implements FomoApp_HiltComponents.ViewWithFragmentC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private final FragmentCImpl fragmentCImpl;

    private View view;

    private ViewWithFragmentCBuilder(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, ActivityCImpl activityCImpl,
        FragmentCImpl fragmentCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;
      this.fragmentCImpl = fragmentCImpl;
    }

    @Override
    public ViewWithFragmentCBuilder view(View view) {
      this.view = Preconditions.checkNotNull(view);
      return this;
    }

    @Override
    public FomoApp_HiltComponents.ViewWithFragmentC build() {
      Preconditions.checkBuilderRequirement(view, View.class);
      return new ViewWithFragmentCImpl(singletonCImpl, activityRetainedCImpl, activityCImpl, fragmentCImpl, view);
    }
  }

  private static final class ViewCBuilder implements FomoApp_HiltComponents.ViewC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private View view;

    private ViewCBuilder(SingletonCImpl singletonCImpl, ActivityRetainedCImpl activityRetainedCImpl,
        ActivityCImpl activityCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;
    }

    @Override
    public ViewCBuilder view(View view) {
      this.view = Preconditions.checkNotNull(view);
      return this;
    }

    @Override
    public FomoApp_HiltComponents.ViewC build() {
      Preconditions.checkBuilderRequirement(view, View.class);
      return new ViewCImpl(singletonCImpl, activityRetainedCImpl, activityCImpl, view);
    }
  }

  private static final class ViewModelCBuilder implements FomoApp_HiltComponents.ViewModelC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private SavedStateHandle savedStateHandle;

    private ViewModelLifecycle viewModelLifecycle;

    private ViewModelCBuilder(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
    }

    @Override
    public ViewModelCBuilder savedStateHandle(SavedStateHandle handle) {
      this.savedStateHandle = Preconditions.checkNotNull(handle);
      return this;
    }

    @Override
    public ViewModelCBuilder viewModelLifecycle(ViewModelLifecycle viewModelLifecycle) {
      this.viewModelLifecycle = Preconditions.checkNotNull(viewModelLifecycle);
      return this;
    }

    @Override
    public FomoApp_HiltComponents.ViewModelC build() {
      Preconditions.checkBuilderRequirement(savedStateHandle, SavedStateHandle.class);
      Preconditions.checkBuilderRequirement(viewModelLifecycle, ViewModelLifecycle.class);
      return new ViewModelCImpl(singletonCImpl, activityRetainedCImpl, savedStateHandle, viewModelLifecycle);
    }
  }

  private static final class ServiceCBuilder implements FomoApp_HiltComponents.ServiceC.Builder {
    private final SingletonCImpl singletonCImpl;

    private Service service;

    private ServiceCBuilder(SingletonCImpl singletonCImpl) {
      this.singletonCImpl = singletonCImpl;
    }

    @Override
    public ServiceCBuilder service(Service service) {
      this.service = Preconditions.checkNotNull(service);
      return this;
    }

    @Override
    public FomoApp_HiltComponents.ServiceC build() {
      Preconditions.checkBuilderRequirement(service, Service.class);
      return new ServiceCImpl(singletonCImpl, service);
    }
  }

  private static final class ViewWithFragmentCImpl extends FomoApp_HiltComponents.ViewWithFragmentC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private final FragmentCImpl fragmentCImpl;

    private final ViewWithFragmentCImpl viewWithFragmentCImpl = this;

    private ViewWithFragmentCImpl(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, ActivityCImpl activityCImpl,
        FragmentCImpl fragmentCImpl, View viewParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;
      this.fragmentCImpl = fragmentCImpl;


    }
  }

  private static final class FragmentCImpl extends FomoApp_HiltComponents.FragmentC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private final FragmentCImpl fragmentCImpl = this;

    private FragmentCImpl(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, ActivityCImpl activityCImpl,
        Fragment fragmentParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;


    }

    @Override
    public DefaultViewModelFactories.InternalFactoryFactory getHiltInternalFactoryFactory() {
      return activityCImpl.getHiltInternalFactoryFactory();
    }

    @Override
    public ViewWithFragmentComponentBuilder viewWithFragmentComponentBuilder() {
      return new ViewWithFragmentCBuilder(singletonCImpl, activityRetainedCImpl, activityCImpl, fragmentCImpl);
    }
  }

  private static final class ViewCImpl extends FomoApp_HiltComponents.ViewC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private final ViewCImpl viewCImpl = this;

    private ViewCImpl(SingletonCImpl singletonCImpl, ActivityRetainedCImpl activityRetainedCImpl,
        ActivityCImpl activityCImpl, View viewParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;


    }
  }

  private static final class ActivityCImpl extends FomoApp_HiltComponents.ActivityC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl = this;

    private ActivityCImpl(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, Activity activityParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;


    }

    @Override
    public void injectMainActivity(MainActivity mainActivity) {
    }

    @Override
    public DefaultViewModelFactories.InternalFactoryFactory getHiltInternalFactoryFactory() {
      return DefaultViewModelFactories_InternalFactoryFactory_Factory.newInstance(getViewModelKeys(), new ViewModelCBuilder(singletonCImpl, activityRetainedCImpl));
    }

    @Override
    public Map<Class<?>, Boolean> getViewModelKeys() {
      return LazyClassKeyMap.<Boolean>of(MapBuilder.<String, Boolean>newMapBuilder(7).put(AuthViewModel_HiltModules_KeyModule_Provide_LazyMapKey.lazyClassKeyName, AuthViewModel_HiltModules.KeyModule.provide()).put(CallViewModel_HiltModules_KeyModule_Provide_LazyMapKey.lazyClassKeyName, CallViewModel_HiltModules.KeyModule.provide()).put(ChatListViewModel_HiltModules_KeyModule_Provide_LazyMapKey.lazyClassKeyName, ChatListViewModel_HiltModules.KeyModule.provide()).put(ChatRoomViewModel_HiltModules_KeyModule_Provide_LazyMapKey.lazyClassKeyName, ChatRoomViewModel_HiltModules.KeyModule.provide()).put(ContactsViewModel_HiltModules_KeyModule_Provide_LazyMapKey.lazyClassKeyName, ContactsViewModel_HiltModules.KeyModule.provide()).put(MainViewModel_HiltModules_KeyModule_Provide_LazyMapKey.lazyClassKeyName, MainViewModel_HiltModules.KeyModule.provide()).put(SettingsViewModel_HiltModules_KeyModule_Provide_LazyMapKey.lazyClassKeyName, SettingsViewModel_HiltModules.KeyModule.provide()).build());
    }

    @Override
    public ViewModelComponentBuilder getViewModelComponentBuilder() {
      return new ViewModelCBuilder(singletonCImpl, activityRetainedCImpl);
    }

    @Override
    public FragmentComponentBuilder fragmentComponentBuilder() {
      return new FragmentCBuilder(singletonCImpl, activityRetainedCImpl, activityCImpl);
    }

    @Override
    public ViewComponentBuilder viewComponentBuilder() {
      return new ViewCBuilder(singletonCImpl, activityRetainedCImpl, activityCImpl);
    }
  }

  private static final class ViewModelCImpl extends FomoApp_HiltComponents.ViewModelC {
    private final SavedStateHandle savedStateHandle;

    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ViewModelCImpl viewModelCImpl = this;

    private Provider<AuthViewModel> authViewModelProvider;

    private Provider<CallViewModel> callViewModelProvider;

    private Provider<ChatListViewModel> chatListViewModelProvider;

    private Provider<ChatRoomViewModel> chatRoomViewModelProvider;

    private Provider<ContactsViewModel> contactsViewModelProvider;

    private Provider<MainViewModel> mainViewModelProvider;

    private Provider<SettingsViewModel> settingsViewModelProvider;

    private ViewModelCImpl(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, SavedStateHandle savedStateHandleParam,
        ViewModelLifecycle viewModelLifecycleParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.savedStateHandle = savedStateHandleParam;
      initialize(savedStateHandleParam, viewModelLifecycleParam);

    }

    @SuppressWarnings("unchecked")
    private void initialize(final SavedStateHandle savedStateHandleParam,
        final ViewModelLifecycle viewModelLifecycleParam) {
      this.authViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 0);
      this.callViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 1);
      this.chatListViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 2);
      this.chatRoomViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 3);
      this.contactsViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 4);
      this.mainViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 5);
      this.settingsViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 6);
    }

    @Override
    public Map<Class<?>, javax.inject.Provider<ViewModel>> getHiltViewModelMap() {
      return LazyClassKeyMap.<javax.inject.Provider<ViewModel>>of(MapBuilder.<String, javax.inject.Provider<ViewModel>>newMapBuilder(7).put(AuthViewModel_HiltModules_BindsModule_Binds_LazyMapKey.lazyClassKeyName, ((Provider) authViewModelProvider)).put(CallViewModel_HiltModules_BindsModule_Binds_LazyMapKey.lazyClassKeyName, ((Provider) callViewModelProvider)).put(ChatListViewModel_HiltModules_BindsModule_Binds_LazyMapKey.lazyClassKeyName, ((Provider) chatListViewModelProvider)).put(ChatRoomViewModel_HiltModules_BindsModule_Binds_LazyMapKey.lazyClassKeyName, ((Provider) chatRoomViewModelProvider)).put(ContactsViewModel_HiltModules_BindsModule_Binds_LazyMapKey.lazyClassKeyName, ((Provider) contactsViewModelProvider)).put(MainViewModel_HiltModules_BindsModule_Binds_LazyMapKey.lazyClassKeyName, ((Provider) mainViewModelProvider)).put(SettingsViewModel_HiltModules_BindsModule_Binds_LazyMapKey.lazyClassKeyName, ((Provider) settingsViewModelProvider)).build());
    }

    @Override
    public Map<Class<?>, Object> getHiltViewModelAssistedMap() {
      return Collections.<Class<?>, Object>emptyMap();
    }

    private static final class SwitchingProvider<T> implements Provider<T> {
      private final SingletonCImpl singletonCImpl;

      private final ActivityRetainedCImpl activityRetainedCImpl;

      private final ViewModelCImpl viewModelCImpl;

      private final int id;

      SwitchingProvider(SingletonCImpl singletonCImpl, ActivityRetainedCImpl activityRetainedCImpl,
          ViewModelCImpl viewModelCImpl, int id) {
        this.singletonCImpl = singletonCImpl;
        this.activityRetainedCImpl = activityRetainedCImpl;
        this.viewModelCImpl = viewModelCImpl;
        this.id = id;
      }

      @SuppressWarnings("unchecked")
      @Override
      public T get() {
        switch (id) {
          case 0: // com.fomo.chat.ui.auth.AuthViewModel 
          return (T) new AuthViewModel(singletonCImpl.provideAuthRepositoryProvider.get());

          case 1: // com.fomo.chat.ui.calls.CallViewModel 
          return (T) new CallViewModel(viewModelCImpl.savedStateHandle);

          case 2: // com.fomo.chat.ui.chats.ChatListViewModel 
          return (T) new ChatListViewModel(singletonCImpl.provideChatRepositoryProvider.get());

          case 3: // com.fomo.chat.ui.chats.ChatRoomViewModel 
          return (T) new ChatRoomViewModel(viewModelCImpl.savedStateHandle, singletonCImpl.provideChatRepositoryProvider.get(), singletonCImpl.provideTokenManagerProvider.get());

          case 4: // com.fomo.chat.ui.contacts.ContactsViewModel 
          return (T) new ContactsViewModel(singletonCImpl.provideContactRepositoryProvider.get());

          case 5: // com.fomo.chat.MainViewModel 
          return (T) new MainViewModel(singletonCImpl.provideTokenManagerProvider.get());

          case 6: // com.fomo.chat.ui.settings.SettingsViewModel 
          return (T) new SettingsViewModel(singletonCImpl.provideUsersApiProvider.get());

          default: throw new AssertionError(id);
        }
      }
    }
  }

  private static final class ActivityRetainedCImpl extends FomoApp_HiltComponents.ActivityRetainedC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl = this;

    private Provider<ActivityRetainedLifecycle> provideActivityRetainedLifecycleProvider;

    private ActivityRetainedCImpl(SingletonCImpl singletonCImpl,
        SavedStateHandleHolder savedStateHandleHolderParam) {
      this.singletonCImpl = singletonCImpl;

      initialize(savedStateHandleHolderParam);

    }

    @SuppressWarnings("unchecked")
    private void initialize(final SavedStateHandleHolder savedStateHandleHolderParam) {
      this.provideActivityRetainedLifecycleProvider = DoubleCheck.provider(new SwitchingProvider<ActivityRetainedLifecycle>(singletonCImpl, activityRetainedCImpl, 0));
    }

    @Override
    public ActivityComponentBuilder activityComponentBuilder() {
      return new ActivityCBuilder(singletonCImpl, activityRetainedCImpl);
    }

    @Override
    public ActivityRetainedLifecycle getActivityRetainedLifecycle() {
      return provideActivityRetainedLifecycleProvider.get();
    }

    private static final class SwitchingProvider<T> implements Provider<T> {
      private final SingletonCImpl singletonCImpl;

      private final ActivityRetainedCImpl activityRetainedCImpl;

      private final int id;

      SwitchingProvider(SingletonCImpl singletonCImpl, ActivityRetainedCImpl activityRetainedCImpl,
          int id) {
        this.singletonCImpl = singletonCImpl;
        this.activityRetainedCImpl = activityRetainedCImpl;
        this.id = id;
      }

      @SuppressWarnings("unchecked")
      @Override
      public T get() {
        switch (id) {
          case 0: // dagger.hilt.android.ActivityRetainedLifecycle 
          return (T) ActivityRetainedComponentManager_LifecycleModule_ProvideActivityRetainedLifecycleFactory.provideActivityRetainedLifecycle();

          default: throw new AssertionError(id);
        }
      }
    }
  }

  private static final class ServiceCImpl extends FomoApp_HiltComponents.ServiceC {
    private final SingletonCImpl singletonCImpl;

    private final ServiceCImpl serviceCImpl = this;

    private ServiceCImpl(SingletonCImpl singletonCImpl, Service serviceParam) {
      this.singletonCImpl = singletonCImpl;


    }

    @Override
    public void injectCallService(CallService callService) {
    }

    @Override
    public void injectFcmService(FcmService fcmService) {
      injectFcmService2(fcmService);
    }

    @Override
    public void injectWebSocketService(WebSocketService webSocketService) {
      injectWebSocketService2(webSocketService);
    }

    @CanIgnoreReturnValue
    private FcmService injectFcmService2(FcmService instance) {
      FcmService_MembersInjector.injectUsersApi(instance, singletonCImpl.provideUsersApiProvider.get());
      FcmService_MembersInjector.injectTokenManager(instance, singletonCImpl.provideTokenManagerProvider.get());
      return instance;
    }

    @CanIgnoreReturnValue
    private WebSocketService injectWebSocketService2(WebSocketService instance2) {
      WebSocketService_MembersInjector.injectWebSocketClient(instance2, singletonCImpl.provideWebSocketClientProvider.get());
      return instance2;
    }
  }

  private static final class SingletonCImpl extends FomoApp_HiltComponents.SingletonC {
    private final ApplicationContextModule applicationContextModule;

    private final SingletonCImpl singletonCImpl = this;

    private Provider<TokenManager> provideTokenManagerProvider;

    private Provider<Interceptor> provideAuthInterceptorProvider;

    private Provider<HttpLoggingInterceptor> provideLoggingInterceptorProvider;

    private Provider<OkHttpClient> provideOkHttpClientProvider;

    private Provider<Gson> provideGsonProvider;

    private Provider<Retrofit> provideRetrofitProvider;

    private Provider<AuthApi> provideAuthApiProvider;

    private Provider<AuthRepository> provideAuthRepositoryProvider;

    private Provider<ConversationsApi> provideConversationsApiProvider;

    private Provider<MessagesApi> provideMessagesApiProvider;

    private Provider<UploadApi> provideUploadApiProvider;

    private Provider<FomoDatabase> provideDatabaseProvider;

    private Provider<ConversationDao> provideConversationDaoProvider;

    private Provider<MessageDao> provideMessageDaoProvider;

    private Provider<ChatRepository> provideChatRepositoryProvider;

    private Provider<ContactsApi> provideContactsApiProvider;

    private Provider<ContactDao> provideContactDaoProvider;

    private Provider<ContactRepository> provideContactRepositoryProvider;

    private Provider<UsersApi> provideUsersApiProvider;

    private Provider<WebSocketClient> provideWebSocketClientProvider;

    private SingletonCImpl(ApplicationContextModule applicationContextModuleParam) {
      this.applicationContextModule = applicationContextModuleParam;
      initialize(applicationContextModuleParam);

    }

    @SuppressWarnings("unchecked")
    private void initialize(final ApplicationContextModule applicationContextModuleParam) {
      this.provideTokenManagerProvider = DoubleCheck.provider(new SwitchingProvider<TokenManager>(singletonCImpl, 0));
      this.provideAuthInterceptorProvider = DoubleCheck.provider(new SwitchingProvider<Interceptor>(singletonCImpl, 5));
      this.provideLoggingInterceptorProvider = DoubleCheck.provider(new SwitchingProvider<HttpLoggingInterceptor>(singletonCImpl, 6));
      this.provideOkHttpClientProvider = DoubleCheck.provider(new SwitchingProvider<OkHttpClient>(singletonCImpl, 4));
      this.provideGsonProvider = DoubleCheck.provider(new SwitchingProvider<Gson>(singletonCImpl, 7));
      this.provideRetrofitProvider = DoubleCheck.provider(new SwitchingProvider<Retrofit>(singletonCImpl, 3));
      this.provideAuthApiProvider = DoubleCheck.provider(new SwitchingProvider<AuthApi>(singletonCImpl, 2));
      this.provideAuthRepositoryProvider = DoubleCheck.provider(new SwitchingProvider<AuthRepository>(singletonCImpl, 1));
      this.provideConversationsApiProvider = DoubleCheck.provider(new SwitchingProvider<ConversationsApi>(singletonCImpl, 9));
      this.provideMessagesApiProvider = DoubleCheck.provider(new SwitchingProvider<MessagesApi>(singletonCImpl, 10));
      this.provideUploadApiProvider = DoubleCheck.provider(new SwitchingProvider<UploadApi>(singletonCImpl, 11));
      this.provideDatabaseProvider = DoubleCheck.provider(new SwitchingProvider<FomoDatabase>(singletonCImpl, 13));
      this.provideConversationDaoProvider = DoubleCheck.provider(new SwitchingProvider<ConversationDao>(singletonCImpl, 12));
      this.provideMessageDaoProvider = DoubleCheck.provider(new SwitchingProvider<MessageDao>(singletonCImpl, 14));
      this.provideChatRepositoryProvider = DoubleCheck.provider(new SwitchingProvider<ChatRepository>(singletonCImpl, 8));
      this.provideContactsApiProvider = DoubleCheck.provider(new SwitchingProvider<ContactsApi>(singletonCImpl, 16));
      this.provideContactDaoProvider = DoubleCheck.provider(new SwitchingProvider<ContactDao>(singletonCImpl, 17));
      this.provideContactRepositoryProvider = DoubleCheck.provider(new SwitchingProvider<ContactRepository>(singletonCImpl, 15));
      this.provideUsersApiProvider = DoubleCheck.provider(new SwitchingProvider<UsersApi>(singletonCImpl, 18));
      this.provideWebSocketClientProvider = DoubleCheck.provider(new SwitchingProvider<WebSocketClient>(singletonCImpl, 19));
    }

    @Override
    public void injectFomoApp(FomoApp fomoApp) {
      injectFomoApp2(fomoApp);
    }

    @Override
    public Set<Boolean> getDisableFragmentGetContextFix() {
      return Collections.<Boolean>emptySet();
    }

    @Override
    public ActivityRetainedComponentBuilder retainedComponentBuilder() {
      return new ActivityRetainedCBuilder(singletonCImpl);
    }

    @Override
    public ServiceComponentBuilder serviceComponentBuilder() {
      return new ServiceCBuilder(singletonCImpl);
    }

    @CanIgnoreReturnValue
    private FomoApp injectFomoApp2(FomoApp instance) {
      FomoApp_MembersInjector.injectTokenManager(instance, provideTokenManagerProvider.get());
      return instance;
    }

    private static final class SwitchingProvider<T> implements Provider<T> {
      private final SingletonCImpl singletonCImpl;

      private final int id;

      SwitchingProvider(SingletonCImpl singletonCImpl, int id) {
        this.singletonCImpl = singletonCImpl;
        this.id = id;
      }

      @SuppressWarnings("unchecked")
      @Override
      public T get() {
        switch (id) {
          case 0: // com.fomo.chat.data.local.crypto.TokenManager 
          return (T) AppModule_ProvideTokenManagerFactory.provideTokenManager(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 1: // com.fomo.chat.data.repository.AuthRepository 
          return (T) AppModule_ProvideAuthRepositoryFactory.provideAuthRepository(singletonCImpl.provideAuthApiProvider.get(), singletonCImpl.provideTokenManagerProvider.get());

          case 2: // com.fomo.chat.data.remote.api.AuthApi 
          return (T) NetworkModule_ProvideAuthApiFactory.provideAuthApi(singletonCImpl.provideRetrofitProvider.get());

          case 3: // retrofit2.Retrofit 
          return (T) NetworkModule_ProvideRetrofitFactory.provideRetrofit(singletonCImpl.provideOkHttpClientProvider.get(), singletonCImpl.provideGsonProvider.get());

          case 4: // okhttp3.OkHttpClient 
          return (T) NetworkModule_ProvideOkHttpClientFactory.provideOkHttpClient(singletonCImpl.provideAuthInterceptorProvider.get(), singletonCImpl.provideLoggingInterceptorProvider.get());

          case 5: // okhttp3.Interceptor 
          return (T) NetworkModule_ProvideAuthInterceptorFactory.provideAuthInterceptor(singletonCImpl.provideTokenManagerProvider.get());

          case 6: // okhttp3.logging.HttpLoggingInterceptor 
          return (T) NetworkModule_ProvideLoggingInterceptorFactory.provideLoggingInterceptor();

          case 7: // com.google.gson.Gson 
          return (T) NetworkModule_ProvideGsonFactory.provideGson();

          case 8: // com.fomo.chat.data.repository.ChatRepository 
          return (T) AppModule_ProvideChatRepositoryFactory.provideChatRepository(singletonCImpl.provideConversationsApiProvider.get(), singletonCImpl.provideMessagesApiProvider.get(), singletonCImpl.provideUploadApiProvider.get(), singletonCImpl.provideConversationDaoProvider.get(), singletonCImpl.provideMessageDaoProvider.get(), singletonCImpl.provideGsonProvider.get(), singletonCImpl.provideTokenManagerProvider.get());

          case 9: // com.fomo.chat.data.remote.api.ConversationsApi 
          return (T) NetworkModule_ProvideConversationsApiFactory.provideConversationsApi(singletonCImpl.provideRetrofitProvider.get());

          case 10: // com.fomo.chat.data.remote.api.MessagesApi 
          return (T) NetworkModule_ProvideMessagesApiFactory.provideMessagesApi(singletonCImpl.provideRetrofitProvider.get());

          case 11: // com.fomo.chat.data.remote.api.UploadApi 
          return (T) NetworkModule_ProvideUploadApiFactory.provideUploadApi(singletonCImpl.provideRetrofitProvider.get());

          case 12: // com.fomo.chat.data.local.db.dao.ConversationDao 
          return (T) DatabaseModule_ProvideConversationDaoFactory.provideConversationDao(singletonCImpl.provideDatabaseProvider.get());

          case 13: // com.fomo.chat.data.local.db.FomoDatabase 
          return (T) DatabaseModule_ProvideDatabaseFactory.provideDatabase(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 14: // com.fomo.chat.data.local.db.dao.MessageDao 
          return (T) DatabaseModule_ProvideMessageDaoFactory.provideMessageDao(singletonCImpl.provideDatabaseProvider.get());

          case 15: // com.fomo.chat.data.repository.ContactRepository 
          return (T) AppModule_ProvideContactRepositoryFactory.provideContactRepository(singletonCImpl.provideContactsApiProvider.get(), singletonCImpl.provideContactDaoProvider.get());

          case 16: // com.fomo.chat.data.remote.api.ContactsApi 
          return (T) NetworkModule_ProvideContactsApiFactory.provideContactsApi(singletonCImpl.provideRetrofitProvider.get());

          case 17: // com.fomo.chat.data.local.db.dao.ContactDao 
          return (T) DatabaseModule_ProvideContactDaoFactory.provideContactDao(singletonCImpl.provideDatabaseProvider.get());

          case 18: // com.fomo.chat.data.remote.api.UsersApi 
          return (T) NetworkModule_ProvideUsersApiFactory.provideUsersApi(singletonCImpl.provideRetrofitProvider.get());

          case 19: // com.fomo.chat.data.remote.WebSocketClient 
          return (T) AppModule_ProvideWebSocketClientFactory.provideWebSocketClient(singletonCImpl.provideOkHttpClientProvider.get(), singletonCImpl.provideTokenManagerProvider.get(), singletonCImpl.provideGsonProvider.get());

          default: throw new AssertionError(id);
        }
      }
    }
  }
}
