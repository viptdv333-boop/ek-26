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
import com.fomo.chat.data.local.db.entity.MessageEntity;
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
public final class MessageDao_Impl implements MessageDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<MessageEntity> __insertionAdapterOfMessageEntity;

  private final SharedSQLiteStatement __preparedStmtOfDeleteById;

  private final SharedSQLiteStatement __preparedStmtOfDeleteByConversation;

  private final SharedSQLiteStatement __preparedStmtOfDeleteAll;

  public MessageDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfMessageEntity = new EntityInsertionAdapter<MessageEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `messages` (`id`,`conversationId`,`senderId`,`senderName`,`senderAvatarUrl`,`text`,`type`,`attachmentsJson`,`replyToId`,`reactionsJson`,`editedAt`,`deletedAt`,`createdAt`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final MessageEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getConversationId());
        statement.bindString(3, entity.getSenderId());
        if (entity.getSenderName() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getSenderName());
        }
        if (entity.getSenderAvatarUrl() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getSenderAvatarUrl());
        }
        if (entity.getText() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getText());
        }
        statement.bindString(7, entity.getType());
        if (entity.getAttachmentsJson() == null) {
          statement.bindNull(8);
        } else {
          statement.bindString(8, entity.getAttachmentsJson());
        }
        if (entity.getReplyToId() == null) {
          statement.bindNull(9);
        } else {
          statement.bindString(9, entity.getReplyToId());
        }
        if (entity.getReactionsJson() == null) {
          statement.bindNull(10);
        } else {
          statement.bindString(10, entity.getReactionsJson());
        }
        if (entity.getEditedAt() == null) {
          statement.bindNull(11);
        } else {
          statement.bindString(11, entity.getEditedAt());
        }
        if (entity.getDeletedAt() == null) {
          statement.bindNull(12);
        } else {
          statement.bindString(12, entity.getDeletedAt());
        }
        statement.bindString(13, entity.getCreatedAt());
      }
    };
    this.__preparedStmtOfDeleteById = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM messages WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfDeleteByConversation = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM messages WHERE conversationId = ?";
        return _query;
      }
    };
    this.__preparedStmtOfDeleteAll = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM messages";
        return _query;
      }
    };
  }

  @Override
  public Object upsert(final MessageEntity message, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfMessageEntity.insert(message);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object upsertAll(final List<MessageEntity> messages,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfMessageEntity.insert(messages);
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
  public Object deleteByConversation(final String conversationId,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfDeleteByConversation.acquire();
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
          __preparedStmtOfDeleteByConversation.release(_stmt);
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
  public Flow<List<MessageEntity>> observeByConversation(final String conversationId) {
    final String _sql = "SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, conversationId);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"messages"}, new Callable<List<MessageEntity>>() {
      @Override
      @NonNull
      public List<MessageEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfConversationId = CursorUtil.getColumnIndexOrThrow(_cursor, "conversationId");
          final int _cursorIndexOfSenderId = CursorUtil.getColumnIndexOrThrow(_cursor, "senderId");
          final int _cursorIndexOfSenderName = CursorUtil.getColumnIndexOrThrow(_cursor, "senderName");
          final int _cursorIndexOfSenderAvatarUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "senderAvatarUrl");
          final int _cursorIndexOfText = CursorUtil.getColumnIndexOrThrow(_cursor, "text");
          final int _cursorIndexOfType = CursorUtil.getColumnIndexOrThrow(_cursor, "type");
          final int _cursorIndexOfAttachmentsJson = CursorUtil.getColumnIndexOrThrow(_cursor, "attachmentsJson");
          final int _cursorIndexOfReplyToId = CursorUtil.getColumnIndexOrThrow(_cursor, "replyToId");
          final int _cursorIndexOfReactionsJson = CursorUtil.getColumnIndexOrThrow(_cursor, "reactionsJson");
          final int _cursorIndexOfEditedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "editedAt");
          final int _cursorIndexOfDeletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "deletedAt");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final List<MessageEntity> _result = new ArrayList<MessageEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final MessageEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpConversationId;
            _tmpConversationId = _cursor.getString(_cursorIndexOfConversationId);
            final String _tmpSenderId;
            _tmpSenderId = _cursor.getString(_cursorIndexOfSenderId);
            final String _tmpSenderName;
            if (_cursor.isNull(_cursorIndexOfSenderName)) {
              _tmpSenderName = null;
            } else {
              _tmpSenderName = _cursor.getString(_cursorIndexOfSenderName);
            }
            final String _tmpSenderAvatarUrl;
            if (_cursor.isNull(_cursorIndexOfSenderAvatarUrl)) {
              _tmpSenderAvatarUrl = null;
            } else {
              _tmpSenderAvatarUrl = _cursor.getString(_cursorIndexOfSenderAvatarUrl);
            }
            final String _tmpText;
            if (_cursor.isNull(_cursorIndexOfText)) {
              _tmpText = null;
            } else {
              _tmpText = _cursor.getString(_cursorIndexOfText);
            }
            final String _tmpType;
            _tmpType = _cursor.getString(_cursorIndexOfType);
            final String _tmpAttachmentsJson;
            if (_cursor.isNull(_cursorIndexOfAttachmentsJson)) {
              _tmpAttachmentsJson = null;
            } else {
              _tmpAttachmentsJson = _cursor.getString(_cursorIndexOfAttachmentsJson);
            }
            final String _tmpReplyToId;
            if (_cursor.isNull(_cursorIndexOfReplyToId)) {
              _tmpReplyToId = null;
            } else {
              _tmpReplyToId = _cursor.getString(_cursorIndexOfReplyToId);
            }
            final String _tmpReactionsJson;
            if (_cursor.isNull(_cursorIndexOfReactionsJson)) {
              _tmpReactionsJson = null;
            } else {
              _tmpReactionsJson = _cursor.getString(_cursorIndexOfReactionsJson);
            }
            final String _tmpEditedAt;
            if (_cursor.isNull(_cursorIndexOfEditedAt)) {
              _tmpEditedAt = null;
            } else {
              _tmpEditedAt = _cursor.getString(_cursorIndexOfEditedAt);
            }
            final String _tmpDeletedAt;
            if (_cursor.isNull(_cursorIndexOfDeletedAt)) {
              _tmpDeletedAt = null;
            } else {
              _tmpDeletedAt = _cursor.getString(_cursorIndexOfDeletedAt);
            }
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            _item = new MessageEntity(_tmpId,_tmpConversationId,_tmpSenderId,_tmpSenderName,_tmpSenderAvatarUrl,_tmpText,_tmpType,_tmpAttachmentsJson,_tmpReplyToId,_tmpReactionsJson,_tmpEditedAt,_tmpDeletedAt,_tmpCreatedAt);
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
  public Object getLatest(final String conversationId, final int limit,
      final Continuation<? super List<MessageEntity>> $completion) {
    final String _sql = "SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt DESC LIMIT ?";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 2);
    int _argIndex = 1;
    _statement.bindString(_argIndex, conversationId);
    _argIndex = 2;
    _statement.bindLong(_argIndex, limit);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<MessageEntity>>() {
      @Override
      @NonNull
      public List<MessageEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfConversationId = CursorUtil.getColumnIndexOrThrow(_cursor, "conversationId");
          final int _cursorIndexOfSenderId = CursorUtil.getColumnIndexOrThrow(_cursor, "senderId");
          final int _cursorIndexOfSenderName = CursorUtil.getColumnIndexOrThrow(_cursor, "senderName");
          final int _cursorIndexOfSenderAvatarUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "senderAvatarUrl");
          final int _cursorIndexOfText = CursorUtil.getColumnIndexOrThrow(_cursor, "text");
          final int _cursorIndexOfType = CursorUtil.getColumnIndexOrThrow(_cursor, "type");
          final int _cursorIndexOfAttachmentsJson = CursorUtil.getColumnIndexOrThrow(_cursor, "attachmentsJson");
          final int _cursorIndexOfReplyToId = CursorUtil.getColumnIndexOrThrow(_cursor, "replyToId");
          final int _cursorIndexOfReactionsJson = CursorUtil.getColumnIndexOrThrow(_cursor, "reactionsJson");
          final int _cursorIndexOfEditedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "editedAt");
          final int _cursorIndexOfDeletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "deletedAt");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final List<MessageEntity> _result = new ArrayList<MessageEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final MessageEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpConversationId;
            _tmpConversationId = _cursor.getString(_cursorIndexOfConversationId);
            final String _tmpSenderId;
            _tmpSenderId = _cursor.getString(_cursorIndexOfSenderId);
            final String _tmpSenderName;
            if (_cursor.isNull(_cursorIndexOfSenderName)) {
              _tmpSenderName = null;
            } else {
              _tmpSenderName = _cursor.getString(_cursorIndexOfSenderName);
            }
            final String _tmpSenderAvatarUrl;
            if (_cursor.isNull(_cursorIndexOfSenderAvatarUrl)) {
              _tmpSenderAvatarUrl = null;
            } else {
              _tmpSenderAvatarUrl = _cursor.getString(_cursorIndexOfSenderAvatarUrl);
            }
            final String _tmpText;
            if (_cursor.isNull(_cursorIndexOfText)) {
              _tmpText = null;
            } else {
              _tmpText = _cursor.getString(_cursorIndexOfText);
            }
            final String _tmpType;
            _tmpType = _cursor.getString(_cursorIndexOfType);
            final String _tmpAttachmentsJson;
            if (_cursor.isNull(_cursorIndexOfAttachmentsJson)) {
              _tmpAttachmentsJson = null;
            } else {
              _tmpAttachmentsJson = _cursor.getString(_cursorIndexOfAttachmentsJson);
            }
            final String _tmpReplyToId;
            if (_cursor.isNull(_cursorIndexOfReplyToId)) {
              _tmpReplyToId = null;
            } else {
              _tmpReplyToId = _cursor.getString(_cursorIndexOfReplyToId);
            }
            final String _tmpReactionsJson;
            if (_cursor.isNull(_cursorIndexOfReactionsJson)) {
              _tmpReactionsJson = null;
            } else {
              _tmpReactionsJson = _cursor.getString(_cursorIndexOfReactionsJson);
            }
            final String _tmpEditedAt;
            if (_cursor.isNull(_cursorIndexOfEditedAt)) {
              _tmpEditedAt = null;
            } else {
              _tmpEditedAt = _cursor.getString(_cursorIndexOfEditedAt);
            }
            final String _tmpDeletedAt;
            if (_cursor.isNull(_cursorIndexOfDeletedAt)) {
              _tmpDeletedAt = null;
            } else {
              _tmpDeletedAt = _cursor.getString(_cursorIndexOfDeletedAt);
            }
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            _item = new MessageEntity(_tmpId,_tmpConversationId,_tmpSenderId,_tmpSenderName,_tmpSenderAvatarUrl,_tmpText,_tmpType,_tmpAttachmentsJson,_tmpReplyToId,_tmpReactionsJson,_tmpEditedAt,_tmpDeletedAt,_tmpCreatedAt);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Object getById(final String id, final Continuation<? super MessageEntity> $completion) {
    final String _sql = "SELECT * FROM messages WHERE id = ?";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<MessageEntity>() {
      @Override
      @Nullable
      public MessageEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfConversationId = CursorUtil.getColumnIndexOrThrow(_cursor, "conversationId");
          final int _cursorIndexOfSenderId = CursorUtil.getColumnIndexOrThrow(_cursor, "senderId");
          final int _cursorIndexOfSenderName = CursorUtil.getColumnIndexOrThrow(_cursor, "senderName");
          final int _cursorIndexOfSenderAvatarUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "senderAvatarUrl");
          final int _cursorIndexOfText = CursorUtil.getColumnIndexOrThrow(_cursor, "text");
          final int _cursorIndexOfType = CursorUtil.getColumnIndexOrThrow(_cursor, "type");
          final int _cursorIndexOfAttachmentsJson = CursorUtil.getColumnIndexOrThrow(_cursor, "attachmentsJson");
          final int _cursorIndexOfReplyToId = CursorUtil.getColumnIndexOrThrow(_cursor, "replyToId");
          final int _cursorIndexOfReactionsJson = CursorUtil.getColumnIndexOrThrow(_cursor, "reactionsJson");
          final int _cursorIndexOfEditedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "editedAt");
          final int _cursorIndexOfDeletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "deletedAt");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final MessageEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpConversationId;
            _tmpConversationId = _cursor.getString(_cursorIndexOfConversationId);
            final String _tmpSenderId;
            _tmpSenderId = _cursor.getString(_cursorIndexOfSenderId);
            final String _tmpSenderName;
            if (_cursor.isNull(_cursorIndexOfSenderName)) {
              _tmpSenderName = null;
            } else {
              _tmpSenderName = _cursor.getString(_cursorIndexOfSenderName);
            }
            final String _tmpSenderAvatarUrl;
            if (_cursor.isNull(_cursorIndexOfSenderAvatarUrl)) {
              _tmpSenderAvatarUrl = null;
            } else {
              _tmpSenderAvatarUrl = _cursor.getString(_cursorIndexOfSenderAvatarUrl);
            }
            final String _tmpText;
            if (_cursor.isNull(_cursorIndexOfText)) {
              _tmpText = null;
            } else {
              _tmpText = _cursor.getString(_cursorIndexOfText);
            }
            final String _tmpType;
            _tmpType = _cursor.getString(_cursorIndexOfType);
            final String _tmpAttachmentsJson;
            if (_cursor.isNull(_cursorIndexOfAttachmentsJson)) {
              _tmpAttachmentsJson = null;
            } else {
              _tmpAttachmentsJson = _cursor.getString(_cursorIndexOfAttachmentsJson);
            }
            final String _tmpReplyToId;
            if (_cursor.isNull(_cursorIndexOfReplyToId)) {
              _tmpReplyToId = null;
            } else {
              _tmpReplyToId = _cursor.getString(_cursorIndexOfReplyToId);
            }
            final String _tmpReactionsJson;
            if (_cursor.isNull(_cursorIndexOfReactionsJson)) {
              _tmpReactionsJson = null;
            } else {
              _tmpReactionsJson = _cursor.getString(_cursorIndexOfReactionsJson);
            }
            final String _tmpEditedAt;
            if (_cursor.isNull(_cursorIndexOfEditedAt)) {
              _tmpEditedAt = null;
            } else {
              _tmpEditedAt = _cursor.getString(_cursorIndexOfEditedAt);
            }
            final String _tmpDeletedAt;
            if (_cursor.isNull(_cursorIndexOfDeletedAt)) {
              _tmpDeletedAt = null;
            } else {
              _tmpDeletedAt = _cursor.getString(_cursorIndexOfDeletedAt);
            }
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            _result = new MessageEntity(_tmpId,_tmpConversationId,_tmpSenderId,_tmpSenderName,_tmpSenderAvatarUrl,_tmpText,_tmpType,_tmpAttachmentsJson,_tmpReplyToId,_tmpReactionsJson,_tmpEditedAt,_tmpDeletedAt,_tmpCreatedAt);
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
