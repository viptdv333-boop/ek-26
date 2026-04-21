# План: Групповое E2EE шифрование (Sender Keys Protocol)

## Цель

Добавить сквозное шифрование (E2EE) для групповых чатов, чтобы сервер не мог читать сообщения. Реализовать на основе **Sender Keys protocol** (подход Signal/WhatsApp).

---

## Как работает Sender Keys

**Идея:** каждый участник группы имеет свой "sender key" (симметричную цепочку). Он шифрует свои сообщения этим ключом и отправляет в группу. Остальные участники получают sender keys всех через попарные E2EE каналы (X3DH) — один раз при вступлении в группу.

**Компоненты ключа одного отправителя:**
- `senderId` — ID отправителя
- `chainKey` — секретный ключ цепочки (обновляется после каждого сообщения)
- `signingKey` — Ed25519 ключ для подписи (аутентификация)
- `messageKeys` — производные ключи для каждого сообщения (HKDF от chainKey)

**Flow отправки сообщения:**
1. Участник A берёт свой `chainKey[N]`
2. Генерирует `messageKey[N] = HKDF(chainKey[N])`
3. `chainKey[N+1] = HMAC(chainKey[N])` — обновляет цепочку
4. Шифрует сообщение: `ciphertext = ChaCha20Poly1305(messageKey[N], plaintext)`
5. Подписывает: `signature = Ed25519.sign(signingKey, ciphertext)`
6. Отправляет на сервер `{ senderId, messageNumber: N, ciphertext, signature }`

**Flow получения:**
1. Участник B получает зашифрованное сообщение от A
2. Находит sender key от A (сохранён в IndexedDB)
3. Проверяет подпись через A.signingKeyPublic
4. Восстанавливает `chainKey[N]` (если знает N-1 — просто HMAC-ит вперёд)
5. Вычисляет `messageKey[N] = HKDF(chainKey[N])`
6. Расшифровывает

---

## Архитектура

### Клиент (`web/src/services/crypto/`)

**Новые файлы:**
- `SenderKeyManager.ts` — управление своими и чужими sender keys
- `GroupSessionManager.ts` — высокоуровневый API: encrypt/decrypt для группы
- `SenderKeyStore.ts` — хранилище sender keys в IndexedDB

**Модификация:**
- `SessionManager.ts` — добавить метод для отправки sender key через существующий попарный E2EE канал

### Shared crypto (`shared/src/crypto/`)

**Новые файлы:**
- `senderKey.ts` — реализация Sender Keys protocol
  - `createSenderKey()` — генерация
  - `ratchetForward(chainKey)` — HMAC-итерация
  - `deriveMessageKey(chainKey)` — HKDF
  - `encryptSenderMessage(messageKey, signingKey, plaintext)`
  - `decryptSenderMessage(messageKey, verifyKey, ciphertext, signature)`
  - `serializeSenderKey` / `deserializeSenderKey`

**Использовать уже подключённые библиотеки:**
- `@noble/ciphers` — ChaCha20-Poly1305
- `@noble/curves` — Ed25519, X25519
- `@noble/hashes` — HKDF, HMAC, SHA-256

### Сервер (`server/src/`)

**Что меняется:**
- Сервер **не видит контент** — только хранит и маршрутизирует зашифрованные пакеты
- Добавить тип сообщения `group_encrypted`
- Добавить endpoint для распределения sender keys между участниками при создании/изменении группы

**Новые endpoints:**
- `POST /api/conversations/:id/senderkey` — загрузить sender key участника (зашифрованный)
- `GET /api/conversations/:id/senderkeys` — получить sender keys всех участников

**Модель `SenderKeyBundle`:**
```typescript
{
  conversationId: ObjectId,
  fromUserId: ObjectId,      // чей sender key
  toUserId: ObjectId,        // для кого зашифрован
  encryptedKey: string,      // sender key, зашифрованный через X3DH
  createdAt: Date
}
```

---

## Этапы разработки

### Этап 1: Sender Keys primitives (3 дня)
**Файлы:** `shared/src/crypto/senderKey.ts`

**Задачи:**
- [ ] Генерация sender key (chainKey + Ed25519 signing pair)
- [ ] Ratchet forward (HMAC цепочка)
- [ ] Derive message key (HKDF)
- [ ] Encrypt/decrypt с подписью Ed25519
- [ ] Serialize/deserialize (base64)
- [ ] Юнит-тесты

**Критерий готовности:** работает симметричное шифрование "сам себе" с проверкой подписи.

---

### Этап 2: Key Store (1 день)
**Файлы:** `web/src/services/crypto/SenderKeyStore.ts`

**Задачи:**
- [ ] IndexedDB схема для хранения sender keys
- [ ] `saveSenderKey(conversationId, userId, key)`
- [ ] `getSenderKey(conversationId, userId)`
- [ ] `getAllSenderKeys(conversationId)`
- [ ] `deleteSenderKeys(conversationId, userId)` — при удалении участника

---

### Этап 3: Распределение ключей (2 дня)
**Файлы:** `web/src/services/crypto/SenderKeyManager.ts`, `server/src/routes/conversations.ts`

