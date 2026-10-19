import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    // Public projects are accessible without login
    return NextResponse.json({ project });
  } catch (error) {
    console.error('Fetch public project error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat konten 3D/AR' },
      { status: 500 }
    );
  }
}
