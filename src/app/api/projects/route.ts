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
    const { title, description, mode = 'DEFAULT', markerId, status = 'DRAFT', template = 'DEFAULT' } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Judul proyek wajib diisi' }, { status: 400 });
    }

    const validStatus = ['DRAFT', 'PUBLISHED', 'PRIVATE'].includes(status) ? status : 'DRAFT';

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

    // Build template scenes
    let scenesData: any = [];

    if (template === 'BUSINESS_CARD') {
      scenesData = [
        {
          name: 'Kartu Nama AR',
          order: 0,
          backgroundColor: '#0a0d18',
          objects: {
            create: [
              {
                name: 'Nama Profesional',
                type: 'TEXT_3D',
                transform: JSON.stringify({ position: [0, 1.2, 0], rotation: [0, 0, 0], scale: [0.9, 0.9, 0.9] }),
                properties: JSON.stringify({ text: 'NAMA ANDA', color: '#38bdf8', size: 0.22, animation: 'PULSE' })
              },
              {
                name: 'Jabatan / Posisi',
                type: 'TEXT_3D',
                transform: JSON.stringify({ position: [0, 0.75, 0], rotation: [0, 0, 0], scale: [0.65, 0.65, 0.65] }),
                properties: JSON.stringify({ text: 'Divisi Teknologi Informasi', color: '#94a3b8', size: 0.16 })
              },
              {
                name: 'Tombol Website Interaktif',
                type: 'GEOMETRY',
                transform: JSON.stringify({ position: [0, 0.1, 0], rotation: [0, 0, 0], scale: [1.6, 0.45, 0.15] }),
                properties: JSON.stringify({
                  geometry: 'box',
                  color: '#6366f1',
                  roughness: 0.3,
                  metalness: 0.5,
                  trigger: { action: 'OPEN_URL', url: 'https://bm3.internal' }
                })
              },
              {
                name: 'Pencahayaan',
                type: 'LIGHT',
                transform: JSON.stringify({ position: [2, 4, 3], rotation: [0, 0, 0], scale: [1, 1, 1] }),
                properties: JSON.stringify({ lightType: 'directional', color: '#ffffff', intensity: 1.6 })
              }
            ]
          }
        }
      ];
    } else if (template === 'PRODUCT_SHOWCASE') {
      // Find starter trophy asset if available
      const trophyAsset = await prisma.asset.findFirst({
        where: { name: { contains: 'Trophy' } }
      });

      scenesData = [
        {
          name: 'Showcase Produk',
          order: 0,
          backgroundColor: '#0c0f1d',
          objects: {
            create: [
              {
                name: 'Model Produk Unggulan',
                type: trophyAsset ? '3D_MODEL' : 'GEOMETRY',
                assetId: trophyAsset ? trophyAsset.id : null,
                transform: JSON.stringify({ position: [0, 0.6, 0], rotation: [0, 0, 0], scale: [1.2, 1.2, 1.2] }),
                properties: JSON.stringify({
                  geometry: 'cylinder',
                  color: '#f59e0b',
                  roughness: 0.2,
                  metalness: 0.9,
                  animation: 'SPIN'
                })
              },
              {
                name: 'Judul Produk',
                type: 'TEXT_3D',
                transform: JSON.stringify({ position: [0, 1.7, 0], rotation: [0, 0, 0], scale: [0.75, 0.75, 0.75] }),
                properties: JSON.stringify({ text: 'PRODUK UNGGULAN BM3', color: '#fbbf24', size: 0.2 })
              },
              {
                name: 'Lampu Sorot Studio',
                type: 'LIGHT',
                transform: JSON.stringify({ position: [3, 5, 4], rotation: [0, 0, 0], scale: [1, 1, 1] }),
                properties: JSON.stringify({ lightType: 'directional', color: '#ffffff', intensity: 2.0 })
              }
            ]
          }
        }
      ];
    } else if (template === 'MULTI_SLIDE') {
      scenesData = [
        {
          name: 'Slide 1: Pengantar',
          order: 0,
          backgroundColor: '#0f111a',
          objects: {
            create: [
              {
                name: 'Judul Slide 1',
                type: 'TEXT_3D',
                transform: JSON.stringify({ position: [0, 1.3, 0], rotation: [0, 0, 0], scale: [0.8, 0.8, 0.8] }),
                properties: JSON.stringify({ text: 'SLIDE 1: PENGANTAR', color: '#6366f1', size: 0.22 })
              },
              {
                name: 'Objek Kristal',
                type: 'GEOMETRY',
                transform: JSON.stringify({ position: [0, 0.45, 0], rotation: [0, 0, 0], scale: [0.9, 0.9, 0.9] }),
                properties: JSON.stringify({ geometry: 'box', color: '#6366f1', animation: 'BOUNCE' })
              },
              {
                name: 'Pencahayaan',
                type: 'LIGHT',
                transform: JSON.stringify({ position: [2, 4, 3], rotation: [0, 0, 0], scale: [1, 1, 1] }),
                properties: JSON.stringify({ lightType: 'directional', color: '#ffffff', intensity: 1.5 })
              }
            ]
          }
        },
        {
          name: 'Slide 2: Fitur Utama',
          order: 1,
          backgroundColor: '#07161c',
          objects: {
            create: [
              {
                name: 'Judul Slide 2',
                type: 'TEXT_3D',
                transform: JSON.stringify({ position: [0, 1.3, 0], rotation: [0, 0, 0], scale: [0.8, 0.8, 0.8] }),
                properties: JSON.stringify({ text: 'SLIDE 2: FITUR UTAMA', color: '#10b981', size: 0.22 })
              },
              {
                name: 'Bola Hijau Berputar',
                type: 'GEOMETRY',
                transform: JSON.stringify({ position: [0, 0.45, 0], rotation: [0, 0, 0], scale: [0.9, 0.9, 0.9] }),
                properties: JSON.stringify({ geometry: 'sphere', color: '#10b981', animation: 'SPIN' })
              },
              {
                name: 'Pencahayaan',
                type: 'LIGHT',
                transform: JSON.stringify({ position: [2, 4, 3], rotation: [0, 0, 0], scale: [1, 1, 1] }),
                properties: JSON.stringify({ lightType: 'directional', color: '#ffffff', intensity: 1.5 })
              }
            ]
          }
        },
        {
          name: 'Slide 3: Penutup & Kontak',
          order: 2,
          backgroundColor: '#180a1a',
          objects: {
            create: [
              {
                name: 'Judul Slide 3',
                type: 'TEXT_3D',
                transform: JSON.stringify({ position: [0, 1.3, 0], rotation: [0, 0, 0], scale: [0.8, 0.8, 0.8] }),
                properties: JSON.stringify({ text: 'SLIDE 3: PENUTUP', color: '#ec4899', size: 0.22 })
              },
              {
                name: 'Tombol Hubungi',
                type: 'GEOMETRY',
                transform: JSON.stringify({ position: [0, 0.35, 0], rotation: [0, 0, 0], scale: [1.4, 0.5, 0.2] }),
                properties: JSON.stringify({
                  geometry: 'box',
                  color: '#ec4899',
                  trigger: { action: 'OPEN_URL', url: 'https://kantor.bm3.go.id' }
                })
              },
              {
                name: 'Pencahayaan',
                type: 'LIGHT',
                transform: JSON.stringify({ position: [2, 4, 3], rotation: [0, 0, 0], scale: [1, 1, 1] }),
                properties: JSON.stringify({ lightType: 'directional', color: '#ffffff', intensity: 1.5 })
              }
            ]
          }
        }
      ];
    } else {
      // Default / BLANK
      scenesData = [
        {
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
      ];
    }

    const project = await prisma.project.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        description: description?.trim() || null,
        slug,
        mode: mode === 'SIMPLE' ? 'SIMPLE' : 'DEFAULT',
        status: validStatus,
        markerId: finalMarkerId,
        scenes: {
          create: scenesData
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
