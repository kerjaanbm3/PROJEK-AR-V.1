const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Default Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kantor.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: 'ADMIN',
      name: 'Super Admin'
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Super Admin',
      role: 'ADMIN'
    }
  });

  console.log(`👤 Admin created/verified: ${admin.email}`);

  // 2. Create Default AR Markers
  const defaultMarkers = [
    {
      name: 'Kartu Target MindAR (Image Tracking)',
      imageUrl: '/markers/card.png',
      patternUrl: '/markers/card.mind',
      orientation: 'HORIZONTAL',
      qualityScore: 98,
      isDefault: true,
      userId: admin.id
    },
    {
      name: 'Hiro Marker (Default AR)',
      imageUrl: '/markers/hiro.png',
      patternUrl: '/markers/hiro.patt',
      orientation: 'HORIZONTAL',
      qualityScore: 88,
      isDefault: true,
      userId: admin.id
    },
    {
      name: 'Barcode AR Marker 05',
      imageUrl: '/markers/barcode-05.png',
      patternUrl: null,
      orientation: 'HORIZONTAL',
      qualityScore: 82,
      isDefault: true,
      userId: admin.id
    },
    {
      name: 'Target Circle Marker',
      imageUrl: '/markers/target-circle.png',
      patternUrl: null,
      orientation: 'HORIZONTAL',
      qualityScore: 80,
      isDefault: true,
      userId: admin.id
    }
  ];

  for (const m of defaultMarkers) {
    const existing = await prisma.marker.findFirst({
      where: { name: m.name }
    });
    if (!existing) {
      await prisma.marker.create({ data: m });
    } else {
      await prisma.marker.update({
        where: { id: existing.id },
        data: {
          patternUrl: m.patternUrl || existing.patternUrl,
          orientation: m.orientation || existing.orientation,
          qualityScore: m.qualityScore || existing.qualityScore
        }
      });
    }
  }
  console.log('🎯 Default AR Markers seeded');

  // 3. Create Starter Assets
  const starterAssets = [
    {
      name: 'Cyber Cube (PBR Material)',
      type: 'MODEL_3D',
      fileUrl: '/assets/sample-cube.glb',
      fileSize: 1024,
      mimeType: 'model/gltf-binary',
      isDefault: true,
      userId: admin.id
    },
    {
      name: 'Golden Trophy Sphere',
      type: 'MODEL_3D',
      fileUrl: '/assets/trophy.glb',
      fileSize: 2048,
      mimeType: 'model/gltf-binary',
      isDefault: true,
      userId: admin.id
    },
    {
      name: 'Logo BM3 / Banner Kantor',
      type: 'IMAGE',
      fileUrl: '/assets/bm3-banner.png',
      fileSize: 15420,
      mimeType: 'image/png',
      isDefault: true,
      userId: admin.id
    }
  ];

  for (const a of starterAssets) {
    const existing = await prisma.asset.findFirst({
      where: { name: a.name }
    });
    if (!existing) {
      await prisma.asset.create({ data: a });
    }
  }
  console.log('📦 Starter Assets seeded');

  // 4. Create Demo Project (Showcase AR)
  const existingProject = await prisma.project.findFirst({
    where: { slug: 'demo-kantor-ar' }
  });

  const cardMarker = await prisma.marker.findFirst({
    where: { name: 'Kartu Target MindAR (Image Tracking)' }
  });

  const hiroMarker = await prisma.marker.findFirst({
    where: { name: 'Hiro Marker (Default AR)' }
  });

  const targetMarker = cardMarker || hiroMarker;

  if (!existingProject) {
    const demoProject = await prisma.project.create({
      data: {
        userId: admin.id,
        title: 'Demo 3D & AR Interaktif Kantor',
        description: 'Proyek contoh untuk pengenalan visual 3D dan AR berbasis browser.',
        slug: 'demo-kantor-ar',
        mode: 'DEFAULT',
        status: 'PUBLISHED',
        markerId: targetMarker ? targetMarker.id : null,
        thumbnail: targetMarker?.imageUrl || '/markers/card.png',
        scenes: {
          create: {
            name: 'Scene Utama',
            order: 0,
            backgroundColor: '#0f111a',
            objects: {
              create: [
                {
                  name: 'Kubus Kristal Neon',
                  type: 'GEOMETRY',
                  transform: JSON.stringify({
                    position: [0, 0.5, 0],
                    rotation: [0.3, 0.5, 0],
                    scale: [1, 1, 1]
                  }),
                  properties: JSON.stringify({
                    geometry: 'box',
                    color: '#6366f1',
                    roughness: 0.2,
                    metalness: 0.8,
                    wireframe: false
                  })
                },
                {
                  name: 'Teks Sambutan AR',
                  type: 'TEXT_3D',
                  transform: JSON.stringify({
                    position: [0, 1.4, 0],
                    rotation: [0, 0, 0],
                    scale: [0.8, 0.8, 0.8]
                  }),
                  properties: JSON.stringify({
                    text: 'AR STUDIO BM3',
                    color: '#38bdf8',
                    size: 0.25
                  })
                },
                {
                  name: 'Lampu Sorot Utama',
                  type: 'LIGHT',
                  transform: JSON.stringify({
                    position: [2, 4, 3],
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
      }
    });
    console.log(`🚀 Demo project created: /view/${demoProject.slug}`);
  } else if (targetMarker) {
    await prisma.project.update({
      where: { id: existingProject.id },
      data: {
        markerId: targetMarker.id,
        thumbnail: targetMarker.imageUrl
      }
    });
    console.log(`🔄 Demo project updated with MindAR target marker: ${targetMarker.name}`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
