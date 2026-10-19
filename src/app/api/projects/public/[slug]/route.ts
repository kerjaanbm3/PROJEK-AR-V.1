import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        marker: true,
        scenes: {
          orderBy: { order: 'asc' },
          include: {
            objects: {
              include: {
                asset: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Proyek 3D/AR tidak ditemukan atau tautan telah kadaluarsa' },
        { status: 404 }
      );
    }

    // Access control: DRAFT and PRIVATE projects require active session
    if (project.status !== 'PUBLISHED') {
      const session = await getSession();
      if (!session) {
        if (project.status === 'PRIVATE') {
          return NextResponse.json(
            { error: 'Proyek ini bersifat privat dan hanya dapat diakses oleh pengguna yang memiliki hak akses.' },
            { status: 403 }
          );
        } else {
          return NextResponse.json(
            { error: 'Proyek ini masih berstatus draf (DRAFT) dan belum dipublikasikan.' },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Fetch public project error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat konten 3D/AR' },
      { status: 500 }
    );
  }
}
