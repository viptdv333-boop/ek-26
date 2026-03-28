import { FastifyInstance } from 'fastify';
import { Contact } from '../models/Contact';
import { User } from '../models/User';
import { SyncedContact } from '../models/SyncedContact';
import mongoose from 'mongoose';
import { sendInviteSms } from '../services/sms';

export async function contactRoutes(app: FastifyInstance) {
  // Get all contacts
  app.get('/api/contacts', { preHandler: [app.authenticate] }, async (request) => {
    const contacts = await Contact.find({ userId: new mongoose.Types.ObjectId(request.userId) })
      .populate('contactUserId', 'displayName avatarUrl phone status lastSeen telegramUsername')
      .lean();

    return contacts
      .filter((c) => c.contactUserId && (c.contactUserId as any)._id)
      .map((c) => {
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

  // Invite via SMS
  app.post('/api/contacts/invite', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { phone } = request.body as { phone: string };

    if (!phone || phone.replace(/[^\d]/g, '').length < 10) {
      return reply.code(400).send({ error: 'Invalid phone number' });
    }

    // Check if user already registered
    const existing = await User.findOne({ phone });
    if (existing) {
      return reply.code(400).send({ error: 'User already registered' });
    }

    try {
      const message = 'Join FOMO Chat! Download: https://chat.fomo.broker';
      await sendInviteSms(phone, message);
      return { success: true };
    } catch (err: any) {
      console.error('[Invite SMS] Error:', err.message);
      return reply.code(500).send({ error: 'Failed to send invite' });
    }
  });

  // Batch add contacts
  app.post('/api/contacts/batch', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userIds } = request.body as { userIds: string[] };

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return reply.code(400).send({ error: 'userIds array required' });
    }

    if (userIds.length > 500) {
      return reply.code(400).send({ error: 'Maximum 500 contacts at once' });
    }

    const docs = userIds
      .filter(id => id !== request.userId)
      .map(id => ({
        userId: new mongoose.Types.ObjectId(request.userId),
        contactUserId: new mongoose.Types.ObjectId(id),
      }));

    try {
      const result = await Contact.insertMany(docs, { ordered: false });
      return { added: result.length, duplicates: docs.length - result.length };
    } catch (err: any) {
      // insertMany with ordered:false throws on duplicates but still inserts non-duplicates
      const inserted = err.insertedDocs?.length || 0;
      return { added: inserted, duplicates: docs.length - inserted };
    }
  });

  // Delete all contacts (regular + synced) for authenticated user
  app.delete('/api/contacts/all', { preHandler: [app.authenticate] }, async (request) => {
    const userId = new mongoose.Types.ObjectId(request.userId);
    const [regular, synced] = await Promise.all([
      Contact.deleteMany({ userId }),
      SyncedContact.deleteMany({ ownerId: userId }),
    ]);
    return { deletedRegular: regular.deletedCount, deletedSynced: synced.deletedCount };
  });

  // Save batch of synced contacts (full refresh per source)
  app.post('/api/contacts/sync-save', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { contacts, source } = request.body as {
      contacts: Array<{ phone: string; name: string; avatarUrl?: string; registeredUserId?: string }>;
      source: 'google' | 'apple' | 'vcf';
    };

    if (!Array.isArray(contacts)) {
      return reply.code(400).send({ error: 'contacts array required' });
    }

    if (!source || !['google', 'apple', 'vcf'].includes(source)) {
      return reply.code(400).send({ error: 'Valid source required (google, apple, vcf)' });
    }

    const ownerId = new mongoose.Types.ObjectId(request.userId);

    // Delete existing synced contacts for this user+source to refresh
    await SyncedContact.deleteMany({ ownerId, source });

    if (contacts.length === 0) {
      return { saved: 0 };
    }

    const docs = contacts.map((c) => ({
      ownerId,
      phone: c.phone,
      name: c.name || '',
      avatarUrl: c.avatarUrl,
      source,
      registeredUserId: c.registeredUserId ? new mongoose.Types.ObjectId(c.registeredUserId) : undefined,
      isRegistered: !!c.registeredUserId,
    }));

    try {
      const result = await SyncedContact.insertMany(docs, { ordered: false });
      return { saved: result.length };
    } catch (err: any) {
      // Some duplicates may exist across sources; count what was inserted
      const inserted = err.insertedDocs?.length || 0;
      return { saved: inserted };
    }
  });

  // Get all synced contacts for authenticated user
  app.get('/api/contacts/synced', { preHandler: [app.authenticate] }, async (request) => {
    const ownerId = new mongoose.Types.ObjectId(request.userId);

    const contacts = await SyncedContact.find({ ownerId })
      .sort({ isRegistered: -1, name: 1 })
      .lean();

    return contacts.map((c) => ({
      id: c._id.toString(),
      phone: c.phone,
      name: c.name,
      avatarUrl: c.avatarUrl,
      source: c.source,
      registeredUserId: c.registeredUserId?.toString() || null,
      isRegistered: c.isRegistered,
    }));
  });
}