**Задачи:**
- [ ] При создании группы — генерируем свой sender key
- [ ] Шифруем через X3DH для каждого участника
- [ ] Отправляем на сервер через новый endpoint
- [ ] При получении push `group_senderkey` — расшифровываем через X3DH, сохраняем в SenderKeyStore
- [ ] При добавлении в существующую группу — запрашиваем sender keys всех участников через `GET /api/conversations/:id/senderkeys`

**Серверная часть:**
- [ ] Модель `SenderKeyBundle`
- [ ] Endpoint для сохранения пачки (от одного участника всем)
- [ ] Endpoint для получения своих пакетов
- [ ] WS event `group_senderkey_received`

---

### Этап 4: Group Session Manager (2 дня)
**Файлы:** `web/src/services/crypto/GroupSessionManager.ts`

**Задачи:**
- [ ] `encryptGroupMessage(conversationId, plaintext)` — шифрует своим sender key
- [ ] `decryptGroupMessage(conversationId, senderId, messageNumber, ciphertext, signature)` — ищет sender key отправителя, расшифровывает
- [ ] Обработка "out-of-order" сообщений (пришло N+5 раньше N+3) — хранить промежуточные message keys в кэше
- [ ] Обработка отсутствия ключа — запросить с сервера

---

### Этап 5: Интеграция с UI (2 дня)
**Файлы:** `web/src/stores/chatStore.ts`, `web/src/components/ChatRoom.tsx`, WebSocket transport

**Задачи:**
- [ ] При отправке сообщения в группу — если тип `group` — шифровать через GroupSessionManager
- [ ] При получении — дешифровать, показать plaintext
- [ ] Индикатор "E2EE" в шапке группы (иконка замка)
- [ ] Fallback: если sender key отсутствует — показать "⚠️ Сообщение не удалось расшифровать"

---

### Этап 6: Ротация при изменении состава (2 дня)

**При добавлении участника:**
- [ ] Все текущие участники генерируют НОВЫЕ sender keys
- [ ] Распределяют новый ключ всем включая новичка
- [ ] Старые сообщения остаются зашифрованными старым ключом — новичок их не прочитает ✅

**При удалении участника:**
- [ ] Все оставшиеся участники генерируют новые sender keys
- [ ] Распределяют между собой (не ушедшему)
- [ ] Удалённый участник больше не может читать новые сообщения ✅

**Реализация:**
- [ ] WS event `group_member_added` / `group_member_removed` — триггер ротации
- [ ] Отправка сообщения "Вы добавили X в группу" — в открытом виде (системное сообщение), чтобы все знали что нужна ротация

---

### Этап 7: Тестирование и отладка (3 дня)

- [ ] Создание группы — все участники могут читать
- [ ] Отправка сообщения от каждого — все остальные читают
- [ ] Добавление нового участника — видит новые сообщения, не видит старые
- [ ] Удаление участника — не видит новые сообщения
- [ ] Оффлайн участник получает сообщения при возврате онлайн
- [ ] Одновременная отправка сообщений от двух участников
- [ ] Потеря/дубликаты сообщений
- [ ] Race conditions при ротации
- [ ] Миграция существующих групп (старые остаются без E2EE, новые — с)

---

## Дополнительные соображения

### Безопасность
- **Верификация участников:** добавить возможность сравнивать "safety numbers" (как в Signal) — хеш публичных ключей пары участников
- **Защита от replay:** каждое сообщение содержит уникальный `messageNumber`, повтор отклоняется
- **Метаданные:** сервер видит КТО отправил и КОМУ (этого не скрыть без onion routing)

### Производительность
- Распределение ключей: O(N×N) при ротации в большой группе
- Для групп 50+ человек можно оптимизировать через **TreeKEM** (используется в MLS), но это +неделя работы

### UX
- **Индикатор "Шифруется"** во время первоначального обмена ключами
- **Предупреждение** если sender key не получен от участника
- **"Verified" метка** если safety number подтверждён вручную

---

## Итоговая оценка времени

| Этап | Дней | Описание |
|------|------|----------|
| 1 | 3 | Sender Keys primitives |
| 2 | 1 | Key Store |
| 3 | 2 | Распределение ключей |
| 4 | 2 | Group Session Manager |
| 5 | 2 | Интеграция с UI |
| 6 | 2 | Ротация при изменении состава |
| 7 | 3 | Тестирование |
| **Итого** | **15** | **~2 недели** |

---

## Что остаётся за рамками

- **Групповые звонки с E2EE** — отдельная большая задача (требует mesh WebRTC или SFRAME)
- **E2EE для медиа-файлов** — отдельно шифровать вложения (можно добавить этап 8)
- **TreeKEM / MLS** — оптимизация для 100+ участников, пока работаем с Sender Keys

---

## Что нужно от пользователя перед началом

1. Подтверждение что групповое E2EE нужно (сервер не сможет модерировать контент)
2. Готовность к 2-недельной разработке (по частям, сессия за сессией)
3. Решение: мигрировать старые группы или оставить как есть
4. Тестовая группа с 2-3 участниками для проверки
