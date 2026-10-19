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

    const source = await prisma.project.findUnique({
      where: { id },
      include: {
        scenes: {
          include: {
            objects: true
          }
        }
      }
    });

    if (!source) {
      return NextResponse.json({ error: 'Proyek sumber tidak ditemukan' }, { status: 404 });
    }

    const newTitle = `${source.title} (Salinan)`;
    const newSlug = generateSlug(newTitle);

    const duplicated = await prisma.project.create({
      data: {
        userId: session.userId,
        title: newTitle,
        description: source.description,
        slug: newSlug,
        mode: source.mode,
        status: 'DRAFT',
        markerId: source.markerId,
        thumbnail: source.thumbnail,
        scenes: {
          create: source.scenes.map((scene) => ({
            name: scene.name,
            order: scene.order,
            backgroundColor: scene.backgroundColor,
            objects: {
              create: scene.objects.map((obj) => ({
                name: obj.name,
                type: obj.type,
                assetId: obj.assetId,
                transform: obj.transform,
                properties: obj.properties
              }))
            }
          }))
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

    return NextResponse.json({ success: true, project: duplicated });
  } catch (error) {
    console.error('Duplicate project error:', error);
    return NextResponse.json({ error: 'Gagal menduplikasi proyek' }, { status: 500 });
  }
}
