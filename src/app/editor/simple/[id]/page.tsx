'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Zap,
  Box,
  Layers,
  Sparkles,
  QrCode,
  Share2,
  ExternalLink,
  Copy,
  Sliders,
  Maximize2,
  Smartphone
} from 'lucide-react';
import QRCode from 'qrcode';
import Simple3DPreview from '@/components/3d/Simple3DPreview';
import MobileScanModal from '@/components/common/MobileScanModal';

export default function SuperSimpleEditorPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 3-Step Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Configuration values
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>('');
  const [modelType, setModelType] = useState<string>('box');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [rotationY, setRotationY] = useState<number>(0);
  const [color, setColor] = useState<string>('#6366f1');
  const [wireframe, setWireframe] = useState<boolean>(false);

  // Share & Mobile Scan modal
  const [showMobileScanModal, setShowMobileScanModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Load project & resources
  useEffect(() => {
    async function loadData() {
      try {
        const [projRes, markersRes, assetsRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch('/api/markers'),
          fetch('/api/assets?type=MODEL_3D')
        ]);

        if (projRes.ok) {
          const projData = await projRes.json();
          setProject(projData.project);

          if (projData.project.markerId) {
            setSelectedMarkerId(projData.project.markerId);
          }

          // Parse existing scene object if present
          const firstObj = projData.project.scenes?.[0]?.objects?.[0];
          if (firstObj) {
            try {
              const tr = JSON.parse(firstObj.transform);
              if (tr.scale?.[0]) setScale(tr.scale[0]);
              if (tr.rotation?.[1]) setRotationY(tr.rotation[1]);

              const prop = JSON.parse(firstObj.properties);
              if (prop.color) setColor(prop.color);
              if (prop.geometry) setModelType(prop.geometry);
              if (prop.wireframe !== undefined) setWireframe(prop.wireframe);

              if (firstObj.assetId) {
                setSelectedAssetId(firstObj.assetId);
                setModelType('glb');
                if (firstObj.asset?.fileUrl) {
                  setModelUrl(firstObj.asset.fileUrl);
                }
              }
            } catch (e) {
              console.warn('Object parse error:', e);
            }
          }
        }

        if (markersRes.ok) {
          const markersData = await markersRes.json();
          setMarkers(markersData.markers || []);
          if (!selectedMarkerId && markersData.markers?.[0]) {
            setSelectedMarkerId(markersData.markers[0].id);
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

    if (id) loadData();
  }, [id]);

  const handleSave = async (openShare = false) => {
    setSaving(true);
    try {
      const objPayload = {
        name: 'Objek Utama AR',
        type: modelType === 'glb' ? '3D_MODEL' : 'GEOMETRY',
        assetId: modelType === 'glb' ? selectedAssetId : null,
        transform: {
          position: [0, 0.5 * scale, 0],
          rotation: [0, rotationY, 0],
          scale: [scale, scale, scale]
        },
        properties: {
          geometry: modelType === 'glb' ? undefined : modelType,
          color,
          roughness: 0.3,
          metalness: 0.7,
          wireframe
        }
      };

      const scenePayload = {
        id: project.scenes?.[0]?.id,
        name: 'Scene Utama',
        order: 0,
        backgroundColor: '#0f111a',
        objects: [objPayload]
      };

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markerId: selectedMarkerId,
          mode: 'SIMPLE',
          scenes: [scenePayload]
        })
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);

        if (openShare) {
          const shareUrl = `${window.location.origin}/view/${project.slug}`;
          const qr = await QRCode.toDataURL(shareUrl, { width: 280, margin: 2 });
          setQrCodeUrl(qr);
          setShowShareModal(true);
        }
      } else {
        alert('Gagal menyimpan proyek');
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToFullEditor = async () => {
    await handleSave(false);
    router.push(`/editor/${id}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: '2.5rem', height: '2.5rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  const colorPresets = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ffffff', '#e2e8f0'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-darkest)' }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        background: 'rgba(10, 12, 20, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/dashboard" className="btn-icon" title="Kembali ke Dashboard">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-mode hide-on-mobile" style={{ fontSize: '0.6875rem' }}>
                <Zap size={12} /> Super Simple Editor
              </span>
              <h1 style={{ fontSize: '1rem', fontWeight: 700, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {project?.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto', maxWidth: '100%' }}>
          {[
            { step: 1, label: '1. Marker' },
            { step: 2, label: '2. Objek 3D' },
            { step: 3, label: '3. Ukuran' }
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setCurrentStep(item.step as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: currentStep === item.step ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: currentStep === item.step ? '#ffffff' : 'var(--text-secondary)',
                border: currentStep === item.step ? '1px solid var(--primary-light)' : '1px solid transparent',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
            >
              {currentStep > item.step ? <Check size={13} color="#34d399" /> : null}
              {item.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setShowMobileScanModal(true)}
            className="btn btn-primary"
            style={{
              fontSize: '0.8125rem',
              padding: '0.45rem 0.85rem',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.35)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600
            }}
            title="Buka Viewer di HP & Pindai Marker Target"
          >
            <Smartphone size={14} /> <span>Uji di HP</span>
          </button>
          <button
            onClick={handleSwitchToFullEditor}
            className="btn btn-secondary hide-on-mobile"
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.75rem' }}
            title="Buka kanvas penuh dengan transform controls dan multi-object"
          >
            <Maximize2 size={14} /> 3D Penuh
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.875rem' }}
          >
            <Share2 size={14} /> <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (Left Control Panel + Right 3D Canvas) */}
      <div className="simple-editor-workspace">
        {/* Left Config Panel */}
        <div className="simple-editor-panel">
          {/* STEP 1: Pilih Marker */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-published" style={{ borderRadius: '50%', width: '22px', height: '22px', padding: 0, justifyContent: 'center' }}>1</span>
                <h2 style={{ fontSize: '1.125rem' }}>Pilih AR Marker</h2>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Marker ini akan menjadi jangkar fisik di mana objek 3D Anda muncul saat discan melalui kamera ponsel.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '2rem' }}>
                {markers.map((marker) => {
                  const isSelected = selectedMarkerId === marker.id;
                  return (
                    <div
                      key={marker.id}
                      onClick={() => setSelectedMarkerId(marker.id)}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{
                        height: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <img
                          src={marker.imageUrl}
                          alt={marker.name}
                          style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: isSelected ? 'var(--primary-light)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {marker.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Lanjut ke Objek 3D <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2: Pilih Objek 3D */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-published" style={{ borderRadius: '50%', width: '22px', height: '22px', padding: 0, justifyContent: 'center' }}>2</span>
                <h2 style={{ fontSize: '1.125rem' }}>Pilih Objek 3D</h2>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Pilih bentuk dasar geometris 3D atau model 3D GLB dari pustaka aset kantor.
              </p>

              {/* Procedural Geometries */}
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Bentuk 3D Standar
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                  { id: 'box', label: 'Kubus' },
                  { id: 'sphere', label: 'Bola' },
                  { id: 'cylinder', label: 'Silinder' },
                  { id: 'torus', label: 'Torus' },
                  { id: 'cone', label: 'Kerucut' },
                ].map((shape) => {
                  const isSelected = modelType === shape.id;
                  return (
                    <button
                      key={shape.id}
                      onClick={() => {
                        setModelType(shape.id);
                        setSelectedAssetId(null);
                        setModelUrl(null);
                      }}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        color: isSelected ? 'var(--primary-light)' : 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: 'pointer'
                      }}
                    >
                      {shape.label}
                    </button>
                  );
                })}
              </div>

              {/* Uploaded 3D Assets */}
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Model 3D dari Pustaka Aset
              </div>
              {assets.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                  Belum ada model GLB diunggah. Anda dapat mengunggahnya lewat menu Pustaka Aset.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {assets.map((asset) => {
                    const isSelected = selectedAssetId === asset.id;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          setModelType('glb');
                          setModelUrl(asset.fileUrl);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer'
                        }}
                      >
                        <Box size={20} color={isSelected ? 'var(--accent-light)' : 'var(--text-secondary)'} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{asset.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setCurrentStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Kembali
                </button>
                <button onClick={() => setCurrentStep(3)} className="btn btn-primary" style={{ flex: 1 }}>
                  Lanjut Atur Ukuran <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Atur Ukuran & Warna */}
          {currentStep === 3 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-published" style={{ borderRadius: '50%', width: '22px', height: '22px', padding: 0, justifyContent: 'center' }}>3</span>
                <h2 style={{ fontSize: '1.125rem' }}>Atur Ukuran & Tampilan</h2>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Sesuaikan skala ukuran objek dan rotasi agar pas di atas marker fisik.
              </p>

              {/* Scale Slider */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label">Skala Ukuran</label>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                    {scale.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              {/* Rotation Slider */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label">Rotasi Sumbu Y</label>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-light)' }}>
                    {Math.round((rotationY * 180) / Math.PI)}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.PI * 2}
                  step="0.05"
                  value={rotationY}
                  onChange={(e) => setRotationY(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              {/* Color Palette */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Warna Objek</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {colorPresets.map((c) => (
                    <div
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: c,
                        cursor: 'pointer',
                        border: color === c ? '2px solid #ffffff' : '2px solid transparent',
                        boxShadow: color === c ? '0 0 10px rgba(255,255,255,0.4)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Wireframe toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.8125rem' }}>Mode Kerangka (Wireframe)</span>
                <input
                  type="checkbox"
                  checked={wireframe}
                  onChange={(e) => setWireframe(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setCurrentStep(2)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Kembali
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <Share2 size={16} /> Selesai & Bagikan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 3D Canvas Preview */}
        <div className="simple-editor-canvas">
          <Simple3DPreview
            modelType={modelType}
            modelUrl={modelUrl}
            scale={scale}
            rotationY={rotationY}
            color={color}
            wireframe={wireframe}
          />

          {/* Overlay Helper Badge */}
          <div style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(10, 12, 20, 0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            pointerEvents: 'none'
          }}>
            <Sparkles size={13} color="var(--primary-light)" /> Klik & geser kursor untuk memutar sudut pandang 3D
          </div>
        </div>
      </div>

      {/* Share & QR Code Modal */}
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
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
                marginBottom: '0.75rem'
              }}>
                <Check size={24} />
              </div>
              <h2 style={{ fontSize: '1.35rem' }}>Proyek AR Siap Dibagikan!</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Tautan publik dan kode QR telah dibuat secara otomatis
              </p>
            </div>

            {/* QR Code Container */}
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '1.5rem' }}>
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '180px', height: '180px', margin: '0 auto', display: 'block' }} />
              )}
              <div style={{ color: '#0f172a', fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.5rem' }}>
                Pindai dengan kamera ponsel untuk melihat dalam 3D / AR
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Tautan Publik</label>
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
                <ExternalLink size={16} /> Pratinjau
              </Link>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Kembali ke Dashboard
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
          markerImage={markers.find((m) => m.id === selectedMarkerId)?.imageUrl || project.marker?.imageUrl || '/markers/card.png'}
          markerName={markers.find((m) => m.id === selectedMarkerId)?.name || project.marker?.name || 'Kartu Target MindAR'}
          markerOrientation={markers.find((m) => m.id === selectedMarkerId)?.orientation || project.marker?.orientation || 'HORIZONTAL'}
        />
      )}
    </div>
  );
}
