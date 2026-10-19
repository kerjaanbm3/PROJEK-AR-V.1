'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Move,
  RotateCw,
  Maximize2,
  Trash2,
  Copy,
  Share2,
  Check,
  Type,
  Box,
  Sun,
  Undo2,
  Redo2,
  Zap,
  ExternalLink,
  X,
  Image as ImageIcon,
  Film,
  Upload,
  FolderOpen,
  Sparkles,
  Search,
  QrCode,
  Printer,
  Plus,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Video,
  Layers,
  MousePointerClick,
  Play,
  Smartphone
} from 'lucide-react';
import QRCode from 'qrcode';
import Editor3DCanvas, { EditorObject } from '@/components/3d/Editor3DCanvas';
import MobileScanModal from '@/components/common/MobileScanModal';

export interface EditorScene {
  id: string;
  name: string;
  order: number;
  backgroundColor: string;
  objects: EditorObject[];
}

export default function DefaultEditorPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-Scene (Slides) & Active Scene
  const [scenes, setScenes] = useState<EditorScene[]>([]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [objects, setObjects] = useState<EditorObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [backgroundColor, setBackgroundColor] = useState('#0f111a');

  // History for Undo/Redo
  const [history, setHistory] = useState<EditorObject[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Tabs
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [assetModalTab, setAssetModalTab] = useState<'ALL' | 'MODEL_3D' | 'IMAGE' | 'GIF' | 'VIDEO' | 'AUDIO'>('ALL');
  const [assetSearch, setAssetSearch] = useState('');
  const [isUploadingDirect, setIsUploadingDirect] = useState(false);

  const [showMobileScanModal, setShowMobileScanModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Hidden direct file inputs for instant 1-click import from computer
  const photoInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const model3dInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const markerInputRef = useRef<HTMLInputElement>(null);

  // Load project & all scenes
  useEffect(() => {
    async function init() {
      try {
        const [projRes, markersRes, assetsRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch('/api/markers'),
          fetch('/api/assets')
        ]);

        let loadedMarkers: any[] = [];
        if (markersRes.ok) {
          const markersData = await markersRes.json();
          loadedMarkers = markersData.markers || [];
          setMarkers(loadedMarkers);
        }

        if (projRes.ok) {
          const projData = await projRes.json();
          setProject(projData.project);
          if (projData.project.markerId) {
            setSelectedMarkerId(projData.project.markerId);
          } else if (loadedMarkers.length > 0) {
            setSelectedMarkerId(loadedMarkers[0].id);
          }

          const rawScenes = projData.project.scenes || [];
          const parsedScenes: EditorScene[] = rawScenes.map((sc: any, idx: number) => ({
            id: sc.id || `temp_scene_${idx}`,
            name: sc.name || `Slide ${idx + 1}`,
            order: sc.order ?? idx,
            backgroundColor: sc.backgroundColor || '#0f111a',
            objects: (sc.objects || []).map((o: any) => ({
              id: o.id,
              name: o.name,
              type: o.type,
              assetId: o.assetId,
              asset: o.asset,
              transform: typeof o.transform === 'string' ? JSON.parse(o.transform) : o.transform,
              properties: typeof o.properties === 'string' ? JSON.parse(o.properties) : o.properties
            }))
          }));

          if (parsedScenes.length === 0) {
            parsedScenes.push({
              id: `temp_scene_0`,
              name: 'Slide 1',
              order: 0,
              backgroundColor: '#0f111a',
              objects: []
            });
          }

          setScenes(parsedScenes);
          setActiveSceneIndex(0);
          setBackgroundColor(parsedScenes[0].backgroundColor || '#0f111a');
          setObjects(parsedScenes[0].objects);
          setHistory([parsedScenes[0].objects]);
          setHistoryIndex(0);
          if (parsedScenes[0].objects.length > 0) {
            setSelectedObjectId(parsedScenes[0].objects[0].id);
          }
        }

        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          setAssets(assetsData.assets || []);
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) init();
  }, [id]);

  // Push history on state change
  const pushHistory = (newObjects: EditorObject[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newObjects);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  // Debounced auto-save to database sending ALL scenes
  const triggerAutoSave = useCallback(
    (currentScenesList?: EditorScene[], currentObjs?: EditorObject[], currentBg?: string) => {
      setSaveStatus('unsaved');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          const listToProcess = currentScenesList || scenes;
          const objsToUse = currentObjs || objects;
          const bgToUse = currentBg || backgroundColor;

          const scenesPayload = listToProcess.map((sc, idx) => {
            const isCurrent = idx === activeSceneIndex;
            return {
              id: sc.id?.startsWith('temp_') ? undefined : sc.id,
              name: sc.name || `Slide ${idx + 1}`,
              order: idx,
              backgroundColor: isCurrent ? bgToUse : sc.backgroundColor,
              objects: (isCurrent ? objsToUse : sc.objects).map((o) => ({
                id: o.id?.startsWith('temp_') ? undefined : o.id,
                name: o.name,
                type: o.type,
                assetId: o.assetId || null,
                transform: o.transform,
                properties: o.properties
              }))
            };
          });

          await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: project?.title,
              status: project?.status,
              scenes: scenesPayload
            })
          });

          setSaveStatus('saved');
        } catch (e) {
          console.error('Auto-save error:', e);
          setSaveStatus('unsaved');
        }
      }, 1000);
    },
    [id, project, scenes, activeSceneIndex, objects, backgroundColor]
  );

  // Scene Switching & Management
  const handleSwitchScene = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= scenes.length || newIndex === activeSceneIndex) return;

    // Snapshot current active scene before switching
    const updatedScenes = scenes.map((sc, idx) =>
      idx === activeSceneIndex
        ? { ...sc, backgroundColor, objects }
        : sc
    );

    const targetScene = updatedScenes[newIndex];
    setScenes(updatedScenes);
    setActiveSceneIndex(newIndex);
    setBackgroundColor(targetScene.backgroundColor);
    setObjects(targetScene.objects);
    setSelectedObjectId(targetScene.objects[0]?.id || null);
    setHistory([targetScene.objects]);
    setHistoryIndex(0);
    triggerAutoSave(updatedScenes, targetScene.objects, targetScene.backgroundColor);
  };

  const handleAddScene = () => {
    const updatedScenes = scenes.map((sc, idx) =>
      idx === activeSceneIndex
        ? { ...sc, backgroundColor, objects }
        : sc
    );

    const newIndex = updatedScenes.length;
    const newScene: EditorScene = {
      id: `temp_scene_${Date.now()}`,
      name: `Slide ${newIndex + 1}`,
      order: newIndex,
      backgroundColor: '#0f111a',
      objects: [
        {
          id: `temp_cube_${Date.now()}`,
          name: 'Kubus Baru',
          type: 'GEOMETRY',
          transform: { position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          properties: { geometry: 'box', color: '#6366f1', roughness: 0.3, metalness: 0.7 }
        },
        {
          id: `temp_light_${Date.now() + 1}`,
          name: 'Pencahayaan',
          type: 'LIGHT',
          transform: { position: [2, 4, 3], rotation: [0, 0, 0], scale: [1, 1, 1] },
          properties: { lightType: 'directional', color: '#ffffff', intensity: 1.5 }
        }
      ]
    };

    const nextScenes = [...updatedScenes, newScene];
    setScenes(nextScenes);
    setActiveSceneIndex(newIndex);
    setBackgroundColor(newScene.backgroundColor);
    setObjects(newScene.objects);
    setSelectedObjectId(newScene.objects[0].id);
    setHistory([newScene.objects]);
    setHistoryIndex(0);
    triggerAutoSave(nextScenes, newScene.objects, newScene.backgroundColor);
  };

  const handleDeleteScene = (indexToDelete: number) => {
    if (scenes.length <= 1) {
      alert('Proyek minimal harus memiliki 1 slide scene.');
      return;
    }
    const targetScene = scenes[indexToDelete];
    if (!confirm(`Hapus ${targetScene.name}?`)) return;

    const currentScenes = scenes.map((sc, idx) =>
      idx === activeSceneIndex
        ? { ...sc, backgroundColor, objects }
        : sc
    );

    const filtered = currentScenes.filter((_, idx) => idx !== indexToDelete);
    const reordered = filtered.map((sc, idx) => ({ ...sc, order: idx }));
    const nextIndex = Math.min(activeSceneIndex >= indexToDelete ? Math.max(0, activeSceneIndex - 1) : activeSceneIndex, reordered.length - 1);

    setScenes(reordered);
    setActiveSceneIndex(nextIndex);
    setBackgroundColor(reordered[nextIndex].backgroundColor);
    setObjects(reordered[nextIndex].objects);
    setSelectedObjectId(reordered[nextIndex].objects[0]?.id || null);
    setHistory([reordered[nextIndex].objects]);
    setHistoryIndex(0);
    triggerAutoSave(reordered, reordered[nextIndex].objects, reordered[nextIndex].backgroundColor);
  };

  const handleMoveScene = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= scenes.length) return;

    const currentScenes = scenes.map((sc, idx) =>
      idx === activeSceneIndex
        ? { ...sc, backgroundColor, objects }
        : sc
    );

    const nextList = [...currentScenes];
    const [moved] = nextList.splice(fromIndex, 1);
    nextList.splice(toIndex, 0, moved);
    const reordered = nextList.map((sc, idx) => ({ ...sc, order: idx }));

    setScenes(reordered);
    setActiveSceneIndex(toIndex);
    triggerAutoSave(reordered);
  };

  const handleRenameCurrentScene = (newName: string) => {
    const updatedScenes = scenes.map((sc, idx) =>
      idx === activeSceneIndex
        ? { ...sc, name: newName }
        : sc
    );
    setScenes(updatedScenes);
    triggerAutoSave(updatedScenes);
  };

  // Update object transform from 3D gizmo
  const handleUpdateTransform = (
    objId: string,
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => {
    setObjects((prev) => {
      const updated = prev.map((obj) => (obj.id === objId ? { ...obj, transform } : obj));
      triggerAutoSave(undefined, updated, backgroundColor);
      return updated;
    });
  };

  // Add Object Handlers
  const handleAddObject = (type: string, geometry?: string, asset?: any) => {
    const isImageOrGif = type === 'IMAGE' || asset?.type === 'IMAGE' || asset?.type === 'GIF';
    const isGif = asset?.fileUrl?.toLowerCase().endsWith('.gif') || asset?.type === 'GIF';
    const isVideo = type === 'VIDEO' || asset?.type === 'VIDEO';
    const isAudio = type === 'AUDIO' || asset?.type === 'AUDIO';

    let defaultName = 'Objek 3D';
    if (type === 'GEOMETRY') defaultName = `Objek ${geometry || 'Kubus'}`;
    else if (type === 'TEXT_3D') defaultName = 'Teks 3D Baru';
    else if (type === 'LIGHT') defaultName = 'Lampu Sorot';
    else if (isVideo) defaultName = asset?.name || 'Video 3D';
    else if (isAudio) defaultName = asset?.name || 'Audio 3D';
    else if (isGif) defaultName = asset?.name || 'Animasi GIF';
    else if (isImageOrGif) defaultName = asset?.name || 'Foto / Gambar';
    else defaultName = asset?.name || 'Model 3D';

    const newObj: EditorObject = {
      id: `temp_${Date.now()}`,
      name: defaultName,
      type: isVideo ? 'VIDEO' : isAudio ? 'AUDIO' : isImageOrGif ? 'IMAGE' : type === '3D_MODEL' ? '3D_MODEL' : type,
      assetId: asset?.id || null,
      asset: asset || null,
      transform: {
        position: [0, 0.75, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      },
      properties: {
        geometry: geometry || 'box',
        color: type === 'TEXT_3D' ? '#38bdf8' : '#6366f1',
        roughness: 0.3,
        metalness: 0.7,
        wireframe: false,
        text: type === 'TEXT_3D' ? 'KONTEN AR BM3' : undefined,
        width: 2,
        height: 2,
        animation: 'NONE',
        animSpeed: 1,
        trigger: { action: 'NONE' }
      }
    };

    const updated = [...objects, newObj];
    setObjects(updated);
    setSelectedObjectId(newObj.id);
    pushHistory(updated);
    triggerAutoSave(undefined, updated, backgroundColor);
  };

  // Direct 1-Click Upload and Add to 3D Scene
  const handleDirectUploadAndAdd = async (file: File, expectedType: 'IMAGE' | 'GIF' | 'MODEL_3D' | 'VIDEO' | 'AUDIO') => {
    setIsUploadingDirect(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.asset) {
        setAssets((prev) => [data.asset, ...prev]);
        if (expectedType === 'MODEL_3D') {
          handleAddObject('3D_MODEL', undefined, data.asset);
        } else if (expectedType === 'VIDEO') {
          handleAddObject('VIDEO', undefined, data.asset);
        } else if (expectedType === 'AUDIO') {
          handleAddObject('AUDIO', undefined, data.asset);
        } else {
          handleAddObject('IMAGE', undefined, data.asset);
        }
      } else {
        alert(data.error || 'Gagal mengunggah berkas');
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat mengunggah berkas');
    } finally {
      setIsUploadingDirect(false);
    }
  };

  const handleDeleteObject = (objId: string) => {
    const updated = objects.filter((o) => o.id !== objId);
    setObjects(updated);
    if (selectedObjectId === objId) {
      setSelectedObjectId(updated[0]?.id || null);
    }
    pushHistory(updated);
    triggerAutoSave(undefined, updated, backgroundColor);
  };

  const handleDuplicateObject = (objId: string) => {
    const target = objects.find((o) => o.id === objId);
    if (!target) return;

    const cloned: EditorObject = {
      ...target,
      id: `temp_${Date.now()}`,
      name: `${target.name} (Salinan)`,
      transform: {
        ...target.transform,
        position: [
          target.transform.position[0] + 0.4,
          target.transform.position[1],
          target.transform.position[2] + 0.4
        ]
      }
    };

    const updated = [...objects, cloned];
    setObjects(updated);
    setSelectedObjectId(cloned.id);
    pushHistory(updated);
    triggerAutoSave(undefined, updated, backgroundColor);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setObjects(history[newIdx]);
      triggerAutoSave(undefined, history[newIdx], backgroundColor);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setObjects(history[newIdx]);
      triggerAutoSave(undefined, history[newIdx], backgroundColor);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
      if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) handleDeleteObject(selectedObjectId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedObjectId) handleDuplicateObject(selectedObjectId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, objects, historyIndex]);

  // Open Share Modal
  const handleOpenShare = async () => {
    if (!project) return;
    const shareUrl = `${window.location.origin}/view/${project.slug}`;
    try {
      const qr = await QRCode.toDataURL(shareUrl, { width: 280, margin: 2 });
      setQrCodeUrl(qr);
      setShowShareModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Change project active marker
  const handleUpdateProjectMarker = async (markerId: string) => {
    setSelectedMarkerId(markerId);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markerId })
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      }
    } catch (e) {
      console.error('Update marker failed:', e);
    }
  };

  // Upload new custom marker directly from inside editor
  const handleUploadMarkerFromEditor = async (file: File, orient: 'HORIZONTAL' | 'VERTICAL' = 'HORIZONTAL') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('orientation', orient);
    formData.append('qualityScore', '90');
    formData.append('projectId', id);

    try {
      const res = await fetch('/api/markers', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setMarkers((prev) => [data.marker, ...prev]);
        setSelectedMarkerId(data.marker.id);
        setProject((prev: any) => ({ ...prev, markerId: data.marker.id, marker: data.marker }));
      }
    } catch (e) {
      console.error('Failed to upload marker from editor:', e);
    }
  };

  const selectedObject = objects.find((o) => o.id === selectedObjectId);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: '2.5rem', height: '2.5rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  const colorPresets = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ffffff', '#94a3b8'];

  // Filtered assets for modal
  const modalFilteredAssets = assets.filter((asset) => {
    const isGif = asset.fileUrl?.toLowerCase().endsWith('.gif') || asset.type === 'GIF' || asset.mimeType === 'image/gif';
    const isImage = (asset.type === 'IMAGE' || asset.mimeType?.startsWith('image/')) && !isGif;
    const is3D = asset.type === 'MODEL_3D';
    const isVideo = asset.type === 'VIDEO' || asset.fileUrl?.toLowerCase().endsWith('.mp4');
    const isAudio = asset.type === 'AUDIO' || asset.fileUrl?.toLowerCase().endsWith('.mp3');

    let matchesTab = true;
    if (assetModalTab === 'MODEL_3D') matchesTab = is3D;
    else if (assetModalTab === 'IMAGE') matchesTab = isImage;
    else if (assetModalTab === 'GIF') matchesTab = isGif;
    else if (assetModalTab === 'VIDEO') matchesTab = isVideo;
    else if (assetModalTab === 'AUDIO') matchesTab = isAudio;

    const matchesSearch = asset.name.toLowerCase().includes(assetSearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-darkest)' }}>
      {/* Hidden File Inputs for Direct 1-Click Import from Computer */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleDirectUploadAndAdd(e.target.files[0], 'IMAGE');
          }
        }}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={gifInputRef}
        accept="image/gif"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleDirectUploadAndAdd(e.target.files[0], 'GIF');
          }
        }}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={model3dInputRef}
        accept=".glb,.gltf,.obj"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleDirectUploadAndAdd(e.target.files[0], 'MODEL_3D');
          }
        }}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/mp4,video/webm"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleDirectUploadAndAdd(e.target.files[0], 'VIDEO');
          }
        }}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/mp3,audio/wav,audio/ogg"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleDirectUploadAndAdd(e.target.files[0], 'AUDIO');
          }
        }}
        style={{ display: 'none' }}
      />

      {/* Top Toolbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.625rem 1rem',
        background: 'rgba(10, 12, 20, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        {/* Left: Project title & Back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/dashboard" className="btn-icon" title="Kembali ke Dashboard">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                value={project?.title || ''}
                onChange={(e) => {
                  setProject({ ...project, title: e.target.value });
                  triggerAutoSave(undefined, objects, backgroundColor);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  width: 'min(180px, 40vw)'
                }}
              />
              <span className="hide-on-mobile" style={{ fontSize: '0.75rem', color: saveStatus === 'saved' ? '#34d399' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: saveStatus === 'saved' ? '#34d399' : 'var(--warning)' }} />
                {saveStatus === 'saved' ? 'Tersimpan otomatis' : saveStatus === 'saving' ? 'Menyimpan...' : 'Belum disimpan'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Transform Tools & History */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setTransformMode('translate')}
              title="Mode Geser / Move (W)"
              className={`btn-icon ${transformMode === 'translate' ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
            >
              <Move size={15} />
            </button>
            <button
              onClick={() => setTransformMode('rotate')}
              title="Mode Putar / Rotate (E)"
              className={`btn-icon ${transformMode === 'rotate' ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
            >
              <RotateCw size={15} />
            </button>
            <button
              onClick={() => setTransformMode('scale')}
              title="Mode Skala / Scale (R)"
              className={`btn-icon ${transformMode === 'scale' ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
            >
              <Maximize2 size={15} />
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 0.15rem' }} />

          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="btn-icon"
            style={{ padding: '0.4rem' }}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="btn-icon"
            style={{ padding: '0.4rem' }}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* Right: Mode Switch, Preview & Share */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowMobileScanModal(true)}
            className="btn btn-primary"
            style={{
              fontSize: '0.75rem',
              padding: '0.35rem 0.75rem',
              gap: '0.35rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.35)',
              color: '#ffffff',
              border: 'none'
            }}
            title="Buka Viewer di HP & Pindai Marker Target untuk Uji Coba Langsung"
          >
            <Smartphone size={13} /> <span>Uji di HP</span>
          </button>
          <button
            onClick={() => setShowMarkerModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', gap: '0.35rem' }}
            title="Atur target visual AR Marker untuk proyek ini"
          >
            <QrCode size={13} color="var(--primary-light)" /> <span className="hide-on-mobile">Target AR</span>
          </button>
          <Link
            href={`/editor/simple/${id}`}
            className="btn btn-secondary hide-on-mobile"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
          >
            <Zap size={13} /> Simple
          </Link>
          <button
            onClick={handleOpenShare}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            <Share2 size={13} /> <span>Bagikan</span>
          </button>
        </div>
      </header>

      {/* Slide / Scene Manager Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.45rem 1rem',
        background: 'rgba(12, 14, 24, 0.98)',
        borderBottom: '1px solid var(--border-subtle)',
        overflowX: 'auto',
        gap: '0.75rem',
        zIndex: 40
      }}>
        {/* Left: Slide selector tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.5rem', textTransform: 'uppercase' }}>
            <Layers size={14} color="var(--primary-light)" /> Slides:
          </div>

          {scenes.map((sc, idx) => {
            const isActive = idx === activeSceneIndex;
            return (
              <button
                key={sc.id || idx}
                onClick={() => handleSwitchScene(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>Slide {idx + 1}: {sc.name}</span>
              </button>
            );
          })}

          <button
            onClick={handleAddScene}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', gap: '0.3rem', whiteSpace: 'nowrap' }}
            title="Tambah Slide Baru"
          >
            <Plus size={13} /> Tambah Slide
          </button>
        </div>

        {/* Right: Active Slide Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {/* Slide Rename Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Nama:</span>
            <input
              type="text"
              value={scenes[activeSceneIndex]?.name || ''}
              onChange={(e) => handleRenameCurrentScene(e.target.value)}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                width: '130px'
              }}
            />
          </div>

          {/* Move Slide Left / Right */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => handleMoveScene(activeSceneIndex, activeSceneIndex - 1)}
              disabled={activeSceneIndex === 0}
              className="btn-icon"
              style={{ padding: '0.25rem', opacity: activeSceneIndex === 0 ? 0.3 : 1 }}
              title="Geser Slide ke Kiri"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => handleMoveScene(activeSceneIndex, activeSceneIndex + 1)}
              disabled={activeSceneIndex === scenes.length - 1}
              className="btn-icon"
              style={{ padding: '0.25rem', opacity: activeSceneIndex === scenes.length - 1 ? 0.3 : 1 }}
              title="Geser Slide ke Kanan"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Delete Current Slide */}
          <button
            onClick={() => handleDeleteScene(activeSceneIndex)}
            disabled={scenes.length <= 1}
            className="btn-icon"
            style={{ padding: '0.3rem', color: scenes.length <= 1 ? 'var(--text-muted)' : '#f87171', opacity: scenes.length <= 1 ? 0.3 : 1 }}
            title="Hapus Slide Ini"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Workspace (3 columns: Left Hierarchy, Center Canvas, Right Inspector) */}
      <div className="studio-workspace">
        {/* Left Sidebar: Scene & Hierarchy */}
        <div className="studio-left-sidebar" style={{
          width: '290px',
          background: 'var(--bg-darker)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          {/* Add Object Menu */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            {/* Direct Import Section */}
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
              Import Media &amp; 3D
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
              {/* Import Foto */}
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingDirect}
                className="btn btn-accent"
                style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', justifyContent: 'flex-start' }}
              >
                <ImageIcon size={15} /> Import Foto (PNG/JPG)
              </button>

              {/* Import GIF */}
              <button
                onClick={() => gifInputRef.current?.click()}
                disabled={isUploadingDirect}
                className="btn btn-accent"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  justifyContent: 'flex-start',
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  boxShadow: '0 2px 10px rgba(236, 72, 153, 0.3)'
                }}
              >
                <Film size={15} /> Import GIF Animasi
              </button>

              {/* Import Video MP4 */}
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploadingDirect}
                className="btn btn-accent"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  justifyContent: 'flex-start',
                  background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                  boxShadow: '0 2px 10px rgba(6, 182, 212, 0.3)'
                }}
              >
                <Video size={15} /> Import Video (MP4)
              </button>

              {/* Import Audio MP3 */}
              <button
                onClick={() => audioInputRef.current?.click()}
                disabled={isUploadingDirect}
                className="btn btn-accent"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  justifyContent: 'flex-start',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Volume2 size={15} /> Import Audio (MP3)
              </button>

              {/* Import Model 3D GLB */}
              <button
                onClick={() => model3dInputRef.current?.click()}
                disabled={isUploadingDirect}
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', justifyContent: 'flex-start' }}
              >
                <Box size={15} /> Import Aset 3D (GLB)
              </button>

              {/* Browse Existing Assets Library */}
              <button
                onClick={() => {
                  setAssetModalTab('ALL');
                  setShowAddAssetModal(true);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem', justifyContent: 'center' }}
              >
                <FolderOpen size={14} /> Buka Pustaka Media &amp; 3D
              </button>
            </div>

            {/* Basic 3D Geometries */}
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Bentuk 3D Dasar
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
              <button
                onClick={() => handleAddObject('GEOMETRY', 'box')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'flex-start' }}
              >
                <Box size={14} color="var(--primary-light)" /> Kubus
              </button>
              <button
                onClick={() => handleAddObject('GEOMETRY', 'sphere')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'flex-start' }}
              >
                <Box size={14} color="var(--accent-light)" /> Bola
              </button>
              <button
                onClick={() => handleAddObject('GEOMETRY', 'cylinder')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'flex-start' }}
              >
                <Box size={14} color="#34d399" /> Silinder
              </button>
              <button
                onClick={() => handleAddObject('GEOMETRY', 'torus')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'flex-start' }}
              >
                <Box size={14} color="#f59e0b" /> Torus
              </button>
              <button
                onClick={() => handleAddObject('TEXT_3D')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'flex-start', gridColumn: 'span 2' }}
              >
                <Type size={14} color="#ec4899" /> Teks 3D / Judul AR
              </button>
            </div>
          </div>

          {/* Scene Hierarchy Tree */}
          <div style={{ flex: 1, padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
              Hirarki Scene ({objects.length})
            </div>

            {objects.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 1rem' }}>
                Kanvas kosong. Import media atau tambahkan bentuk di atas.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {objects.map((obj) => {
                  const isSelected = selectedObjectId === obj.id;
                  const isGif = obj.asset?.fileUrl?.toLowerCase().endsWith('.gif');
                  return (
                    <div
                      key={obj.id}
                      onClick={() => setSelectedObjectId(obj.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                        cursor: 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        {obj.type === 'TEXT_3D' ? (
                          <Type size={14} color="#ec4899" />
                        ) : obj.type === 'IMAGE' ? (
                          isGif ? <Film size={14} color="#ec4899" /> : <ImageIcon size={14} color="var(--accent-light)" />
                        ) : obj.type === 'LIGHT' ? (
                          <Sun size={14} color="#fef08a" />
                        ) : (
                          <Box size={14} color={isSelected ? 'var(--primary-light)' : 'var(--text-secondary)'} />
                        )}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isSelected ? 600 : 400 }}>
                          {obj.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateObject(obj.id);
                          }}
                          className="btn-icon"
                          style={{ padding: '0.2rem' }}
                          title="Duplikat (Ctrl+D)"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteObject(obj.id);
                          }}
                          className="btn-icon"
                          style={{ padding: '0.2rem', color: '#f87171' }}
                          title="Hapus"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center: Three.js Canvas */}
        <div className="studio-canvas-container" style={{ flex: 1, position: 'relative', background: '#0a0b10' }}>
          <Editor3DCanvas
            objects={objects}
            selectedId={selectedObjectId}
            onSelect={setSelectedObjectId}
            onUpdateTransform={handleUpdateTransform}
            transformMode={transformMode}
            backgroundColor={backgroundColor}
            markerImageUrl={project?.marker?.imageUrl}
          />

          {/* Keyboard shortcut tips footer (Desktop only) */}
          <div className="hide-on-mobile" style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(10, 12, 20, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.6875rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            pointerEvents: 'none'
          }}>
            <span><b>W</b> Geser</span>
            <span>&bull;</span>
            <span><b>E</b> Putar</span>
            <span>&bull;</span>
            <span><b>R</b> Skala</span>
            <span>&bull;</span>
            <span><b>Ctrl+D</b> Duplikat</span>
            <span>&bull;</span>
            <span><b>Del</b> Hapus</span>
          </div>
        </div>

        {/* Right Sidebar: Inspector */}
        <div className="studio-right-inspector" style={{
          width: '320px',
          background: 'var(--bg-darker)',
          borderLeft: '1px solid var(--border-subtle)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          {selectedObject ? (
            <div className="animate-fade-in">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Properti Objek
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Nama Objek</label>
                <input
                  type="text"
                  value={selectedObject.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setObjects((prev) => {
                      const updated = prev.map((o) => (o.id === selectedObject.id ? { ...o, name: newName } : o));
                      triggerAutoSave(undefined, updated, backgroundColor);
                      return updated;
                    });
                  }}
                  className="form-input"
                />
              </div>

              {/* Photo / GIF Media Preview Box */}
              {selectedObject.type === 'IMAGE' && selectedObject.asset && (
                <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Pratinjau Media:</div>
                  <div style={{ maxHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden', padding: '0.25rem' }}>
                    <img src={selectedObject.asset.fileUrl} alt={selectedObject.name} style={{ maxHeight: '110px', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--accent-light)', marginTop: '0.35rem', fontWeight: 600 }}>
                    {selectedObject.asset.fileUrl.toLowerCase().endsWith('.gif') ? '🎬 Animasi GIF Aktif (Berjalan Otomatis)' : '🖼️ Foto / Gambar'}
                  </div>
                </div>
              )}

              {/* Text Content (if Text 3D) */}
              {selectedObject.type === 'TEXT_3D' && (
                <div className="form-group">
                  <label className="form-label">Teks Yang Ditampilkan</label>
                  <input
                    type="text"
                    value={selectedObject.properties.text || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setObjects((prev) => {
                        const updated = prev.map((o) =>
                          o.id === selectedObject.id
                            ? { ...o, properties: { ...o.properties, text: val } }
                            : o
                        );
                        triggerAutoSave(undefined, updated, backgroundColor);
                        return updated;
                      });
                    }}
                    className="form-input"
                  />
                </div>
              )}

              {/* Position (X, Y, Z) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Posisi (X, Y, Z)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                  {['X', 'Y', 'Z'].map((axis, i) => (
                    <div key={axis} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.6875rem', color: i === 0 ? '#f87171' : i === 1 ? '#4ade80' : '#60a5fa', fontWeight: 700, marginRight: '0.25rem' }}>{axis}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedObject.transform.position[i].toFixed(2)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const newPos: [number, number, number] = [...selectedObject.transform.position];
                          newPos[i] = val;
                          handleUpdateTransform(selectedObject.id, { ...selectedObject.transform, position: newPos });
                        }}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '0.75rem' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Scale (X, Y, Z) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Skala Ukuran (X, Y, Z)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                  {['X', 'Y', 'Z'].map((axis, i) => (
                    <div key={axis} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--accent-light)', fontWeight: 700, marginRight: '0.25rem' }}>{axis}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedObject.transform.scale[i].toFixed(2)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1;
                          const newScale: [number, number, number] = [...selectedObject.transform.scale];
                          newScale[i] = val;
                          handleUpdateTransform(selectedObject.id, { ...selectedObject.transform, scale: newScale });
                        }}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '0.75rem' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Color & Material (for geometries / 3d text) */}
              {selectedObject.type !== 'IMAGE' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Warna & Material</label>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {colorPresets.map((c) => (
                      <div
                        key={c}
                        onClick={() => {
                          setObjects((prev) => {
                            const updated = prev.map((o) =>
                              o.id === selectedObject.id
                                ? { ...o, properties: { ...o.properties, color: c } }
                                : o
                            );
                            triggerAutoSave(undefined, updated, backgroundColor);
                            return updated;
                          });
                        }}
                        style={{
                          width: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '50%',
                          background: c,
                          cursor: 'pointer',
                          border: selectedObject.properties.color === c ? '2px solid #ffffff' : '2px solid transparent'
                        }}
                      />
                    ))}
                  </div>

                  {/* Wireframe toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem' }}>Wireframe</span>
                    <input
                      type="checkbox"
                      checked={selectedObject.properties.wireframe || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setObjects((prev) => {
                          const updated = prev.map((o) =>
                            o.id === selectedObject.id
                              ? { ...o, properties: { ...o.properties, wireframe: checked } }
                              : o
                        );
                        triggerAutoSave(undefined, updated, backgroundColor);
                        return updated;
                      });
                    }}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  </div>
                </div>
              )}

              {/* Animasi Kontinu (Spin, Bounce, Pulse) */}
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-light)', marginBottom: '0.5rem' }}>
                  <Play size={13} /> Animasi 3D Kontinu
                </div>
                <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                  <label className="form-label">Efek Gerakan</label>
                  <select
                    value={selectedObject.properties.animation || 'NONE'}
                    onChange={(e) => {
                      const anim = e.target.value as any;
                      setObjects((prev) => {
                        const updated = prev.map((o) =>
                          o.id === selectedObject.id
                            ? { ...o, properties: { ...o.properties, animation: anim } }
                            : o
                        );
                        triggerAutoSave(undefined, updated, backgroundColor);
                        return updated;
                      });
                    }}
                    className="form-input"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <option value="NONE">Tidak Ada (Statis)</option>
                    <option value="SPIN">🔄 Putar Terus Sumbu Y (Spin)</option>
                    <option value="BOUNCE">✨ Melayang Halus (Bounce)</option>
                    <option value="PULSE">💓 Berdenyut Skala (Pulse)</option>
                  </select>
                </div>

                {selectedObject.properties.animation && selectedObject.properties.animation !== 'NONE' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Kecepatan Animasi</span>
                      <span>{(selectedObject.properties.animSpeed || 1).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={selectedObject.properties.animSpeed || 1}
                      onChange={(e) => {
                        const spd = parseFloat(e.target.value);
                        setObjects((prev) => {
                          const updated = prev.map((o) =>
                            o.id === selectedObject.id
                              ? { ...o, properties: { ...o.properties, animSpeed: spd } }
                              : o
                          );
                          triggerAutoSave(undefined, updated, backgroundColor);
                          return updated;
                        });
                      }}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>
                )}
              </div>

              {/* Interaksi & Trigger Klik (Open URL, Switch Scene, Toggle Audio) */}
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#34d399', marginBottom: '0.5rem' }}>
                  <MousePointerClick size={13} /> Aksi Saat Objek Diklik/Disentuh
                </div>
                <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                  <label className="form-label">Tindakan Trigger</label>
                  <select
                    value={selectedObject.properties.trigger?.action || 'NONE'}
                    onChange={(e) => {
                      const act = e.target.value as any;
                      setObjects((prev) => {
                        const updated = prev.map((o) =>
                          o.id === selectedObject.id
                            ? {
                                ...o,
                                properties: {
                                  ...o.properties,
                                  trigger: {
                                    ...o.properties.trigger,
                                    action: act
                                  }
                                }
                              }
                            : o
                        );
                        triggerAutoSave(undefined, updated, backgroundColor);
                        return updated;
                      });
                    }}
                    className="form-input"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <option value="NONE">Tidak Ada Aksi</option>
                    <option value="OPEN_URL">🔗 Buka Tautan Website (URL)</option>
                    <option value="SWITCH_SCENE">⏭️ Pindah ke Slide Lain</option>
                    <option value="TOGGLE_AUDIO">🔊 Putar / Hentikan Suara</option>
                  </select>
                </div>

                {selectedObject.properties.trigger?.action === 'OPEN_URL' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Alamat URL Tujuan</label>
                    <input
                      type="url"
                      placeholder="https://kantor.bm3.go.id"
                      value={selectedObject.properties.trigger?.url || ''}
                      onChange={(e) => {
                        const link = e.target.value;
                        setObjects((prev) => {
                          const updated: EditorObject[] = prev.map((o) =>
                            o.id === selectedObject.id
                              ? {
                                  ...o,
                                  properties: {
                                    ...o.properties,
                                    trigger: { ...o.properties.trigger, action: 'OPEN_URL' as const, url: link }
                                  }
                                }
                              : o
                          );
                          triggerAutoSave(undefined, updated, backgroundColor);
                          return updated;
                        });
                      }}
                      className="form-input"
                      style={{ fontSize: '0.75rem' }}
                    />
                  </div>
                )}

                {selectedObject.properties.trigger?.action === 'SWITCH_SCENE' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Target Slide Tujuan</label>
                    <select
                      value={selectedObject.properties.trigger?.targetScene ?? ''}
                      onChange={(e) => {
                        const targetIdx = parseInt(e.target.value, 10);
                        setObjects((prev) => {
                          const updated: EditorObject[] = prev.map((o) =>
                            o.id === selectedObject.id
                              ? {
                                  ...o,
                                  properties: {
                                    ...o.properties,
                                    trigger: { ...o.properties.trigger, action: 'SWITCH_SCENE' as const, targetScene: targetIdx }
                                  }
                                }
                              : o
                          );
                          triggerAutoSave(undefined, updated, backgroundColor);
                          return updated;
                        });
                      }}
                      className="form-input"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <option value="">Pilih Slide Tujuan...</option>
                      {scenes.map((sc, i) => (
                        <option key={sc.id || i} value={i}>
                          Slide {i + 1}: {sc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedObject.properties.trigger?.action === 'TOGGLE_AUDIO' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Pilih Aset Audio</label>
                    <select
                      value={selectedObject.properties.trigger?.audioUrl || ''}
                      onChange={(e) => {
                        const aUrl = e.target.value;
                        setObjects((prev) => {
                          const updated: EditorObject[] = prev.map((o) =>
                            o.id === selectedObject.id
                              ? {
                                  ...o,
                                  properties: {
                                    ...o.properties,
                                    trigger: { ...o.properties.trigger, action: 'TOGGLE_AUDIO' as const, audioUrl: aUrl }
                                  }
                                }
                              : o
                          );
                          triggerAutoSave(undefined, updated, backgroundColor);
                          return updated;
                        });
                      }}
                      className="form-input"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <option value="">Pilih berkas audio...</option>
                      {assets.filter((a) => a.type === 'AUDIO' || a.fileUrl.endsWith('.mp3')).map((a) => (
                        <option key={a.id} value={a.fileUrl}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Pengaturan Scene
              </div>

              {/* Background Color */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Warna Background Kanvas</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => {
                      setBackgroundColor(e.target.value);
                      triggerAutoSave(undefined, objects, e.target.value);
                    }}
                    style={{ width: '40px', height: '36px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{backgroundColor}</span>
                </div>
              </div>

              {/* Marker Info */}
              <div style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Marker AR Tertaut:</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{project?.marker?.name || 'Hiro Marker (Default AR)'}</div>
                {project?.marker?.imageUrl && (
                  <img src={project.marker.imageUrl} alt="Marker" style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0.75rem 0' }} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unified Media & 3D Asset Library Modal */}
      {showAddAssetModal && (
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
          <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Pustaka Media &amp; Aset 3D</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Pilih berkas dari pustaka atau unggah langsung untuk dimasukkan ke kanvas 3D
                </p>
              </div>
              <button onClick={() => setShowAddAssetModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'MODEL_3D', label: '📦 Model 3D' },
                  { id: 'IMAGE', label: '🖼️ Foto' },
                  { id: 'GIF', label: '🎬 GIF' },
                  { id: 'VIDEO', label: '🎥 Video' },
                  { id: 'AUDIO', label: '🔊 Audio' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAssetModalTab(tab.id as any)}
                    className={`btn ${assetModalTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Cari aset..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2rem', padding: '0.35rem 0.625rem 0.35rem 2rem', fontSize: '0.75rem' }}
                />
              </div>
            </div>

            {/* Assets Grid */}
            {modalFilteredAssets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                <Box size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tidak ada berkas yang cocok</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Gunakan tombol import di sebelah kiri atau unggah berkas baru
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.25rem' }}>
                {modalFilteredAssets.map((asset) => {
                  const isGif = asset.fileUrl?.toLowerCase().endsWith('.gif') || asset.type === 'GIF';
                  const isImage = (asset.type === 'IMAGE' || asset.mimeType?.startsWith('image/')) && !isGif;
                  const isVideo = asset.type === 'VIDEO' || asset.fileUrl?.toLowerCase().endsWith('.mp4');
                  const isAudio = asset.type === 'AUDIO' || asset.fileUrl?.toLowerCase().endsWith('.mp3');
                  return (
                    <div
                      key={asset.id}
                      onClick={() => {
                        if (asset.type === 'MODEL_3D') {
                          handleAddObject('3D_MODEL', undefined, asset);
                        } else if (isVideo) {
                          handleAddObject('VIDEO', undefined, asset);
                        } else if (isAudio) {
                          handleAddObject('AUDIO', undefined, asset);
                        } else {
                          handleAddObject('IMAGE', undefined, asset);
                        }
                        setShowAddAssetModal(false);
                      }}
                      style={{
                        padding: '0.875rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                        {isImage || isGif ? (
                          <img src={asset.fileUrl} alt={asset.name} style={{ maxHeight: '65px', maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Box size={28} color="var(--primary-light)" />
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {asset.name}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {isGif ? '🎬 GIF Animasi' : isImage ? '🖼️ Foto' : '📦 3D Model'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Klik pada aset untuk langsung memasukkannya ke kanvas 3D
              </div>
              <button onClick={() => setShowAddAssetModal(false)} className="btn btn-secondary">
                Tutup
              </button>
            </div>
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
              <h2 style={{ fontSize: '1.25rem' }}>Pratinjau &amp; Bagikan Konten</h2>
              <button onClick={() => setShowShareModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '1.5rem' }}>
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '180px', height: '180px', margin: '0 auto', display: 'block' }} />
              )}
              <div style={{ color: '#0f172a', fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.5rem' }}>
                Pindai dengan kamera ponsel untuk membuka 3D &amp; WebAR
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Tautan Publik Proyek</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/view/${project.slug}`}
                  className="form-input"
                  style={{ fontSize: '0.8125rem' }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/view/${project.slug}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="btn btn-secondary"
                >
                  {copiedLink ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link
                href={`/view/${project.slug}`}
                target="_blank"
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                <ExternalLink size={16} /> Buka Pratinjau
              </Link>
              <button
                onClick={() => setShowShareModal(false)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AR Marker Target Modal in Editor */}
      {showMarkerModal && (
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
          <div className="glass-panel" style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>🎯 Target AR Marker Proyek</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Pilih gambar pemicu fisik untuk proyek AR Anda
                </div>
              </div>
              <button onClick={() => setShowMarkerModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* Currently Active Marker Card */}
            {(() => {
              const activeMarker = markers.find((m) => m.id === selectedMarkerId) || markers[0];
              if (!activeMarker) return null;
              const isH = (activeMarker.orientation || 'HORIZONTAL') === 'HORIZONTAL';

              return (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  gap: '1.25rem',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    width: '110px',
                    height: '110px',
                    background: '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img
                      src={activeMarker.imageUrl}
                      alt={activeMarker.name}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-published" style={{ fontSize: '0.6875rem' }}>
                        Marker Aktif
                      </span>
                      <span className="badge" style={{
                        fontSize: '0.6875rem',
                        background: isH ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                        color: isH ? 'var(--primary-light)' : 'var(--accent-light)'
                      }}>
                        {isH ? '⬒ Horizontal' : '▮ Vertical'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      {activeMarker.name}
                    </h4>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Kamera ponsel akan mendeteksi gambar ini untuk memunculkan model 3D / foto / GIF.
                    </p>

                    <button
                      onClick={() => {
                        const printWin = window.open('', '_blank');
                        if (printWin) {
                          printWin.document.write(`
                            <html>
                              <head><title>Marker Target AR - ${activeMarker.name}</title></head>
                              <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center;">
                                <h2>Target AR Marker: ${activeMarker.name}</h2>
                                <img src="${activeMarker.imageUrl}" style="width:400px; height:400px; object-fit:contain; border:2px solid #000; padding:20px;" />
                                <p style="margin-top:20px; font-weight:bold;">Arahkan kamera viewer ponsel ke gambar ini!</p>
                                <script>window.onload = function() { window.print(); }<\/script>
                              </body>
                            </html>
                          `);
                          printWin.document.close();
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      <Printer size={13} /> Cetak / Buka Gambar Target
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* List of Available Markers */}
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Pilih dari Pustaka Marker ({markers.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.25rem' }}>
              {markers.map((marker) => {
                const isSelected = selectedMarkerId === marker.id;
                return (
                  <div
                    key={marker.id}
                    onClick={() => handleUpdateProjectMarker(marker.id)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '4px', padding: '0.35rem', marginBottom: '0.45rem' }}>
                      <img src={marker.imageUrl} alt={marker.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? 'var(--primary-light)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {marker.name}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hidden Marker Upload Input */}
            <input
              type="file"
              ref={markerInputRef}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadMarkerFromEditor(e.target.files[0]);
                }
              }}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => markerInputRef.current?.click()}
                className="btn btn-accent"
                style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
              >
                <Upload size={14} /> Upload Custom Marker Baru
              </button>

              <button
                onClick={() => setShowMarkerModal(false)}
                className="btn btn-primary"
                style={{ fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Scan & AR Target Modal */}
      {project && (
        <MobileScanModal
          isOpen={showMobileScanModal}
          onClose={() => setShowMobileScanModal(false)}
          slug={project.slug}
          title={project.title}
          markerImage={project.marker?.imageUrl || '/markers/card.png'}
          markerName={project.marker?.name || 'Kartu Target MindAR'}
          markerOrientation={project.marker?.orientation || 'HORIZONTAL'}
        />
      )}
    </div>
  );
}
