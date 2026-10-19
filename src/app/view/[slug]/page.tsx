'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  Camera,
  Maximize2,
  Minimize2,
  Share2,
  Box,
  RotateCw,
  QrCode,
  Copy,
  Check,
  X,
  Sparkles,
  Info,
  RefreshCw,
  Download,
  Lock,
  Unlock,
  Sliders,
  Move,
  Printer,
  Monitor,
  Zap,
  Target,
  CheckCircle2,
  Eye,
  Compass,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Video,
  Smartphone
} from 'lucide-react';
import QRCode from 'qrcode';
import MobileScanModal from '@/components/common/MobileScanModal';

export default function PublicViewerPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [project, setProject] = useState<any>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Marker metadata with fallback to default MindAR target card
  const markerImage = project?.marker?.imageUrl || '/markers/card.png';
  const markerName = project?.marker?.name || 'Kartu Target MindAR';
  const markerOrientation = project?.marker?.orientation || 'HORIZONTAL';

  // Viewer modes: '3D' or 'AR'
  const [viewerMode, setViewerMode] = useState<'3D' | 'AR'>('3D');
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // AR interactive controls state
  const [isLocked, setIsLocked] = useState(false);
  const [arScale, setArScale] = useState(1);
  const [arRotationY, setArRotationY] = useState(0);

  // Modals & Screen Target mode
  const [showMobileScanModal, setShowMobileScanModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMarkerGuide, setShowMarkerGuide] = useState(false);
  const [screenTargetMode, setScreenTargetMode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // AR Camera stream & Tracking modes
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);

  // MindAR Image Tracking State
  const [arTrackingType, setArTrackingType] = useState<'IMAGE_TRACKING' | 'FREE_TOUCH'>('IMAGE_TRACKING');
  const [isTargetFound, setIsTargetFound] = useState(false);
  const [mindarLoading, setMindarLoading] = useState(false);
  const [mindarError, setMindarError] = useState<string | null>(null);
  const mindarContainerRef = useRef<HTMLDivElement>(null);
  const mindarThreeRef = useRef<any>(null);

  // 3D references
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const mindarAnchorGroupRef = useRef<THREE.Group | null>(null);

  // Touch tracking for AR mode
  const touchStartRef = useRef<{ x: number; y: number; dist?: number; angle?: number } | null>(null);

  // Fetch project
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/public/${slug}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Proyek tidak ditemukan');
        }
        const data = await res.json();
        setProject(data.project);

        const shareUrl = window.location.href;
        const qr = await QRCode.toDataURL(shareUrl, { width: 280, margin: 2 });
        setQrCodeUrl(qr);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat proyek');
      } finally {
        setLoading(false);
      }
    }

    if (slug) loadProject();
  }, [slug]);

  // Reusable helper to build scene 3D objects into a group (shared between OrbitControls and MindAR Anchor)
  const buildObjectsIntoGroup = useCallback((targetGroup: THREE.Group, sceneObjects: any[]) => {
    sceneObjects.forEach((obj: any) => {
      const transform = typeof obj.transform === 'string' ? JSON.parse(obj.transform) : obj.transform;
      const properties = typeof obj.properties === 'string' ? JSON.parse(obj.properties) : obj.properties;
      const trigger = typeof obj.trigger === 'string' ? JSON.parse(obj.trigger) : obj.trigger;
      const animation = typeof obj.animation === 'string' ? JSON.parse(obj.animation) : obj.animation;

      const color = properties?.color || '#6366f1';
      const roughness = properties?.roughness ?? 0.3;
      const metalness = properties?.metalness ?? 0.7;
      const wireframe = properties?.wireframe ?? false;

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness,
        metalness,
        wireframe
      });

      let createdMesh: THREE.Object3D | null = null;

      if (obj.type === 'GEOMETRY') {
        let geo: THREE.BufferGeometry;
        switch (properties?.geometry) {
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
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        createdMesh = mesh;
      } else if (obj.type === '3D_MODEL' && obj.asset?.fileUrl) {
        const loader = new GLTFLoader();
        loader.load(
          obj.asset.fileUrl,
          (gltf) => {
            const m = gltf.scene;
            const pos = transform?.position || [0, 0, 0];
            const rot = transform?.rotation || [0, 0, 0];
            const scl = transform?.scale || [1, 1, 1];
            m.position.set(pos[0], pos[1], pos[2]);
            m.rotation.set(rot[0], rot[1], rot[2]);
            m.scale.set(scl[0], scl[1], scl[2]);

            m.userData = {
              trigger,
              animation,
              basePos: m.position.clone(),
              baseRot: m.rotation.clone(),
              baseScale: m.scale.clone(),
              type: '3D_MODEL'
            };
            targetGroup.add(m);
          },
          undefined,
          () => {
            const fallback = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
            const pos = transform?.position || [0, 0.5, 0];
            fallback.position.set(pos[0], pos[1], pos[2]);
            fallback.userData = {
              trigger,
              animation,
              basePos: fallback.position.clone(),
              baseRot: fallback.rotation.clone(),
              baseScale: fallback.scale.clone(),
              type: '3D_MODEL'
            };
            targetGroup.add(fallback);
          }
        );
        return;
      } else if (obj.type === 'TEXT_3D') {
        const text = properties?.text || 'AR BM3';
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

          ctx.font = 'bold 50px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, 256, 128);
        }
        const texture = new THREE.CanvasTexture(canvas);
        const textMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
        createdMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), textMat);
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
          createdMesh = planeMesh;
        } else {
          const textureLoader = new THREE.TextureLoader();
          const planeMesh = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
          textureLoader.load(obj.asset.fileUrl, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            if (tex.image && tex.image.width && tex.image.height) {
              const aspect = tex.image.width / tex.image.height;
              planeMesh.scale.x *= aspect;
            }
            planeMesh.material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
          });
          createdMesh = planeMesh;
        }
      } else if (obj.type === 'VIDEO' && obj.asset?.fileUrl) {
        const video = document.createElement('video');
        video.src = obj.asset.fileUrl;
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.play().catch(() => {});

        const videoTexture = new THREE.VideoTexture(video);
        videoTexture.colorSpace = THREE.SRGBColorSpace;
        const videoMat = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide });
        const videoMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), videoMat);
        videoMesh.userData = { videoElement: video, type: 'VIDEO' };
        createdMesh = videoMesh;
      } else if (obj.type === 'AUDIO' && obj.asset?.fileUrl) {
        const audio = new Audio(obj.asset.fileUrl);
        audio.loop = true;

        const audioGroup = new THREE.Group();
        const sphereGeo = new THREE.SphereGeometry(0.35, 24, 24);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color || '#06b6d4'),
          emissive: new THREE.Color(color || '#06b6d4'),
          emissiveIntensity: 0.35,
          metalness: 0.8,
          roughness: 0.2
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        audioGroup.add(sphere);

        const ringGeo = new THREE.TorusGeometry(0.5, 0.04, 16, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#38bdf8'), wireframe: true });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        audioGroup.add(ring);

        audioGroup.userData = { audioElement: audio, type: 'AUDIO' };
        createdMesh = audioGroup;
      }

      if (createdMesh) {
        const pos = transform?.position || [0, 0.5, 0];
        const rot = transform?.rotation || [0, 0, 0];
        const scl = transform?.scale || [1, 1, 1];
        createdMesh.position.set(pos[0], pos[1], pos[2]);
        createdMesh.rotation.set(rot[0], rot[1], rot[2]);
        createdMesh.scale.set(scl[0], scl[1], scl[2]);

        createdMesh.userData = {
          ...createdMesh.userData,
          trigger,
          animation,
          basePos: createdMesh.position.clone(),
          baseRot: createdMesh.rotation.clone(),
          baseScale: createdMesh.scale.clone(),
          type: createdMesh.userData?.type || obj.type
        };
        targetGroup.add(createdMesh);
      }
    });
  }, []);

  // Setup 3D Scene
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount || !project) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const currentScene = project.scenes?.[currentSceneIndex] || project.scenes?.[0];
    const bgColor = currentScene?.backgroundColor || '#0f111a';
    if (viewerMode === '3D') {
      scene.background = new THREE.Color(bgColor);
    } else {
      scene.background = null; // Transparent for AR camera overlay
    }

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 4.5);
    cameraRef.current = camera;

    // 3. Renderer with alpha: true for AR
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate && viewerMode === '3D';
    controls.autoRotateSpeed = 2.0;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(4, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6366f1, 2, 10);
    pointLight.position.set(-3, 3, -3);
    scene.add(pointLight);

    // Ground plane in 3D mode
    if (viewerMode === '3D') {
      const grid = new THREE.GridHelper(10, 20, 0x6366f1, 0x1e2438);
      grid.position.y = 0;
      scene.add(grid);
    }

    // 6. Build Model Group from Active Scene Objects
    const modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;
    scene.add(modelGroup);

    const activeScene = project.scenes?.[currentSceneIndex] || project.scenes?.[0];
    buildObjectsIntoGroup(modelGroup, activeScene?.objects || []);

    // 7. Raycaster for Interactive Clicks & Triggers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (!renderer.domElement) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const targets: THREE.Object3D[] = [];
      if (modelGroupRef.current) targets.push(modelGroupRef.current);
      if (mindarAnchorGroupRef.current) targets.push(mindarAnchorGroupRef.current);

      const intersects = raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        let curr: THREE.Object3D | null = intersects[0].object;
        while (curr && curr !== scene) {
          if (curr.userData) {
            const trig = curr.userData.trigger;
            if (trig && trig.type && trig.type !== 'NONE') {
              if (trig.type === 'OPEN_URL' && trig.targetUrl) {
                window.open(trig.targetUrl, '_blank');
                return;
              } else if (trig.type === 'SWITCH_SCENE' && trig.targetSceneIndex !== undefined) {
                setCurrentSceneIndex(Number(trig.targetSceneIndex));
                return;
              } else if (trig.type === 'TOGGLE_AUDIO' && curr.userData.audioElement) {
                const aud = curr.userData.audioElement as HTMLAudioElement;
                if (aud.paused) {
                  aud.play().catch(() => {});
                } else {
                  aud.pause();
                }
                return;
              }
            }

            if (curr.userData.type === 'VIDEO' && curr.userData.videoElement) {
              const vid = curr.userData.videoElement as HTMLVideoElement;
              if (vid.paused) {
                vid.play().catch(() => {});
              } else {
                vid.pause();
              }
              return;
            }

            if (curr.userData.type === 'AUDIO' && curr.userData.audioElement) {
              const aud = curr.userData.audioElement as HTMLAudioElement;
              if (aud.paused) {
                aud.play().catch(() => {});
              } else {
                aud.pause();
              }
              return;
            }
          }
          curr = curr.parent;
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

    // Animation Loop with Continuous Animations and GIFs
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (viewerMode === '3D') {
        controls.update();
      }

      const time = clock.getElapsedTime();

      const updateGroupAnimations = (grp: THREE.Group | null) => {
        if (!grp) return;
        grp.traverse((child) => {
          if (child.userData?.animation && child.userData.animation.type !== 'NONE') {
            const anim = child.userData.animation;
            const spd = Number(anim.speed) || 1.0;
            const bp = child.userData.basePos;
            const br = child.userData.baseRot;
            const bs = child.userData.baseScale;

            if (anim.type === 'SPIN' && br) {
              child.rotation.y = br.y + time * spd * 2;
            } else if (anim.type === 'BOUNCE' && bp) {
              child.position.y = bp.y + Math.abs(Math.sin(time * spd * 3)) * 0.35;
            } else if (anim.type === 'PULSE' && bs) {
              const factor = 1 + Math.sin(time * spd * 4) * 0.15;
              child.scale.set(bs.x * factor, bs.y * factor, bs.z * factor);
            }
          }

          if (child.userData?.isGif && child.userData.gifImg?.complete) {
            const { gifImg, gifCanvas, gifCtx, gifTexture } = child.userData;
            if (gifCtx && gifImg.naturalWidth > 0) {
              gifCtx.clearRect(0, 0, gifCanvas.width, gifCanvas.height);
              gifCtx.drawImage(gifImg, 0, 0, gifCanvas.width, gifCanvas.height);
              gifTexture.needsUpdate = true;
            }
          }
        });
      };

      updateGroupAnimations(modelGroupRef.current);
      updateGroupAnimations(mindarAnchorGroupRef.current);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [project, viewerMode, buildObjectsIntoGroup]);

  // Toggle Auto-Rotate in 3D Mode
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate && viewerMode === '3D';
    }
  }, [autoRotate, viewerMode]);

  // Sync AR scale and rotation into model group
  useEffect(() => {
    if (modelGroupRef.current && viewerMode === 'AR') {
      modelGroupRef.current.scale.set(arScale, arScale, arScale);
      modelGroupRef.current.rotation.y = arRotationY;
    }
  }, [arScale, arRotationY, viewerMode]);

  // Dynamic Multi-Scene Switcher (Sync objects into 3D and AR Anchor when slide changes)
  useEffect(() => {
    if (!project || !project.scenes) return;
    const currentScene = project.scenes[currentSceneIndex] || project.scenes[0];
    if (!currentScene) return;

    if (viewerMode === '3D' && sceneRef.current) {
      sceneRef.current.background = new THREE.Color(currentScene.backgroundColor || '#0f111a');
    }

    if (modelGroupRef.current) {
      while (modelGroupRef.current.children.length > 0) {
        modelGroupRef.current.remove(modelGroupRef.current.children[0]);
      }
      buildObjectsIntoGroup(modelGroupRef.current, currentScene.objects || []);
    }

    if (mindarAnchorGroupRef.current) {
      while (mindarAnchorGroupRef.current.children.length > 0) {
        mindarAnchorGroupRef.current.remove(mindarAnchorGroupRef.current.children[0]);
      }
      buildObjectsIntoGroup(mindarAnchorGroupRef.current, currentScene.objects || []);
    }
  }, [currentSceneIndex, project, viewerMode, buildObjectsIntoGroup]);

  // Start MindAR Image Tracking Engine
  const startMindARTracking = async () => {
    setMindarLoading(true);
    setMindarError(null);
    setIsTargetFound(false);

    // Stop any existing stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    if (mindarThreeRef.current) {
      try {
        mindarThreeRef.current.renderer?.setAnimationLoop(null);
        mindarThreeRef.current.stop();
      } catch (e) {}
      mindarThreeRef.current = null;
    }

    // Determine target .mind file URL
    let targetMindUrl = project?.marker?.patternUrl;
    if (!targetMindUrl || !targetMindUrl.endsWith('.mind')) {
      targetMindUrl = '/markers/card.mind';
    }

    try {
      const { MindARThree } = await import('mindar-image-three');

      if (!mindarContainerRef.current) {
        throw new Error('Container MindAR belum siap');
      }

      // Empty container before re-init
      mindarContainerRef.current.innerHTML = '';

      const mindarThree = new MindARThree({
        container: mindarContainerRef.current,
        imageTargetSrc: targetMindUrl,
        uiLoading: "no",
        uiScanning: "no"
      });
      mindarThreeRef.current = mindarThree;

      const { renderer, scene, camera } = mindarThree;

      // Lights in MindAR scene
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambientLight);
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight.position.set(3, 7, 4);
      scene.add(dirLight);

      // Create Anchor 0
      const anchor = mindarThree.addAnchor(0);
      const contentGroup = new THREE.Group();
      mindarAnchorGroupRef.current = contentGroup;

      const isVertical = project?.marker?.orientation === 'VERTICAL';
      if (!isVertical) {
        // Horizontal: rotate 90 degrees around X so object stands up on table card
        contentGroup.rotation.x = Math.PI / 2;
      }

      // Populate 3D scene objects onto the anchor
      const activeScene = project.scenes?.[currentSceneIndex] || project.scenes?.[0];
      const sceneObjects = activeScene?.objects || [];
      buildObjectsIntoGroup(contentGroup, sceneObjects);

      anchor.group.add(contentGroup);

      anchor.onTargetFound = () => {
        setIsTargetFound(true);
      };

      anchor.onTargetLost = () => {
        setIsTargetFound(false);
      };

      await mindarThree.start();

      const mindarClock = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const time = mindarClock.getElapsedTime();
        if (mindarAnchorGroupRef.current) {
          mindarAnchorGroupRef.current.traverse((child) => {
            if (child.userData?.animation && child.userData.animation.type !== 'NONE') {
              const anim = child.userData.animation;
              const spd = Number(anim.speed) || 1.0;
              const bp = child.userData.basePos;
              const br = child.userData.baseRot;
              const bs = child.userData.baseScale;

              if (anim.type === 'SPIN' && br) {
                child.rotation.y = br.y + time * spd * 2;
              } else if (anim.type === 'BOUNCE' && bp) {
                child.position.y = bp.y + Math.abs(Math.sin(time * spd * 3)) * 0.35;
              } else if (anim.type === 'PULSE' && bs) {
                const factor = 1 + Math.sin(time * spd * 4) * 0.15;
                child.scale.set(bs.x * factor, bs.y * factor, bs.z * factor);
              }
            }

            if (child.userData?.isGif && child.userData.gifImg?.complete) {
              const { gifImg, gifCanvas, gifCtx, gifTexture } = child.userData;
              if (gifCtx && gifImg.naturalWidth > 0) {
                gifCtx.clearRect(0, 0, gifCanvas.width, gifCanvas.height);
                gifCtx.drawImage(gifImg, 0, 0, gifCanvas.width, gifCanvas.height);
                gifTexture.needsUpdate = true;
              }
            }
          });
        }
        renderer.render(scene, camera);
      });

      setCameraActive(true);
      setViewerMode('AR');
      setArTrackingType('IMAGE_TRACKING');
      setAutoRotate(false);
    } catch (err: any) {
      console.error('MindAR error:', err);
      setMindarError(err.message || 'Gagal memuat engine MindAR');
      // Fallback to Free Touch AR
      startFreeTouchAR();
    } finally {
      setMindarLoading(false);
    }
  };

  // Start Free Touch AR Mode (Camera video pass-through without physical marker)
  const startFreeTouchAR = async () => {
    setCameraError(null);
    setIsTargetFound(false);

    // Stop MindAR if active
    if (mindarThreeRef.current) {
      try {
        mindarThreeRef.current.renderer?.setAnimationLoop(null);
        mindarThreeRef.current.stop();
      } catch (e) {}
      mindarThreeRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setViewerMode('AR');
        setArTrackingType('FREE_TOUCH');
        setAutoRotate(false);

        // Position content in front of camera
        const isVertical = project?.marker?.orientation === 'VERTICAL';
        if (modelGroupRef.current) {
          if (isVertical) {
            modelGroupRef.current.position.set(0, 0, 0);
            modelGroupRef.current.rotation.set(0, 0, 0);
          } else {
            modelGroupRef.current.position.set(0, -0.25, 0);
            modelGroupRef.current.rotation.set(-0.25, 0, 0);
          }
        }

        if (cameraRef.current) {
          cameraRef.current.position.set(0, 0, 3.5);
          cameraRef.current.lookAt(0, 0, 0);
        }
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Izin akses kamera ditolak atau perangkat tidak memiliki kamera.');
    }
  };

  // Main AR Mode Starter: defaults to MindAR Image Tracking
  const startARMode = (type?: 'IMAGE_TRACKING' | 'FREE_TOUCH') => {
    const selected = type || arTrackingType || 'IMAGE_TRACKING';
    if (selected === 'IMAGE_TRACKING') {
      startMindARTracking();
    } else {
      startFreeTouchAR();
    }
  };

  // Stop Camera & Return to 3D Orbit Mode
  const stopARMode = () => {
    if (mindarThreeRef.current) {
      try {
        mindarThreeRef.current.renderer?.setAnimationLoop(null);
        mindarThreeRef.current.stop();
      } catch (e) {}
      mindarThreeRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setIsTargetFound(false);
    setViewerMode('3D');

    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 2, 4.5);
    }
  };

  // Take High-Res Photo Snapshot combining Camera + 3D Canvas
  const capturePhotoSnapshot = () => {
    const video = videoRef.current;
    const renderer = rendererRef.current;
    if (!renderer) return;

    const snapCanvas = document.createElement('canvas');
    const width = window.innerWidth;
    const height = window.innerHeight;
    snapCanvas.width = width;
    snapCanvas.height = height;
    const ctx = snapCanvas.getContext('2d');
    if (!ctx) return;

    if (viewerMode === 'AR' && video && cameraActive) {
      ctx.drawImage(video, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#0f111a';
      ctx.fillRect(0, 0, width, height);
    }

    // Render 3D canvas on top
    ctx.drawImage(renderer.domElement, 0, 0, width, height);

    // Watermark tag
    ctx.fillStyle = 'rgba(10, 12, 20, 0.7)';
    ctx.roundRect ? ctx.roundRect(width - 240, height - 60, 220, 44, 8) : ctx.fillRect(width - 240, height - 60, 220, 44);
    ctx.fill();
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('AR STUDIO BM3', width - 225, height - 32);

    const dataUrl = snapCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ar-photo-${project.slug}-${Date.now()}.png`;
    a.click();

    setPhotoSaved(true);
    setTimeout(() => setPhotoSaved(false), 2500);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Touch Gesture handlers for interactive AR mode
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked || viewerMode !== 'AR') return;
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isLocked || viewerMode !== 'AR' || !touchStartRef.current) return;

    if (e.touches.length === 1 && modelGroupRef.current) {
      // Drag move object in X/Y plane
      const dx = (e.touches[0].clientX - touchStartRef.current.x) * 0.005;
      const dy = (e.touches[0].clientY - touchStartRef.current.y) * 0.005;
      modelGroupRef.current.position.x += dx;
      modelGroupRef.current.position.y -= dy;
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      // Pinch to scale
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const factor = newDist / touchStartRef.current.dist;
      setArScale((prev) => Math.min(3.5, Math.max(0.3, prev * factor)));
      touchStartRef.current.dist = newDist;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b10' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '3rem', height: '3rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1.25rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>Memuat Pengalaman 3D / AR...</div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#0a0b10' }}>
        <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <Box size={44} color="#f87171" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Konten Tidak Ditemukan</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {error || 'Tautan proyek mungkin sudah dihapus atau tidak valid.'}
          </p>
          <Link href="/" className="btn btn-primary">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#07080d', touchAction: 'none' }}
    >
      {/* MindAR Container (Used for real Image Tracking WebAR engine) */}
      <div
        ref={mindarContainerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: viewerMode === 'AR' && arTrackingType === 'IMAGE_TRACKING' ? 'block' : 'none',
          zIndex: 2
        }}
      />

      {/* Background Video Element for Free Touch AR Mode */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: viewerMode === 'AR' && arTrackingType === 'FREE_TOUCH' && cameraActive ? 'block' : 'none',
          zIndex: 1
        }}
      />

      {/* Three.js Canvas Container (Active in 3D orbit mode or Free Touch AR) */}
      <div
        ref={canvasMountRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: viewerMode === '3D' || arTrackingType === 'FREE_TOUCH' ? 'block' : 'none',
          zIndex: 5
        }}
      />

      {/* AR View Reticle & Image Tracking Feedback */}
      {viewerMode === 'AR' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(280px, 78vw)',
          height: 'min(280px, 78vw)',
          border: isTargetFound ? '3px solid #10b981' : '2px solid rgba(6, 182, 212, 0.85)',
          boxShadow: isTargetFound ? '0 0 35px rgba(16, 185, 129, 0.65)' : '0 0 25px rgba(6, 182, 212, 0.35)',
          borderRadius: 'var(--radius-lg)',
          pointerEvents: 'none',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem',
          background: isTargetFound ? 'rgba(16, 185, 129, 0.08)' : 'rgba(6, 182, 212, 0.04)',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* Top Reticle Header */}
          <div style={{
            background: 'rgba(10, 12, 20, 0.85)',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            border: isTargetFound ? '1px solid #10b981' : '1px solid rgba(6, 182, 212, 0.4)',
            fontSize: '0.6875rem',
            color: isTargetFound ? '#34d399' : 'var(--accent-light)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {isTargetFound ? (
              <>
                <CheckCircle2 size={13} color="#34d399" />
                <span>🎯 Target Terdeteksi!</span>
              </>
            ) : (
              <>
                <Sparkles size={12} />
                <span>Target: {markerName}</span>
              </>
            )}
          </div>

          {/* Center Watermark & Scanline */}
          <div style={{ position: 'relative', width: 'min(120px, 35vw)', height: 'min(120px, 35vw)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={markerImage}
              alt="Target Outline"
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
                opacity: isTargetFound ? 0.85 : 0.45,
                filter: isTargetFound ? 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.8))' : 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))',
                transition: 'all 0.3s'
              }}
            />
            
            {/* Animated Laser Scanline (only when searching) */}
            {!isTargetFound && (
              <div style={{
                position: 'absolute',
                top: '15%',
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)',
                boxShadow: '0 0 8px #06b6d4',
                animation: 'pulseSlow 1.8s infinite alternate'
              }} />
            )}
          </div>

          {/* Bottom Reticle Footer */}
          <div style={{
            background: 'rgba(10, 12, 20, 0.85)',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.625rem',
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.25,
            maxWidth: '95%'
          }}>
            {isTargetFound ? (
              <span style={{ color: '#34d399', fontWeight: 600 }}>
                ✓ Konten 3D terkunci di atas marker fisik
              </span>
            ) : (
              <>
                Arahkan kamera ke target marker gambar fisik
                <div style={{ color: 'var(--accent-light)', fontSize: '0.5625rem', marginTop: '2px' }}>
                  Orientasi: {(project.marker?.orientation || 'HORIZONTAL') === 'HORIZONTAL' ? '⬒ Horizontal (Meja)' : '▮ Vertical (Dinding)'}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MindAR Loading Overlay */}
      {mindarLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10, 12, 20, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          textAlign: 'center',
          zIndex: 50
        }}>
          <div className="animate-spin" style={{ width: '2.5rem', height: '2.5rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', marginBottom: '1rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Memulai Engine MindAR Image Tracking...</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Menginisialisasi kamera & fitur penjejakan visual WebAR</div>
        </div>
      )}

      {/* Floating AR Mode Switcher Pill */}
      {viewerMode === 'AR' && (
        <div style={{
          position: 'absolute',
          top: 'calc(max(0.75rem, env(safe-area-inset-top, 0.75rem)) + 3.25rem)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: 'rgba(10, 12, 20, 0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '0.3rem',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
          zIndex: 30,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          maxWidth: '92vw'
        }}>
          <button
            onClick={() => {
              if (arTrackingType !== 'IMAGE_TRACKING') {
                startARMode('IMAGE_TRACKING');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: arTrackingType === 'IMAGE_TRACKING' ? 'var(--accent)' : 'transparent',
              color: arTrackingType === 'IMAGE_TRACKING' ? '#000000' : 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}
          >
            <Target size={13} /> MindAR Image
          </button>
          <button
            onClick={() => {
              if (arTrackingType !== 'FREE_TOUCH') {
                startARMode('FREE_TOUCH');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: arTrackingType === 'FREE_TOUCH' ? 'var(--primary)' : 'transparent',
              color: arTrackingType === 'FREE_TOUCH' ? '#ffffff' : 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}
          >
            <Move size={13} /> Free Touch
          </button>
        </div>
      )}

      {/* Floating Top Header */}
      <div style={{
        position: 'absolute',
        top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))',
        left: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
        right: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        pointerEvents: 'none'
      }}>
        {/* Project Badge & Title */}
        <div style={{
          padding: '0.45rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(10, 12, 20, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          pointerEvents: 'auto',
          maxWidth: 'calc(100vw - 150px)',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            flexShrink: 0,
            background: viewerMode === 'AR' ? 'var(--accent)' : 'var(--primary)',
            boxShadow: viewerMode === 'AR' ? '0 0 10px var(--accent)' : '0 0 10px var(--primary)'
          }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.title}
          </span>
          <span className="badge hide-on-mobile" style={{ fontSize: '0.6875rem', background: 'rgba(255,255,255,0.08)' }}>
            {viewerMode === 'AR' ? 'Live AR' : '3D Orbit'}
          </span>
        </div>

        {/* Right Action Icons */}
        <div style={{ display: 'flex', gap: '0.35rem', pointerEvents: 'auto' }}>
          <button
            onClick={() => setShowMobileScanModal(true)}
            className="btn btn-primary"
            style={{
              fontSize: '0.8125rem',
              padding: '0.45rem 0.85rem',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600
            }}
            title="Buka Viewer di HP & Pindai Marker Target"
          >
            <Smartphone size={15} /> <span>Buka di HP & Target</span>
          </button>

          <button
            onClick={() => setShowMarkerGuide(true)}
            className="btn btn-secondary hide-on-mobile"
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.75rem', background: 'rgba(10, 12, 20, 0.85)', backdropFilter: 'blur(12px)' }}
            title="Lihat Target Gambar AR Fisik"
          >
            <Eye size={15} /> <span>Target AR</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="btn btn-secondary hide-on-mobile"
            style={{ padding: '0.45rem', background: 'rgba(10, 12, 20, 0.85)', backdropFilter: 'blur(12px)' }}
            title="Mode Layar Penuh"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.75rem', background: 'rgba(10, 12, 20, 0.85)', backdropFilter: 'blur(12px)' }}
          >
            <Share2 size={15} /> <span className="hide-on-mobile">Bagikan</span>
          </button>
        </div>
      </div>

      {/* Floating Multi-Slide Navigation */}
      {project.scenes && project.scenes.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(max(1.25rem, env(safe-area-inset-bottom, 1.25rem)) + 62px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(10, 12, 20, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '9999px',
          padding: '0.35rem 0.65rem',
          zIndex: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          maxWidth: '92vw'
        }}>
          <button
            onClick={() => setCurrentSceneIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentSceneIndex === 0}
            style={{
              background: 'transparent',
              border: 'none',
              color: currentSceneIndex === 0 ? 'rgba(255,255,255,0.25)' : '#ffffff',
              cursor: currentSceneIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem'
            }}
            title="Slide Sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Slide pills / indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', maxWidth: '70vw' }}>
            {project.scenes.map((s: any, idx: number) => (
              <button
                key={s.id || idx}
                onClick={() => setCurrentSceneIndex(idx)}
                style={{
                  height: '24px',
                  padding: '0 0.55rem',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: currentSceneIndex === idx ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  color: currentSceneIndex === idx ? '#ffffff' : 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{idx + 1}</span>
                <span className="hide-on-mobile" style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.name || `Slide ${idx + 1}`}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentSceneIndex((prev) => Math.min(project.scenes.length - 1, prev + 1))}
            disabled={currentSceneIndex === project.scenes.length - 1}
            style={{
              background: 'transparent',
              border: 'none',
              color: currentSceneIndex === project.scenes.length - 1 ? 'rgba(255,255,255,0.25)' : '#ffffff',
              cursor: currentSceneIndex === project.scenes.length - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem'
            }}
            title="Slide Berikutnya"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Floating Bottom Controls */}
      <div style={{
        position: 'absolute',
        bottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        zIndex: 20,
        maxWidth: '94vw'
      }}>
        {viewerMode === '3D' ? (
          <>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1rem', minHeight: '44px', background: 'rgba(10, 12, 20, 0.85)', backdropFilter: 'blur(16px)' }}
              title={autoRotate ? 'Hentikan Putaran Otomatis' : 'Putar Otomatis'}
            >
              <RotateCw size={17} color={autoRotate ? 'var(--primary-light)' : 'currentColor'} />
            </button>

            <button
              onClick={() => startARMode('IMAGE_TRACKING')}
              className="btn btn-accent"
              style={{
                padding: '0.75rem 1.5rem',
                minHeight: '44px',
                fontSize: '0.9375rem',
                fontWeight: 700,
                boxShadow: 'var(--shadow-neon)'
              }}
            >
              <Camera size={18} /> Lihat dalam AR
            </button>
          </>
        ) : (
          <>
            {/* AR Control Buttons */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className="btn btn-secondary"
              style={{
                padding: '0.625rem 0.75rem',
                minHeight: '44px',
                background: isLocked ? 'rgba(16, 185, 129, 0.25)' : 'rgba(10, 12, 20, 0.85)',
                border: isLocked ? '1px solid #34d399' : '1px solid var(--border-subtle)',
                backdropFilter: 'blur(16px)'
              }}
              title={isLocked ? 'Buka Kunci Posisi' : 'Kunci Posisi Objek'}
            >
              {isLocked ? <Lock size={17} color="#34d399" /> : <Unlock size={17} />}
            </button>

            <button
              onClick={capturePhotoSnapshot}
              className="btn btn-primary"
              style={{ padding: '0.625rem 1rem', minHeight: '44px', fontSize: '0.8125rem' }}
              title="Ambil Foto AR"
            >
              <Download size={16} /> <span>{photoSaved ? 'Tersimpan!' : 'Foto AR'}</span>
            </button>

            <button
              onClick={() => setShowMarkerGuide(true)}
              className="btn btn-secondary"
              style={{ padding: '0.625rem 0.875rem', minHeight: '44px', background: 'rgba(10, 12, 20, 0.85)', backdropFilter: 'blur(16px)', fontSize: '0.8125rem' }}
              title="Tampilkan Target Marker Fisik"
            >
              <Eye size={16} /> <span>Target</span>
            </button>

            <button
              onClick={stopARMode}
              className="btn btn-secondary"
              style={{ padding: '0.625rem 1rem', minHeight: '44px', background: 'rgba(10, 12, 20, 0.9)', backdropFilter: 'blur(16px)', fontSize: '0.8125rem' }}
            >
              <X size={16} /> <span>Tutup AR</span>
            </button>
          </>
        )}
      </div>

      {/* Camera Error Alert */}
      {cameraError && (
        <div style={{
          position: 'absolute',
          top: '5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--danger-bg)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1.25rem',
          color: '#fca5a5',
          fontSize: '0.8125rem',
          zIndex: 30,
          maxWidth: '90%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Info size={16} />
          <span>{cameraError}</span>
          <button onClick={() => setCameraError(null)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', marginLeft: '0.5rem' }}>
            &times;
          </button>
        </div>
      )}

      {/* Marker Image Drawer / Modal */}
      {showMarkerGuide && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '460px', width: '100%', padding: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>🎯 Visual Target AR Marker</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {markerName} • {markerOrientation === 'HORIZONTAL' ? 'Horizontal (Meja)' : 'Vertical (Dinding)'}
                </div>
              </div>
              <button onClick={() => setShowMarkerGuide(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Arahkan kamera ponsel Anda ke gambar target ini untuk memunculkan konten visual 3D:
            </p>

            <div style={{
              background: '#ffffff',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              marginBottom: '1.25rem',
              border: '3px solid #000000',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}>
              <img
                src={markerImage}
                alt="Marker AR"
                style={{ width: '220px', height: '220px', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Screen Target Mode button */}
              <button
                onClick={() => {
                  setShowMarkerGuide(false);
                  setScreenTargetMode(true);
                }}
                className="btn btn-accent"
                style={{ width: '100%', justifyContent: 'center' }}
                title="Buka gambar target di layar penuh agar bisa discan langsung dari ponsel tanpa cetak"
              >
                <Monitor size={15} /> Buka Mode Layar Penuh (Scan dari HP)
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    if (printWin) {
                      printWin.document.write(`
                        <html>
                          <head><title>Cetak Marker AR - ${markerName}</title></head>
                          <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center;">
                            <h2>TARGET AR: ${project.title}</h2>
                            <div style="border:4px solid #000; padding:20px; display:inline-block;">
                              <img src="${markerImage}" style="width:400px; height:400px; object-fit:contain;" />
                            </div>
                            <p style="margin-top:20px; font-weight:bold; font-size:16px;">AR STUDIO BM3</p>
                            <p style="color:#64748b; font-size:13px;">Buka tautan proyek di browser ponsel lalu arahkan kamera ke gambar ini!</p>
                            <script>window.onload = function() { window.print(); }<\/script>
                          </body>
                        </html>
                      `);
                      printWin.document.close();
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  <Printer size={15} /> Cetak Lembar A4
                </button>

                <a
                  href={markerImage}
                  target="_blank"
                  download="target-marker-ar.png"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  <Download size={15} /> Unduh Gambar
                </a>
              </div>

              <button onClick={() => setShowMarkerGuide(false)} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.25rem' }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Target Display (Point phone camera directly at monitor) */}
      {screenTargetMode && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#ffffff',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <button
            onClick={() => setScreenTargetMode(false)}
            className="btn btn-secondary"
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#0f172a', color: '#fff' }}
          >
            <X size={16} /> Tutup Mode Layar
          </button>

          <div style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: '0.35rem',
            textAlign: 'center'
          }}>
            🎯 TARGET AR MARKER AKTIF
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#475569',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            Arahkan kamera ponsel Anda ke gambar di layar monitor ini untuk memunculkan AR secara instan!
          </div>

          <div style={{
            padding: '1.5rem',
            border: '4px solid #000000',
            borderRadius: '8px',
            background: '#ffffff',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
          }}>
            <img
              src={markerImage}
              alt={markerName}
              style={{ width: '380px', height: '380px', maxHeight: '55vh', maxWidth: '80vw', objectFit: 'contain' }}
            />
          </div>

          <div style={{ marginTop: '1.25rem', fontSize: '0.8125rem', color: '#64748b' }}>
            Marker: <strong>{markerName}</strong> • Orientasi: {markerOrientation === 'HORIZONTAL' ? 'Horizontal (Meja)' : 'Vertical (Dinding)'}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Bagikan Pengalaman AR</h2>
              <button onClick={() => setShowShareModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '1.5rem' }}>
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '180px', height: '180px', margin: '0 auto', display: 'block' }} />
              )}
              <div style={{ color: '#0f172a', fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.5rem' }}>
                Pindai dengan kamera ponsel rekan kantor
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Tautan Publik Proyek</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="form-input"
                  style={{ fontSize: '0.8125rem' }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="btn btn-secondary"
                >
                  {copiedLink ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <button onClick={() => setShowShareModal(false)} className="btn btn-primary" style={{ width: '100%' }}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Mobile Scan & Target Marker Modal */}
      {project && (
        <MobileScanModal
          isOpen={showMobileScanModal}
          onClose={() => setShowMobileScanModal(false)}
          slug={slug}
          title={project.title}
          markerImage={markerImage}
          markerName={markerName}
          markerOrientation={markerOrientation}
        />
      )}
    </div>
  );
}
