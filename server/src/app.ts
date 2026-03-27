import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import mongoose from 'mongoose';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { conversationRoutes } from './routes/conversations';
import { messageRoutes } from './routes/messages';
import { keyRoutes } from './routes/keys';
import { uploadRoutes } from './routes/uploads';
import { contactRoutes } from './routes/contacts';
import translateRoutes from './routes/translate';
import { adminRoutes } from './routes/admin';
import { setupWebSocket, broadcastToConversation } from './ws/handler';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authMiddleware;
    broadcastToConversation: typeof broadcastToConversation;
  }
}

async function main() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  // Plugins
  await app.register(cors, { origin: config.CORS_ORIGIN });
  await app.register(websocket);

  // Decorators
  app.decorate('authenticate', authMiddleware);
  app.decorate('broadcastToConversation', broadcastToConversation);

  // Error handler for Zod validation
  app.setErrorHandler((error: Error, request, reply) => {
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: JSON.parse(error.message),
      });
    }
    app.log.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  });

  // Routes
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(conversationRoutes);
  await app.register(messageRoutes);
  await app.register(keyRoutes);
  await app.register(uploadRoutes);
  await app.register(contactRoutes);
  await app.register(translateRoutes);
  await app.register(adminRoutes);

  // WebSocket
  await setupWebSocket(app);

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Connect to MongoDB
  try {
    await mongoose.connect(config.MONGODB_URI);
    app.log.info(`Connected to MongoDB: ${config.MONGODB_URI}`);

    // Fix indexes: drop old sparse indexes and recreate as partial
    const usersCol = mongoose.connection.collection('users');
    for (const idx of ['phone_1', 'telegramId_1']) {
      try { await usersCol.dropIndex(idx); } catch {}
    }
    // Remove null telegramId/phone values so partial index works
    await usersCol.updateMany({ telegramId: null }, { $unset: { telegramId: '' } });
    await usersCol.updateMany({ phone: null }, { $unset: { phone: '' } });
    await usersCol.createIndex({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
    await usersCol.createIndex({ telegramId: 1 }, { unique: true, partialFilterExpression: { telegramId: { $type: 'number' } } });
    app.log.info('Database indexes synced');
  } catch (err: unknown) {
    app.log.error('Failed to connect to MongoDB: %s', String(err));
    process.exit(1);
  }

  // Start server
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`ЭК-26 server running on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info('Shutting down...');
    await app.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
