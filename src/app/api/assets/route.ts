import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const whereClause: any = {};
    if (type && type !== 'ALL') {
      whereClause.type = type;
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Fetch assets error:', error);
    return NextResponse.json({ error: 'Gagal memuat pustaka aset' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    await ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const customName = formData.get('name') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Determine asset type
    const mimeType = file.type || '';
    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();

    let assetType = 'IMAGE';
    if (ext === '.glb' || ext === '.gltf' || ext === '.obj' || mimeType.includes('gltf') || mimeType.includes('model')) {
      assetType = 'MODEL_3D';
    } else if (ext === '.gif' || mimeType === 'image/gif') {
      assetType = 'GIF';
    } else if (ext === '.mp3' || ext === '.wav' || mimeType.includes('audio')) {
      assetType = 'AUDIO';
    } else if (ext === '.mp4' || ext === '.webm' || mimeType.includes('video')) {
      assetType = 'VIDEO';
    } else if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext) || mimeType.includes('image')) {
      assetType = 'IMAGE';
    }

    // Max 30MB file size limit
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran file melebihi batas maksimum 30 MB' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const cleanFileName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, cleanFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${cleanFileName}`;
    const assetName = customName?.trim() || originalName.replace(/\.[^/.]+$/, '');

    const asset = await prisma.asset.create({
      data: {
        userId: session.userId,
        name: assetName,
        type: assetType,
        fileUrl,
        fileSize: file.size,
        mimeType: mimeType || 'application/octet-stream',
        isDefault: false
      }
    });

    return NextResponse.json({ success: true, asset });
  } catch (error) {
    console.error('Upload asset error:', error);
    return NextResponse.json({ error: 'Gagal mengunggah aset' }, { status: 500 });
  }
}
