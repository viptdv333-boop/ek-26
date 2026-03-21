import { FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerify } from 'jose';
import { config } from '../config';

const secret = new TextEncoder().encode(config.JWT_SECRET);

export interface JwtPayload {
  sub: string; // userId
  phone: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userPhone: string;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing authorization token' });
  }

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret);
    request.userId = payload.sub as string;
    request.userPhone = (payload as unknown as JwtPayload).phone;
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}
