import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const MARKER_DIR = path.join(process.cwd(), 'public', 'markers');

async function ensureMarkerDir() {
  try {
    await fs.access(MARKER_DIR);
  } catch {
    await fs.mkdir(MARKER_DIR, { recursive: true });
  }
}

export async function GET() {
  try {
    const markers = await prisma.marker.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: {
        projects: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    });

    return NextResponse.json({ markers });
  } catch (error) {
    console.error('Fetch markers error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar marker' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    await ensureMarkerDir();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const orientation = (formData.get('orientation') as string | null) || 'HORIZONTAL';
    const qualityScoreStr = formData.get('qualityScore') as string | null;
    const qualityScore = qualityScoreStr ? parseInt(qualityScoreStr, 10) : 85;
    const projectId = (formData.get('projectId') as string | null) || null;

    if (!file) {
      return NextResponse.json({ error: 'File marker wajib diunggah' }, { status: 400 });
    }

    const originalName = path.basename(file.name);
    const ext = path.extname(originalName).toLowerCase();
    const mimeType = (file.type || '').toLowerCase();

    if (
      !['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ||
      mimeType.includes('svg') ||
      mimeType.includes('html')
    ) {
      return NextResponse.json(
        { error: 'Format marker harus berupa gambar raster (PNG, JPG, JPEG, WebP). Format SVG tidak diizinkan demi keamanan.' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const cleanFileName = `marker-${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(MARKER_DIR, cleanFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    const imageUrl = `/markers/${cleanFileName}`;
    const markerName = name?.trim() || `Custom Marker ${new Date().toLocaleDateString('id-ID')}`;

    // Handle optional pre-compiled or client-compiled MindAR target (.mind)
    let patternUrl: string | null = null;
    const mindFile = formData.get('mindFile') as File | null;
    if (mindFile) {
      try {
        const mindFileName = `${cleanFileName.replace(/\.[^.]+$/, '')}.mind`;
        const mindFilePath = path.join(MARKER_DIR, mindFileName);
        const mindBytes = await mindFile.arrayBuffer();
        await fs.writeFile(mindFilePath, Buffer.from(mindBytes));
        patternUrl = `/markers/${mindFileName}`;
      } catch (err) {
        console.warn('Failed to save accompanying .mind file:', err);
      }
    }

    const marker = await prisma.marker.create({
      data: {
        userId: session.userId,
        name: markerName,
        imageUrl,
        patternUrl,
        orientation: orientation.toUpperCase() === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL',
        qualityScore: Math.min(100, Math.max(0, qualityScore)),
        projectId: projectId || null,
        isDefault: false
      }
    });

    // If projectId is specified, automatically link that project to this marker
    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { markerId: marker.id }
      });
    }

    return NextResponse.json({ success: true, marker });
  } catch (error) {
    console.error('Upload marker error:', error);
    return NextResponse.json({ error: 'Gagal mengunggah marker' }, { status: 500 });
  }
}
