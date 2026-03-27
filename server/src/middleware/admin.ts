import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../models/User';

export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // authMiddleware must run first (sets request.userId)
  if (!request.userId) {
    return reply.code(401).send({ error: 'Not authenticated' });
  }

  const user = await User.findById(request.userId).select('isAdmin').lean();
  if (!user?.isAdmin) {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}
