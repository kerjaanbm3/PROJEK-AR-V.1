import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 30);
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base || 'projek'}-${randomSuffix}`;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        marker: true,
        scenes: {
          include: {
            objects: true
          }
        }
      }
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar proyek' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, mode = 'DEFAULT', markerId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Judul proyek wajib diisi' }, { status: 400 });
    }

    // Default marker if none provided
    let finalMarkerId = markerId;
    if (!finalMarkerId) {
      const defaultMarker = await prisma.marker.findFirst({
        where: { isDefault: true }
      });
      if (defaultMarker) {
        finalMarkerId = defaultMarker.id;
      }
    }

    const slug = generateSlug(title);

    const project = await prisma.project.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        description: description?.trim() || null,
        slug,
        mode: mode === 'SIMPLE' ? 'SIMPLE' : 'DEFAULT',
        status: 'PUBLISHED',
        markerId: finalMarkerId,
        scenes: {
          create: {
            name: 'Scene 1',
            order: 0,
            backgroundColor: '#0f111a',
            objects: {
              create: [
                {
                  name: 'Kubus Utama',
                  type: 'GEOMETRY',
                  transform: JSON.stringify({
                    position: [0, 0.5, 0],
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1]
                  }),
                  properties: JSON.stringify({
                    geometry: 'box',
                    color: '#6366f1',
                    roughness: 0.3,
                    metalness: 0.7,
                    wireframe: false
                  })
                },
                {
                  name: 'Pencahayaan',
                  type: 'LIGHT',
                  transform: JSON.stringify({
                    position: [3, 5, 4],
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1]
                  }),
                  properties: JSON.stringify({
                    lightType: 'directional',
                    color: '#ffffff',
                    intensity: 1.5
                  })
                }
              ]
            }
          }
        }
      },
      include: {
        marker: true,
        scenes: {
          include: {
            objects: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Gagal membuat proyek baru' }, { status: 500 });
  }
}
