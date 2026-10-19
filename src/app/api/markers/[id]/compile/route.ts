import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const MARKER_DIR = path.join(process.cwd(), 'public', 'markers');

export async function POST(
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

    const formData = await request.formData();
    const mindFile = formData.get('mindFile') as File | null;

    if (!mindFile) {
      return NextResponse.json({ error: 'File target .mind wajib dikirim' }, { status: 400 });
    }

    // Determine filename
    let baseName = path.basename(marker.imageUrl).replace(/\.[^.]+$/, '');
    if (!baseName || baseName === 'markers') {
      baseName = `marker-${Date.now()}`;
    }
    const mindFileName = `${baseName}.mind`;
    const mindFilePath = path.join(MARKER_DIR, mindFileName);

    const bytes = await mindFile.arrayBuffer();
    await fs.writeFile(mindFilePath, Buffer.from(bytes));

    const patternUrl = `/markers/${mindFileName}`;

    const updated = await prisma.marker.update({
      where: { id },
      data: { patternUrl }
    });

    return NextResponse.json({
      success: true,
      message: 'Target pelacakan MindAR (.mind) berhasil disimpan',
      marker: updated
    });
  } catch (error) {
    console.error('Save compiled mind target error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan target .mind' }, { status: 500 });
  }
}
