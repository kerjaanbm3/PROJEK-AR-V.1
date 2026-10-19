import crypto from 'crypto';
import { cookies } from 'next/headers';
import prisma from './prisma';

const SESSION_COOKIE_NAME = 'ar_session_token';
const SECRET = process.env.SESSION_SECRET || 'super-secret-key-ar-studio-bm3-default';

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const data = JSON.stringify({ ...payload, exp });
  const base64Data = Buffer.from(data).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [base64Data, signature] = token.split('.');
    if (!base64Data || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(base64Data)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(
      Buffer.from(base64Data, 'base64url').toString('utf-8')
    ) as SessionPayload;

    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  });

  return user;
}

export { SESSION_COOKIE_NAME };
