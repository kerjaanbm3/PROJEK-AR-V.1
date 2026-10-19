'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface Props {
  modelType: string; // 'box' | 'sphere' | 'cylinder' | 'torus' | 'glb'
  modelUrl?: string | null;
  scale: number;
  rotationY: number;
  color: string;
  wireframe?: boolean;
}

export default function Simple3DPreview({
  modelType,
  modelUrl,
  scale,
  rotationY,
  color,
  wireframe = false,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshRef = useRef<THREE.Object3D | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#0f111a');

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.8, 3.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go completely under floor

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(3, 6, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6366f1, 2, 8);
    pointLight.position.set(-2, 2, -2);
    scene.add(pointLight);

    // Grid Floor
    const grid = new THREE.GridHelper(10, 20, 0x6366f1, 0x222638);
    grid.position.y = -0.01;
    scene.add(grid);

    // Marker representation on floor
    const planeGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x1e2438,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const markerPlane = new THREE.Mesh(planeGeo, planeMat);
    markerPlane.rotation.x = -Math.PI / 2;
    markerPlane.position.y = 0;
    scene.add(markerPlane);

    // Resize handler
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
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update or swap 3D object
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current = null;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.3,
      metalness: 0.7,
      wireframe
    });

    if (modelType === 'glb' && modelUrl) {
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(0, 0, 0);
          model.scale.set(scale, scale, scale);
          model.rotation.y = rotationY;
          scene.add(model);
          meshRef.current = model;
        },
        undefined,
        (err) => {
          console.warn('GLB load error, fallback to box:', err);
          const fallback = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
          fallback.position.set(0, 0.5 * scale, 0);
          fallback.scale.set(scale, scale, scale);
          scene.add(fallback);
          meshRef.current = fallback;
        }
      );
    } else {
      let geo: THREE.BufferGeometry;
      switch (modelType) {
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
          geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
          break;
      }

      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(0, 0.5 * scale, 0);
      mesh.scale.set(scale, scale, scale);
      mesh.rotation.y = rotationY;
      mesh.castShadow = true;
      scene.add(mesh);
      meshRef.current = mesh;
    }
  }, [modelType, modelUrl, scale, rotationY, color, wireframe]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}
    />
  );
}
