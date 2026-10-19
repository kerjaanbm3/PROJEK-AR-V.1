const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const THREE = require('three');
const { GLTFExporter } = require('three/addons/exporters/GLTFExporter.js');

global.FileReader = class FileReader {
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(buf).toString('base64');
      if (this.onload) this.onload({ target: this });
    });
  }
};

async function main() {
  console.log('🎨 Generating physical assets & markers...');

  const markersDir = path.join(__dirname, '..', 'public', 'markers');
  const assetsDir = path.join(__dirname, '..', 'public', 'assets');

  if (!fs.existsSync(markersDir)) fs.mkdirSync(markersDir, { recursive: true });
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  // 1. Generate Hiro Marker SVG & PNG
  const hiroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <rect width="500" height="500" fill="#ffffff" />
    <rect x="50" y="50" width="400" height="400" fill="#000000" />
    <rect x="100" y="100" width="300" height="300" fill="#ffffff" />
    <rect x="140" y="140" width="80" height="220" fill="#000000" />
    <rect x="220" y="210" width="140" height="80" fill="#000000" />
    <rect x="280" y="140" width="80" height="80" fill="#000000" />
    <rect x="280" y="280" width="80" height="80" fill="#000000" />
  </svg>`;
  fs.writeFileSync(path.join(markersDir, 'hiro.svg'), hiroSvg);
  await sharp(Buffer.from(hiroSvg)).png().toFile(path.join(markersDir, 'hiro.png'));
  console.log('✅ Generated hiro.png');

  // 2. Generate Target Circle Marker
  const targetSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <rect width="500" height="500" fill="#ffffff" />
    <rect x="40" y="40" width="420" height="420" fill="#0f172a" rx="20" />
    <rect x="80" y="80" width="340" height="340" fill="#ffffff" rx="10" />
    <rect x="130" y="130" width="240" height="240" fill="#0f172a" rx="6" />
    <circle cx="250" cy="250" r="70" fill="#38bdf8" />
    <circle cx="250" cy="250" r="40" fill="#ffffff" />
    <circle cx="250" cy="250" r="15" fill="#0f172a" />
  </svg>`;
  fs.writeFileSync(path.join(markersDir, 'target-circle.svg'), targetSvg);
  await sharp(Buffer.from(targetSvg)).png().toFile(path.join(markersDir, 'target-circle.png'));
  console.log('✅ Generated target-circle.png');

  // 3. Generate Barcode 05 Marker
  const barcodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <rect width="500" height="500" fill="#ffffff" />
    <rect x="50" y="50" width="400" height="400" fill="#000000" />
    <rect x="100" y="100" width="300" height="300" fill="#ffffff" />
    <rect x="130" y="130" width="50" height="240" fill="#000000" />
    <rect x="210" y="130" width="80" height="240" fill="#000000" />
    <rect x="320" y="130" width="50" height="240" fill="#000000" />
  </svg>`;
  fs.writeFileSync(path.join(markersDir, 'barcode-05.svg'), barcodeSvg);
  await sharp(Buffer.from(barcodeSvg)).png().toFile(path.join(markersDir, 'barcode-05.png'));
  console.log('✅ Generated barcode-05.png');

  // 4. Generate BM3 Banner Image
  const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1b4b" />
        <stop offset="50%" stop-color="#312e81" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#bg)" rx="24" />
    <rect x="20" y="20" width="760" height="360" fill="none" stroke="#6366f1" stroke-width="3" rx="18" stroke-dasharray="10 6" opacity="0.5" />
    <circle cx="400" cy="150" r="60" fill="#6366f1" opacity="0.25" />
    <text x="400" y="165" font-family="sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">AR STUDIO BM3</text>
    <text x="400" y="225" font-family="sans-serif" font-size="22" fill="#38bdf8" text-anchor="middle">PLATFORM VISUAL 3D &amp; AUGMENTED REALITY</text>
    <text x="400" y="280" font-family="sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">Aplikasi Web Internal Kantor BM3 &#8226; 2026</text>
  </svg>`;
  await sharp(Buffer.from(bannerSvg)).png().toFile(path.join(assetsDir, 'bm3-banner.png'));
  console.log('✅ Generated bm3-banner.png');

  // 5. Generate Real GLB Model: Cyber Cube
  const exporter = new GLTFExporter();

  const cubeScene = new THREE.Scene();
  const cubeMat = new THREE.MeshStandardMaterial({
    color: 0x6366f1,
    roughness: 0.2,
    metalness: 0.8
  });
  const cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cubeMat);
  cubeScene.add(cubeMesh);

  await new Promise((resolve, reject) => {
    exporter.parse(
      cubeScene,
      (gltf) => {
        fs.writeFileSync(path.join(assetsDir, 'sample-cube.glb'), JSON.stringify(gltf));
        console.log('✅ Generated sample-cube.glb');
        resolve();
      },
      (error) => reject(error),
      { binary: false }
    );
  });

  // 6. Generate Real GLB Model: Golden Trophy
  const trophyScene = new THREE.Scene();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.15,
    metalness: 0.95
  });
  const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 32), goldMat);
  baseMesh.position.y = 0.15;
  trophyScene.add(baseMesh);

  const stemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.6, 32), goldMat);
  stemMesh.position.y = 0.6;
  trophyScene.add(stemMesh);

  const bowlMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), goldMat);
  bowlMesh.position.y = 0.9;
  trophyScene.add(bowlMesh);

  const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), goldMat);
  starMesh.position.y = 1.35;
  trophyScene.add(starMesh);

  await new Promise((resolve, reject) => {
    exporter.parse(
      trophyScene,
      (gltf) => {
        fs.writeFileSync(path.join(assetsDir, 'trophy.glb'), JSON.stringify(gltf));
        console.log('✅ Generated trophy.glb');
        resolve();
      },
      (error) => reject(error),
      { binary: false }
    );
  });

  console.log('🎉 All assets and markers generated successfully!');
}

main().catch(console.error);
