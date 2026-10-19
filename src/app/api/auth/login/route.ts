import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan kata sandi wajib diisi' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Client IP extraction
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'local-client';

    // Rate limiting: 5 attempts per minute per IP + email
    const rateLimitKey = `login:${clientIp}:${cleanEmail}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 60000);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan login gagal. Demi keamanan, silakan coba lagi dalam ${rateCheck.retryAfterSec} detik.`
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSec)
          }
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email atau kata sandi tidak valid' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Email atau kata sandi tidak valid' },
        { status: 401 }
      );
    }

    // Reset rate limit on successful credentials verification
    resetRateLimit(rateLimitKey);

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat login' },
      { status: 500 }
    );
  }
}
