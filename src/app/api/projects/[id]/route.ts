import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
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
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Fetch project detail error:', error);
    return NextResponse.json({ error: 'Gagal memuat detail proyek' }, { status: 500 });
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
    const { title, description, status, mode, markerId, scenes } = body;

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
    }

    // 1. Update project basic attributes
    await prisma.project.update({
      where: { id },
      data: {
        title: title !== undefined ? title : project.title,
        description: description !== undefined ? description : project.description,
        status: status !== undefined ? status : project.status,
        mode: mode !== undefined ? mode : project.mode,
        markerId: markerId !== undefined ? markerId : project.markerId,
      }
    });

    // 2. If scenes are supplied, perform full sync of scenes and objects
    if (Array.isArray(scenes)) {
      for (const sceneData of scenes) {
        if (!sceneData.id || sceneData.id.startsWith('temp_')) {
          // New scene
          const createdScene = await prisma.scene.create({
            data: {
              projectId: id,
              name: sceneData.name || 'Scene',
              order: sceneData.order ?? 0,
              backgroundColor: sceneData.backgroundColor || '#0f111a',
            }
          });

          if (Array.isArray(sceneData.objects)) {
            for (const obj of sceneData.objects) {
              await prisma.object.create({
                data: {
                  sceneId: createdScene.id,
                  name: obj.name || 'Object',
                  type: obj.type || 'GEOMETRY',
                  assetId: obj.assetId || null,
                  transform: typeof obj.transform === 'string' ? obj.transform : JSON.stringify(obj.transform),
                  properties: typeof obj.properties === 'string' ? obj.properties : JSON.stringify(obj.properties)
                }
              });
            }
          }
        } else {
          // Existing scene update
          await prisma.scene.update({
            where: { id: sceneData.id },
            data: {
              name: sceneData.name,
              order: sceneData.order ?? 0,
              backgroundColor: sceneData.backgroundColor,
            }
          });

          if (Array.isArray(sceneData.objects)) {
            // Delete existing objects in scene and recreate to guarantee sync
            await prisma.object.deleteMany({
              where: { sceneId: sceneData.id }
            });

            for (const obj of sceneData.objects) {
              await prisma.object.create({
                data: {
                  sceneId: sceneData.id,
                  name: obj.name || 'Object',
                  type: obj.type || 'GEOMETRY',
                  assetId: obj.assetId || null,
                  transform: typeof obj.transform === 'string' ? obj.transform : JSON.stringify(obj.transform),
                  properties: typeof obj.properties === 'string' ? obj.properties : JSON.stringify(obj.properties)
                }
              });
            }
          }
        }
      }
    }

    const updated = await prisma.project.findUnique({
      where: { id },
      include: {
        marker: true,
        scenes: {
          orderBy: { order: 'asc' },
          include: {
            objects: {
              include: { asset: true }
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui proyek' }, { status: 500 });
  }
}

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

    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Proyek berhasil dihapus' });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Gagal menghapus proyek' }, { status: 500 });
  }
}
