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

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        objects: true
      }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    }

    if (asset.isDefault) {
      return NextResponse.json(
        { error: 'Aset bawaan sistem tidak dapat dihapus' },
        { status: 400 }
      );
    }

    // Check if asset is used in projects
    if (asset.objects.length > 0) {
      return NextResponse.json(
        {
          error: `Aset ini sedang digunakan oleh ${asset.objects.length} objek dalam proyek. Hapus objek tersebut terlebih dahulu.`
        },
        { status: 400 }
      );
    }

    // Try deleting physical file if in /uploads/
    if (asset.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', asset.fileUrl);
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.warn('Physical file could not be removed:', e);
      }
    }

    await prisma.asset.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Aset berhasil dihapus' });
  } catch (error) {
    console.error('Delete asset error:', error);
    return NextResponse.json({ error: 'Gagal menghapus aset' }, { status: 500 });
  }
}
