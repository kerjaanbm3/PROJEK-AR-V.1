'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export interface EditorObject {
  id: string;
  name: string;
  type: string; // 'GEOMETRY' | '3D_MODEL' | 'TEXT_3D' | 'LIGHT' | 'IMAGE' | 'VIDEO' | 'AUDIO'
  assetId?: string | null;
  asset?: { fileUrl: string; name: string; mimeType?: string } | null;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  properties: {
    geometry?: string; // 'box' | 'sphere' | 'cylinder' | 'torus' | 'cone'
    color?: string;
    roughness?: number;
    metalness?: number;
    wireframe?: boolean;
    text?: string;
    size?: number;
    lightType?: string;
    intensity?: number;
    width?: number;
    height?: number;
    videoUrl?: string;
    audioUrl?: string;
    animation?: 'NONE' | 'SPIN' | 'BOUNCE' | 'PULSE';
    animSpeed?: number;
    trigger?: {
      action: 'NONE' | 'OPEN_URL' | 'SWITCH_SCENE' | 'TOGGLE_AUDIO';
      url?: string;
      targetScene?: number;
      audioUrl?: string;
    };
  };
}

interface Props {
  objects: EditorObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateTransform: (
    id: string,
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => void;
  transformMode: 'translate' | 'rotate' | 'scale';
  backgroundColor: string;
  markerImageUrl?: string | null;
}

export default function Editor3DCanvas({
  objects,
  selectedId,
  onSelect,
  onUpdateTransform,
  transformMode,
  backgroundColor,
  markerImageUrl,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);

  // Map of objectId -> THREE.Object3D
  const meshesMapRef = useRef<Map<string, THREE.Object3D>>(new Map());

  // Setup Three.js scene, camera, renderer, and controls
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(backgroundColor);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(3, 4, 6);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // 4. OrbitControls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.target.set(0, 0.5, 0);
    orbitControlsRef.current = orbit;

    // 5. TransformControls
    const transform = new TransformControls(camera, renderer.domElement);
    transform.size = 0.75;
    transformControlsRef.current = transform;

    transform.addEventListener('dragging-changed', (event) => {
      orbit.enabled = !event.value;
    });

    transform.addEventListener('change', () => {
      const target = transform.object;
      if (target && target.userData?.id) {
        onUpdateTransform(target.userData.id, {
          position: [target.position.x, target.position.y, target.position.z],
          rotation: [target.rotation.x, target.rotation.y, target.rotation.z],
          scale: [target.scale.x, target.scale.y, target.scale.z]
        });
      }
    });

    scene.add(transform.getHelper ? transform.getHelper() : (transform as unknown as THREE.Object3D));

    // 6. Grid and Lights
    const grid = new THREE.GridHelper(20, 40, 0x6366f1, 0x1e2438);
    grid.position.y = 0;
    scene.add(grid);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const defaultSun = new THREE.DirectionalLight(0xffffff, 1.5);
    defaultSun.position.set(5, 10, 7);
    defaultSun.castShadow = true;
    scene.add(defaultSun);

    // 7. Raycasting for object selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (!mount) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / mount.clientWidth) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / mount.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const interactables: THREE.Object3D[] = [];
      meshesMapRef.current.forEach((mesh) => {
        interactables.push(mesh);
      });

      const intersects = raycaster.intersectObjects(interactables, true);
      if (intersects.length > 0) {
        let topObj: THREE.Object3D | null = intersects[0].object;
        while (topObj && !topObj.userData?.id && topObj.parent) {
          topObj = topObj.parent;
        }
        if (topObj && topObj.userData?.id) {
          onSelect(topObj.userData.id);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Resize
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      orbit.update();

      // Update animated GIFs in 3D scene
      meshesMapRef.current.forEach((grp) => {
        grp.traverse((child) => {
          if (child.userData?.isGif && child.userData.gifImg?.complete) {
            const { gifImg, gifCanvas, gifCtx, gifTexture } = child.userData;
            if (gifCtx && gifImg.naturalWidth > 0) {
              gifCtx.clearRect(0, 0, gifCanvas.width, gifCanvas.height);
              gifCtx.drawImage(gifImg, 0, 0, gifCanvas.width, gifCanvas.height);
              gifTexture.needsUpdate = true;
            }
          }
        });
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      orbit.dispose();
      transform.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync background color
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(backgroundColor);
    }
  }, [backgroundColor]);

  // Sync TransformControls mode (translate, rotate, scale)
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
    }
  }, [transformMode]);

  // Sync objects into Three.js scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const existingMap = meshesMapRef.current;
    const currentObjectIds = new Set(objects.map((o) => o.id));

    // Remove deleted objects
    existingMap.forEach((mesh, id) => {
      if (!currentObjectIds.has(id)) {
        scene.remove(mesh);
        existingMap.delete(id);
      }
    });

    // Create or update objects
    objects.forEach((obj) => {
      let mesh = existingMap.get(obj.id);

      if (!mesh) {
        mesh = createMeshForObject(obj);
        mesh.userData = { id: obj.id, type: obj.type };
        scene.add(mesh);
        existingMap.set(obj.id, mesh);
      } else {
        // Update transform
        mesh.position.set(...obj.transform.position);
        mesh.rotation.set(...obj.transform.rotation);
        mesh.scale.set(...obj.transform.scale);

        // Update material properties if applicable
        updateMeshMaterial(mesh, obj);
      }
    });
  }, [objects]);

  // Sync selection to TransformControls
  useEffect(() => {
    const transform = transformControlsRef.current;
    if (!transform) return;

    if (selectedId) {
      const selectedMesh = meshesMapRef.current.get(selectedId);
      if (selectedMesh) {
        transform.attach(selectedMesh);
      } else {
        transform.detach();
      }
    } else {
      transform.detach();
    }
  }, [selectedId, objects]);

  // Helper: Create mesh based on object type
  function createMeshForObject(obj: EditorObject): THREE.Object3D {
    const color = obj.properties.color || '#6366f1';
    const roughness = obj.properties.roughness ?? 0.3;
    const metalness = obj.properties.metalness ?? 0.7;
    const wireframe = obj.properties.wireframe ?? false;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness,
      wireframe
    });

    let group = new THREE.Group();

    if (obj.type === 'GEOMETRY') {
      let geo: THREE.BufferGeometry;
      switch (obj.properties.geometry) {
        case 'sphere':
          geo = new THREE.SphereGeometry(0.6, 32, 32);
          break;
        case 'cylinder':
          geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
          break;
        case 'torus':
          geo = new THREE.TorusGeometry(0.5, 0.2, 24, 48);
          break;
        case 'cone':
          geo = new THREE.ConeGeometry(0.6, 1.2, 32);
          break;
        default:
          geo = new THREE.BoxGeometry(1, 1, 1);
          break;
      }
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    } else if (obj.type === '3D_MODEL' && obj.asset?.fileUrl) {
      const loader = new GLTFLoader();
      loader.load(
        obj.asset.fileUrl,
        (gltf) => {
          group.add(gltf.scene);
        },
        undefined,
        () => {
          // Fallback box
          const fallback = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
          group.add(fallback);
        }
      );
    } else if (obj.type === 'TEXT_3D') {
      // Create canvas texture text billboard or 3D text plane
      const text = obj.properties.text || 'Teks 3D AR';
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(15, 20, 35, 0.85)';
        ctx.roundRect ? ctx.roundRect(10, 10, 492, 236, 24) : ctx.fillRect(10, 10, 492, 236);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.font = 'bold 54px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 128);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const textMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), textMat);
      group.add(textPlane);
    } else if (obj.type === 'IMAGE' && obj.asset?.fileUrl) {
      const isGif = obj.asset.fileUrl.toLowerCase().endsWith('.gif') || obj.asset.mimeType === 'image/gif';
      const planeGeo = new THREE.PlaneGeometry(2, 2);

      if (isGif) {
        const gifImg = new Image();
        gifImg.crossOrigin = 'anonymous';
        gifImg.src = obj.asset.fileUrl;

        const gifCanvas = document.createElement('canvas');
        gifCanvas.width = 512;
        gifCanvas.height = 512;
        const gifCtx = gifCanvas.getContext('2d');

        const gifTexture = new THREE.CanvasTexture(gifCanvas);
        gifTexture.colorSpace = THREE.SRGBColorSpace;

        const imgMat = new THREE.MeshBasicMaterial({
          map: gifTexture,
          transparent: true,
          side: THREE.DoubleSide
        });

        const planeMesh = new THREE.Mesh(planeGeo, imgMat);
        planeMesh.userData = { isGif: true, gifImg, gifCanvas, gifCtx, gifTexture };
        group.add(planeMesh);
      } else {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(obj.asset.fileUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          if (tex.image && tex.image.width && tex.image.height) {
            const aspect = tex.image.width / tex.image.height;
            planeMesh.scale.set(aspect, 1, 1);
          }
        });
        texture.colorSpace = THREE.SRGBColorSpace;

        const imgMat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide
        });
        const planeMesh = new THREE.Mesh(planeGeo, imgMat);
        group.add(planeMesh);
      }
    } else if (obj.type === 'VIDEO') {
      const videoGeo = new THREE.PlaneGeometry(2, 1.125);
      const videoCanvas = document.createElement('canvas');
      videoCanvas.width = 512;
      videoCanvas.height = 288;
      const vctx = videoCanvas.getContext('2d');
      if (vctx) {
        vctx.fillStyle = '#0f172a';
        vctx.fillRect(0, 0, 512, 288);
        vctx.strokeStyle = '#38bdf8';
        vctx.lineWidth = 6;
        vctx.strokeRect(6, 6, 500, 276);
        // Draw play icon
        vctx.fillStyle = '#38bdf8';
        vctx.beginPath();
        vctx.moveTo(230, 110);
        vctx.lineTo(290, 144);
        vctx.lineTo(230, 178);
        vctx.closePath();
        vctx.fill();
        vctx.font = 'bold 24px sans-serif';
        vctx.textAlign = 'center';
        vctx.fillText(obj.asset?.name || 'VIDEO AR', 256, 220);
      }
      const vTex = new THREE.CanvasTexture(videoCanvas);
      const vMat = new THREE.MeshBasicMaterial({ map: vTex, side: THREE.DoubleSide });
      const videoMesh = new THREE.Mesh(videoGeo, vMat);
      group.add(videoMesh);
    } else if (obj.type === 'AUDIO') {
      // 3D Audio Speaker representation
      const speakerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x06b6d4),
        metalness: 0.8,
        roughness: 0.2
      });
      const speakerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.35, 24), speakerMat);
      const speakerCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.4, 24),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
      );
      speakerCone.position.y = 0.25;
      group.add(speakerBase);
      group.add(speakerCone);
    } else if (obj.type === 'LIGHT') {
      const lightMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, wireframe: true })
      );
      group.add(lightMesh);
    }

    group.position.set(...obj.transform.position);
    group.rotation.set(...obj.transform.rotation);
    group.scale.set(...obj.transform.scale);

    return group;
  }

  function updateMeshMaterial(group: THREE.Object3D, obj: EditorObject) {
    const color = obj.properties.color;
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.material && (m.material as THREE.MeshStandardMaterial).color && color) {
          (m.material as THREE.MeshStandardMaterial).color.set(color);
          if (obj.properties.roughness !== undefined) {
            (m.material as THREE.MeshStandardMaterial).roughness = obj.properties.roughness;
          }
          if (obj.properties.metalness !== undefined) {
            (m.material as THREE.MeshStandardMaterial).metalness = obj.properties.metalness;
          }
          if (obj.properties.wireframe !== undefined) {
            (m.material as THREE.MeshStandardMaterial).wireframe = obj.properties.wireframe;
          }
        }
      }
    });
  }

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        outline: 'none',
        overflow: 'hidden'
      }}
    />
  );
}
