import { FastifyInstance } from 'fastify';
import { Contact } from '../models/Contact';
import { User } from '../models/User';
import mongoose from 'mongoose';

export async function contactRoutes(app: FastifyInstance) {
  // Get all contacts
  app.get('/api/contacts', { preHandler: [app.authenticate] }, async (request) => {
    const contacts = await Contact.find({ userId: new mongoose.Types.ObjectId(request.userId) })
      .populate('contactUserId', 'displayName avatarUrl phone status lastSeen telegramUsername')
      .lean();

    return contacts.map((c) => {
      const user = c.contactUserId as any;
      return {
        id: c._id.toString(),
        userId: user._id.toString(),
        displayName: (c.nickname || user.displayName) as string,
        originalName: user.displayName as string,
        nickname: c.nickname,
        avatarUrl: c.customAvatar || user.avatarUrl,
        phone: user.phone,
        status: user.status,
        lastSeen: user.lastSeen?.toISOString() || null,
        telegramUsername: user.telegramUsername,
        note: c.note,
        isFavorite: c.isFavorite || false,
        createdAt: c.createdAt.toISOString(),
      };
    });
  });

  // Add contact
  app.post('/api/contacts', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { contactUserId, nickname } = request.body as { contactUserId: string; nickname?: string };

    if (contactUserId === request.userId) {
      return reply.code(400).send({ error: 'Cannot add yourself' });
    }

    const targetUser = await User.findById(contactUserId);
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    try {
      const contact = await Contact.create({
        userId: new mongoose.Types.ObjectId(request.userId),
        contactUserId: new mongoose.Types.ObjectId(contactUserId),
        nickname: nickname || null,
      });

      return {
        id: contact._id.toString(),
        userId: targetUser._id.toString(),
        displayName: nickname || targetUser.displayName,
        originalName: targetUser.displayName,
        nickname: contact.nickname,
        avatarUrl: targetUser.avatarUrl,
        phone: targetUser.phone,
        status: targetUser.status,
        lastSeen: targetUser.lastSeen?.toISOString() || null,
        createdAt: contact.createdAt.toISOString(),
      };
    } catch (err: any) {
      if (err.code === 11000) {
        return reply.code(409).send({ error: 'Contact already exists' });
      }
      throw err;
    }
  });

  // Delete contact
  app.delete('/api/contacts/:contactUserId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { contactUserId } = request.params as { contactUserId: string };

    const result = await Contact.deleteOne({
      userId: new mongoose.Types.ObjectId(request.userId),
      contactUserId: new mongoose.Types.ObjectId(contactUserId),
    });

    if (result.deletedCount === 0) {
      return reply.code(404).send({ error: 'Contact not found' });
    }

    return { success: true };
  });

  // Update contact (nickname, note, customAvatar, isFavorite)
  app.patch('/api/contacts/:contactUserId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { contactUserId } = request.params as { contactUserId: string };
    const { nickname, note, customAvatar, isFavorite } = request.body as {
      nickname?: string | null;
      note?: string | null;
      customAvatar?: string | null;
      isFavorite?: boolean;
    };

    const update: Record<string, any> = {};
    if (nickname !== undefined) update.nickname = nickname;
    if (note !== undefined) update.note = note;
    if (customAvatar !== undefined) update.customAvatar = customAvatar;
    if (isFavorite !== undefined) update.isFavorite = isFavorite;

    const contact = await Contact.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(request.userId),
        contactUserId: new mongoose.Types.ObjectId(contactUserId),
      },
      { $set: update },
      { new: true }
    );

    if (!contact) {
      return reply.code(404).send({ error: 'Contact not found' });
    }

    return { success: true };
  });
}
