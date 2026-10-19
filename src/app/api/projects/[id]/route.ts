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
    const { title, description, status, mode, markerId, thumbnail, scenes } = body;

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
    }

    // Atomic transaction for project, scenes, and objects
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update project basic attributes
      await tx.project.update({
        where: { id },
        data: {
          title: title !== undefined ? title.trim() : project.title,
          description: description !== undefined ? (description?.trim() || null) : project.description,
          status: status !== undefined ? status : project.status,
          mode: mode !== undefined ? mode : project.mode,
          markerId: markerId !== undefined ? markerId : project.markerId,
          thumbnail: thumbnail !== undefined ? thumbnail : project.thumbnail,
        }
      });

      // 2. If scenes are supplied, perform full atomic sync of scenes and objects
      if (Array.isArray(scenes)) {
        const existingScenes = await tx.scene.findMany({
          where: { projectId: id }
        });

        const incomingSceneIds = new Set(
          scenes
            .filter((s: any) => s.id && !s.id.startsWith('temp_'))
            .map((s: any) => s.id)
        );

        // Delete scenes that were removed in the editor
        for (const existingScene of existingScenes) {
          if (!incomingSceneIds.has(existingScene.id)) {
            await tx.object.deleteMany({ where: { sceneId: existingScene.id } });
            await tx.scene.delete({ where: { id: existingScene.id } });
          }
        }

        // Process incoming scenes in order
        for (let i = 0; i < scenes.length; i++) {
          const sceneData = scenes[i];
          const sceneOrder = sceneData.order !== undefined ? sceneData.order : i;
          let targetSceneId = sceneData.id;

          if (!targetSceneId || targetSceneId.startsWith('temp_')) {
            // Create new scene
            const created = await tx.scene.create({
              data: {
                projectId: id,
                name: sceneData.name || `Scene ${i + 1}`,
                order: sceneOrder,
                backgroundColor: sceneData.backgroundColor || '#0f111a',
              }
            });
            targetSceneId = created.id;
          } else {
            // Update existing scene
            await tx.scene.update({
              where: { id: targetSceneId },
              data: {
                name: sceneData.name || `Scene ${i + 1}`,
                order: sceneOrder,
                backgroundColor: sceneData.backgroundColor || '#0f111a',
              }
            });

            // Clear old objects before recreating to guarantee sync
            await tx.object.deleteMany({
              where: { sceneId: targetSceneId }
            });
          }

          // Create objects for this scene
          if (Array.isArray(sceneData.objects) && sceneData.objects.length > 0) {
            const objectsToCreate = sceneData.objects.map((obj: any) => ({
              sceneId: targetSceneId,
              name: obj.name || 'Object',
              type: obj.type || 'GEOMETRY',
              assetId: obj.assetId || null,
              transform: typeof obj.transform === 'string' ? obj.transform : JSON.stringify(obj.transform),
              properties: typeof obj.properties === 'string' ? obj.properties : JSON.stringify(obj.properties)
            }));

            await tx.object.createMany({
              data: objectsToCreate
            });
          }
        }
      }

      return tx.project.findUnique({
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
