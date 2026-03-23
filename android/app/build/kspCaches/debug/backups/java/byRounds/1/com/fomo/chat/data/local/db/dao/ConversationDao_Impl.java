package com.fomo.chat.data.local.db.dao;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import com.fomo.chat.data.local.db.entity.ConversationEntity;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import kotlinx.coroutines.flow.Flow;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class ConversationDao_Impl implements ConversationDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<ConversationEntity> __insertionAdapterOfConversationEntity;

  private final SharedSQLiteStatement __preparedStmtOfDeleteById;

  private final SharedSQLiteStatement __preparedStmtOfDeleteAll;

  private final SharedSQLiteStatement __preparedStmtOfMarkRead;

  public ConversationDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfConversationEntity = new EntityInsertionAdapter<ConversationEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `conversations` (`id`,`type`,`name`,`avatarUrl`,`lastMessageId`,`lastMessageText`,`lastMessageSenderId`,`lastMessageCreatedAt`,`unreadCount`,`muted`,`archived`,`createdAt`,`updatedAt`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final ConversationEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getType());
        if (entity.getName() == null) {
          statement.bindNull(3);
        } else {
          statement.bindString(3, entity.getName());
        }
        if (entity.getAvatarUrl() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getAvatarUrl());
        }
        if (entity.getLastMessageId() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getLastMessageId());
        }
        if (entity.getLastMessageText() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getLastMessageText());
        }
        if (entity.getLastMessageSenderId() == null) {
          statement.bindNull(7);
        } else {
          statement.bindString(7, entity.getLastMessageSenderId());
        }
        if (entity.getLastMessageCreatedAt() == null) {
          statement.bindNull(8);
        } else {
          statement.bindString(8, entity.getLastMessageCreatedAt());
        }
        statement.bindLong(9, entity.getUnreadCount());
        final int _tmp = entity.getMuted() ? 1 : 0;
        statement.bindLong(10, _tmp);
        final int _tmp_1 = entity.getArchived() ? 1 : 0;
        statement.bindLong(11, _tmp_1);
        if (entity.getCreatedAt() == null) {
          statement.bindNull(12);
        } else {
          statement.bindString(12, entity.getCreatedAt());
        }
        if (entity.getUpdatedAt() == null) {
          statement.bindNull(13);
        } else {
          statement.bindString(13, entity.getUpdatedAt());
        }
      }
    };
    this.__preparedStmtOfDeleteById = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM conversations WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfDeleteAll = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM conversations";
        return _query;
      }
    };
    this.__preparedStmtOfMarkRead = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE conversations SET unreadCount = 0 WHERE id = ?";
        return _query;
      }
    };
  }

  @Override
  public Object upsert(final ConversationEntity conversation,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfConversationEntity.insert(conversation);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object upsertAll(final List<ConversationEntity> conversations,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfConversationEntity.insert(conversations);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object deleteById(final String id, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfDeleteById.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, id);
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfDeleteById.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object deleteAll(final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfDeleteAll.acquire();
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfDeleteAll.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object markRead(final String conversationId,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfMarkRead.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, conversationId);
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfMarkRead.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<ConversationEntity>> observeAll() {
    final String _sql = "SELECT * FROM conversations WHERE archived = 0 ORDER BY updatedAt DESC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"conversations"}, new Callable<List<ConversationEntity>>() {
      @Override
      @NonNull
      public List<ConversationEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfType = CursorUtil.getColumnIndexOrThrow(_cursor, "type");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfAvatarUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "avatarUrl");
          final int _cursorIndexOfLastMessageId = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageId");
          final int _cursorIndexOfLastMessageText = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageText");
          final int _cursorIndexOfLastMessageSenderId = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageSenderId");
          final int _cursorIndexOfLastMessageCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageCreatedAt");
          final int _cursorIndexOfUnreadCount = CursorUtil.getColumnIndexOrThrow(_cursor, "unreadCount");
          final int _cursorIndexOfMuted = CursorUtil.getColumnIndexOrThrow(_cursor, "muted");
          final int _cursorIndexOfArchived = CursorUtil.getColumnIndexOrThrow(_cursor, "archived");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final List<ConversationEntity> _result = new ArrayList<ConversationEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final ConversationEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpType;
            _tmpType = _cursor.getString(_cursorIndexOfType);
            final String _tmpName;
            if (_cursor.isNull(_cursorIndexOfName)) {
              _tmpName = null;
            } else {
              _tmpName = _cursor.getString(_cursorIndexOfName);
            }
            final String _tmpAvatarUrl;
            if (_cursor.isNull(_cursorIndexOfAvatarUrl)) {
              _tmpAvatarUrl = null;
            } else {
              _tmpAvatarUrl = _cursor.getString(_cursorIndexOfAvatarUrl);
            }
            final String _tmpLastMessageId;
            if (_cursor.isNull(_cursorIndexOfLastMessageId)) {
              _tmpLastMessageId = null;
            } else {
              _tmpLastMessageId = _cursor.getString(_cursorIndexOfLastMessageId);
            }
            final String _tmpLastMessageText;
            if (_cursor.isNull(_cursorIndexOfLastMessageText)) {
              _tmpLastMessageText = null;
            } else {
              _tmpLastMessageText = _cursor.getString(_cursorIndexOfLastMessageText);
            }
            final String _tmpLastMessageSenderId;
            if (_cursor.isNull(_cursorIndexOfLastMessageSenderId)) {
              _tmpLastMessageSenderId = null;
            } else {
              _tmpLastMessageSenderId = _cursor.getString(_cursorIndexOfLastMessageSenderId);
            }
            final String _tmpLastMessageCreatedAt;
            if (_cursor.isNull(_cursorIndexOfLastMessageCreatedAt)) {
              _tmpLastMessageCreatedAt = null;
            } else {
              _tmpLastMessageCreatedAt = _cursor.getString(_cursorIndexOfLastMessageCreatedAt);
            }
            final int _tmpUnreadCount;
            _tmpUnreadCount = _cursor.getInt(_cursorIndexOfUnreadCount);
            final boolean _tmpMuted;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfMuted);
            _tmpMuted = _tmp != 0;
            final boolean _tmpArchived;
            final int _tmp_1;
            _tmp_1 = _cursor.getInt(_cursorIndexOfArchived);
            _tmpArchived = _tmp_1 != 0;
            final String _tmpCreatedAt;
            if (_cursor.isNull(_cursorIndexOfCreatedAt)) {
              _tmpCreatedAt = null;
            } else {
              _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            }
            final String _tmpUpdatedAt;
            if (_cursor.isNull(_cursorIndexOfUpdatedAt)) {
              _tmpUpdatedAt = null;
            } else {
              _tmpUpdatedAt = _cursor.getString(_cursorIndexOfUpdatedAt);
            }
            _item = new ConversationEntity(_tmpId,_tmpType,_tmpName,_tmpAvatarUrl,_tmpLastMessageId,_tmpLastMessageText,_tmpLastMessageSenderId,_tmpLastMessageCreatedAt,_tmpUnreadCount,_tmpMuted,_tmpArchived,_tmpCreatedAt,_tmpUpdatedAt);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Flow<List<ConversationEntity>> observeArchived() {
    final String _sql = "SELECT * FROM conversations WHERE archived = 1 ORDER BY updatedAt DESC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"conversations"}, new Callable<List<ConversationEntity>>() {
      @Override
      @NonNull
      public List<ConversationEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfType = CursorUtil.getColumnIndexOrThrow(_cursor, "type");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfAvatarUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "avatarUrl");
          final int _cursorIndexOfLastMessageId = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageId");
          final int _cursorIndexOfLastMessageText = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageText");
          final int _cursorIndexOfLastMessageSenderId = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageSenderId");
          final int _cursorIndexOfLastMessageCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageCreatedAt");
          final int _cursorIndexOfUnreadCount = CursorUtil.getColumnIndexOrThrow(_cursor, "unreadCount");
          final int _cursorIndexOfMuted = CursorUtil.getColumnIndexOrThrow(_cursor, "muted");
          final int _cursorIndexOfArchived = CursorUtil.getColumnIndexOrThrow(_cursor, "archived");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final List<ConversationEntity> _result = new ArrayList<ConversationEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final ConversationEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpType;
            _tmpType = _cursor.getString(_cursorIndexOfType);
            final String _tmpName;
            if (_cursor.isNull(_cursorIndexOfName)) {
              _tmpName = null;
            } else {
              _tmpName = _cursor.getString(_cursorIndexOfName);
            }
            final String _tmpAvatarUrl;
            if (_cursor.isNull(_cursorIndexOfAvatarUrl)) {
              _tmpAvatarUrl = null;
            } else {
              _tmpAvatarUrl = _cursor.getString(_cursorIndexOfAvatarUrl);
            }
            final String _tmpLastMessageId;
            if (_cursor.isNull(_cursorIndexOfLastMessageId)) {
              _tmpLastMessageId = null;
            } else {
              _tmpLastMessageId = _cursor.getString(_cursorIndexOfLastMessageId);
            }
            final String _tmpLastMessageText;
            if (_cursor.isNull(_cursorIndexOfLastMessageText)) {
              _tmpLastMessageText = null;
            } else {
              _tmpLastMessageText = _cursor.getString(_cursorIndexOfLastMessageText);
            }
            final String _tmpLastMessageSenderId;
            if (_cursor.isNull(_cursorIndexOfLastMessageSenderId)) {
              _tmpLastMessageSenderId = null;
            } else {
              _tmpLastMessageSenderId = _cursor.getString(_cursorIndexOfLastMessageSenderId);
            }
            final String _tmpLastMessageCreatedAt;
            if (_cursor.isNull(_cursorIndexOfLastMessageCreatedAt)) {
              _tmpLastMessageCreatedAt = null;
            } else {
              _tmpLastMessageCreatedAt = _cursor.getString(_cursorIndexOfLastMessageCreatedAt);
            }
            final int _tmpUnreadCount;
            _tmpUnreadCount = _cursor.getInt(_cursorIndexOfUnreadCount);
            final boolean _tmpMuted;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfMuted);
            _tmpMuted = _tmp != 0;
            final boolean _tmpArchived;
            final int _tmp_1;
            _tmp_1 = _cursor.getInt(_cursorIndexOfArchived);
            _tmpArchived = _tmp_1 != 0;
            final String _tmpCreatedAt;
            if (_cursor.isNull(_cursorIndexOfCreatedAt)) {
              _tmpCreatedAt = null;
            } else {
              _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            }
            final String _tmpUpdatedAt;
            if (_cursor.isNull(_cursorIndexOfUpdatedAt)) {
              _tmpUpdatedAt = null;
            } else {
              _tmpUpdatedAt = _cursor.getString(_cursorIndexOfUpdatedAt);
            }
            _item = new ConversationEntity(_tmpId,_tmpType,_tmpName,_tmpAvatarUrl,_tmpLastMessageId,_tmpLastMessageText,_tmpLastMessageSenderId,_tmpLastMessageCreatedAt,_tmpUnreadCount,_tmpMuted,_tmpArchived,_tmpCreatedAt,_tmpUpdatedAt);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Object getById(final String id,
      final Continuation<? super ConversationEntity> $completion) {
    final String _sql = "SELECT * FROM conversations WHERE id = ?";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<ConversationEntity>() {
      @Override
      @Nullable
      public ConversationEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfType = CursorUtil.getColumnIndexOrThrow(_cursor, "type");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfAvatarUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "avatarUrl");
          final int _cursorIndexOfLastMessageId = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageId");
          final int _cursorIndexOfLastMessageText = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageText");
          final int _cursorIndexOfLastMessageSenderId = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageSenderId");
          final int _cursorIndexOfLastMessageCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "lastMessageCreatedAt");
          final int _cursorIndexOfUnreadCount = CursorUtil.getColumnIndexOrThrow(_cursor, "unreadCount");
          final int _cursorIndexOfMuted = CursorUtil.getColumnIndexOrThrow(_cursor, "muted");
          final int _cursorIndexOfArchived = CursorUtil.getColumnIndexOrThrow(_cursor, "archived");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final ConversationEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpType;
            _tmpType = _cursor.getString(_cursorIndexOfType);
            final String _tmpName;
            if (_cursor.isNull(_cursorIndexOfName)) {
              _tmpName = null;
            } else {
              _tmpName = _cursor.getString(_cursorIndexOfName);
            }
            final String _tmpAvatarUrl;
            if (_cursor.isNull(_cursorIndexOfAvatarUrl)) {
              _tmpAvatarUrl = null;
            } else {
              _tmpAvatarUrl = _cursor.getString(_cursorIndexOfAvatarUrl);
            }
            final String _tmpLastMessageId;
            if (_cursor.isNull(_cursorIndexOfLastMessageId)) {
              _tmpLastMessageId = null;
            } else {
              _tmpLastMessageId = _cursor.getString(_cursorIndexOfLastMessageId);
            }
            final String _tmpLastMessageText;
            if (_cursor.isNull(_cursorIndexOfLastMessageText)) {
              _tmpLastMessageText = null;
            } else {
              _tmpLastMessageText = _cursor.getString(_cursorIndexOfLastMessageText);
            }
            final String _tmpLastMessageSenderId;
            if (_cursor.isNull(_cursorIndexOfLastMessageSenderId)) {
              _tmpLastMessageSenderId = null;
            } else {
              _tmpLastMessageSenderId = _cursor.getString(_cursorIndexOfLastMessageSenderId);
            }
            final String _tmpLastMessageCreatedAt;
            if (_cursor.isNull(_cursorIndexOfLastMessageCreatedAt)) {
              _tmpLastMessageCreatedAt = null;
            } else {
              _tmpLastMessageCreatedAt = _cursor.getString(_cursorIndexOfLastMessageCreatedAt);
            }
            final int _tmpUnreadCount;
            _tmpUnreadCount = _cursor.getInt(_cursorIndexOfUnreadCount);
            final boolean _tmpMuted;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfMuted);
            _tmpMuted = _tmp != 0;
            final boolean _tmpArchived;
            final int _tmp_1;
            _tmp_1 = _cursor.getInt(_cursorIndexOfArchived);
            _tmpArchived = _tmp_1 != 0;
            final String _tmpCreatedAt;
            if (_cursor.isNull(_cursorIndexOfCreatedAt)) {
              _tmpCreatedAt = null;
            } else {
              _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            }
            final String _tmpUpdatedAt;
            if (_cursor.isNull(_cursorIndexOfUpdatedAt)) {
              _tmpUpdatedAt = null;
            } else {
              _tmpUpdatedAt = _cursor.getString(_cursorIndexOfUpdatedAt);
            }
            _result = new ConversationEntity(_tmpId,_tmpType,_tmpName,_tmpAvatarUrl,_tmpLastMessageId,_tmpLastMessageText,_tmpLastMessageSenderId,_tmpLastMessageCreatedAt,_tmpUnreadCount,_tmpMuted,_tmpArchived,_tmpCreatedAt,_tmpUpdatedAt);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
