import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const { id } = await params;

    const marker = await prisma.marker.findUnique({
      where: { id }
    });

    if (!marker) {
      return NextResponse.json({ error: 'Marker tidak ditemukan' }, { status: 404 });
    }

    if (marker.isDefault) {
      return NextResponse.json({ error: 'Marker bawaan sistem tidak dapat dihapus' }, { status: 400 });
    }

    // Unlink any projects using this marker
    await prisma.project.updateMany({
      where: { markerId: id },
      data: { markerId: null }
    });

    // Remove file if local
    if (marker.imageUrl.startsWith('/markers/marker-')) {
      const filePath = path.join(process.cwd(), 'public', marker.imageUrl);
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.warn('File already deleted or not found:', e);
      }
    }

    await prisma.marker.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Marker berhasil dihapus' });
  } catch (error) {
    console.error('Delete marker error:', error);
    return NextResponse.json({ error: 'Gagal menghapus marker' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, orientation, qualityScore, projectId } = body;

    const updated = await prisma.marker.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        orientation: orientation !== undefined ? orientation : undefined,
        qualityScore: qualityScore !== undefined ? qualityScore : undefined,
        projectId: projectId !== undefined ? projectId : undefined
      }
    });

    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { markerId: id }
      });
    }

    return NextResponse.json({ success: true, marker: updated });
  } catch (error) {
    console.error('Update marker error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui marker' }, { status: 500 });
  }
}
