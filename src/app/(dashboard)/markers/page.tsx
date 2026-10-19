'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Upload,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Layers,
  ArrowRight,
  ExternalLink,
  Trash2,
  Maximize2,
  Compass,
  Monitor,
  Zap,
  Cpu
} from 'lucide-react';
import { compileImageToMind } from '@/lib/mindar-compiler';

interface ProjectRef {
  id: string;
  title: string;
  slug: string;
}

interface Marker {
  id: string;
  name: string;
  imageUrl: string;
  patternUrl: string | null;
  orientation?: string; // HORIZONTAL | VERTICAL
  qualityScore?: number; // 0 - 100
  projectId?: string | null;
  projects?: ProjectRef[];
  isDefault: boolean;
  createdAt: string;
}

interface ProjectOption {
  id: string;
  title: string;
  slug: string;
}

export default function MarkersPage() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  // 5-Step Custom Marker Setup Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [markerName, setMarkerName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [orientation, setOrientation] = useState<'HORIZONTAL' | 'VERTICAL'>('HORIZONTAL');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [qualityRating, setQualityRating] = useState<'EXCELLENT' | 'GOOD' | 'POOR'>('GOOD');
  const [qualityText, setQualityText] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // MindAR Compiler State
  const [compilingMarkerId, setCompilingMarkerId] = useState<string | null>(null);
  const [compileProgress, setCompileProgress] = useState<number | null>(null);
  const [compileStatusText, setCompileStatusText] = useState<string>('');
  const [autoCompileMind, setAutoCompileMind] = useState<boolean>(true);

  // Print / On-Screen Visual Target Modal
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [showTargetFullscreen, setShowTargetFullscreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMarkersAndProjects = async () => {
    try {
      const [markersRes, projectsRes] = await Promise.all([
        fetch('/api/markers'),
        fetch('/api/projects')
      ]);

      if (markersRes.ok) {
        const data = await markersRes.json();
        setMarkers(data.markers || []);
      }

      if (projectsRes.ok) {
        const pData = await projectsRes.json();
        setProjects(pData.projects || []);
      }
    } catch (err) {
      console.error('Fetch markers error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkersAndProjects();
  }, []);

  // Automatic Quality Check on Image using HTML Canvas
  const analyzeImageQuality = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 256, 256);
        const imgData = ctx.getImageData(0, 0, 256, 256);
        const data = imgData.data;

        // Calculate contrast and brightness variance
        let totalBrightness = 0;
        let brightnessList: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          const b = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          totalBrightness += b;
          brightnessList.push(b);
        }

        const avgBrightness = totalBrightness / brightnessList.length;
        let variance = 0;
        for (let b of brightnessList) {
          variance += Math.pow(b - avgBrightness, 2);
        }
        const stdDev = Math.sqrt(variance / brightnessList.length);

        // Normalize quality score (high contrast, good resolution)
        let score = Math.min(100, Math.max(35, Math.round((stdDev / 120) * 88 + (img.width >= 400 ? 12 : 0))));
        setQualityScore(score);

        if (score >= 75) {
          setQualityRating('EXCELLENT');
          setQualityText('Excellent (Sangat Baik) — Kontras tinggi dan fitur tajam, sangat akurat dilacak kamera.');
        } else if (score >= 50) {
          setQualityRating('GOOD');
          setQualityText('Good (Cukup Bagus) — Dapat dilacak dengan baik pada kondisi pencahayaan ruangan yang cukup.');
        } else {
          setQualityRating('POOR');
          setQualityText('Poor (Kurang Ideal) — Gambar terlalu polos/kurang kontras, pertimbangkan menambah variasi grafis.');
        }
      };
      img.src = e.target?.result as string;
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      if (!markerName) {
        setMarkerName(file.name.replace(/\.[^/.]+$/, ''));
      }
      setUploadError(null);
      analyzeImageQuality(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadError(null);
    setCompileProgress(null);
    setCompileStatusText('');

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', markerName);
    formData.append('orientation', orientation);
    formData.append('qualityScore', String(qualityScore || 85));
    if (selectedProjectId) {
      formData.append('projectId', selectedProjectId);
    }

    // Automatically compile .mind target if enabled
    if (autoCompileMind) {
      try {
        setCompileStatusText('Mengekstrak fitur visual & mengompilasi MindAR...');
        const { blob } = await compileImageToMind(uploadFile, (progress) => {
          setCompileProgress(progress);
          setCompileStatusText(`Mengekstrak fitur visual MindAR... ${progress}%`);
        });
        formData.append('mindFile', blob, 'marker.mind');
        setCompileStatusText('Kompilasi target MindAR selesai! Menyimpan data...');
      } catch (err: any) {
        console.warn('Gagal kompilasi target MindAR di browser:', err);
        // We continue uploading the image even if compiler fails
      }
    }

    try {
      const res = await fetch('/api/markers', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah marker');
      }

      setShowUploadModal(false);
      setUploadFile(null);
      setPreviewUrl(null);
      setQualityScore(null);
      setMarkerName('');
      setSelectedProjectId('');
      setOrientation('HORIZONTAL');
      setCompileProgress(null);
      setCompileStatusText('');
      fetchMarkersAndProjects();
    } catch (err: any) {
      setUploadError(err.message || 'Gagal mengunggah marker');
    } finally {
      setUploading(false);
    }
  };

  // Compile an existing marker on demand
  const handleCompileMarker = async (marker: Marker) => {
    setCompilingMarkerId(marker.id);
    setCompileProgress(0);
    try {
      const { blob } = await compileImageToMind(marker.imageUrl, (progress) => {
        setCompileProgress(progress);
      });

      const formData = new FormData();
      formData.append('mindFile', blob, 'target.mind');

      const res = await fetch(`/api/markers/${marker.id}/compile`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan target .mind');
      }

      await fetchMarkersAndProjects();
    } catch (err: any) {
      alert(`Gagal kompilasi target MindAR: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setCompilingMarkerId(null);
      setCompileProgress(null);
    }
  };

  const handleDeleteMarker = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus marker "${name}"?`)) return;

    try {
      const res = await fetch(`/api/markers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchMarkersAndProjects();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus marker');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', fontWeight: 800 }}>Pusat AR Target Marker</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Kelola foto & gambar pemicu AR (Logo, Poster, Kartu Nama) sebagai jangkar fisik konten 3D Anda
          </p>
        </div>

        <button
          onClick={() => {
            setShowUploadModal(true);
            setUploadFile(null);
            setPreviewUrl(null);
            setQualityScore(null);
            setMarkerName('');
            setUploadError(null);
          }}
          className="btn btn-primary"
          style={{ padding: '0.625rem 1.25rem', gap: '0.5rem' }}
        >
          <Upload size={17} /> Add Custom Marker
        </button>
      </div>

      {/* Guide Banner with Assemblr AR Marker explanation */}
      <div className="mobile-col" style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem'
      }}>
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(99, 102, 241, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary-light)',
          flexShrink: 0
        }}>
          <Sparkles size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Bagaimana Cara Kerja Target Marker AR?
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
            AR Marker adalah gambar pemicu: saat kamera ponsel diarahkan ke marker, objek 3D, foto, atau GIF bergerak proyek Anda muncul tepat di atas atau di depannya.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary-light)' }}>⬒ Orientasi Horizontal</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Objek 3D berdiri tegak di atas marker datar (meja, lantai, kertas).</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-light)' }}>▮ Orientasi Vertical</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Objek 3D muncul tegak di depan marker (poster dinding, kemasan berdiri).</div>
            </div>
          </div>
        </div>
      </div>

      {/* Markers Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <div className="animate-spin" style={{ width: '2rem', height: '2rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          Memuat daftar marker...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.25rem'
        }}>
          {markers.map((marker) => {
            const isHorizontal = (marker.orientation || 'HORIZONTAL') === 'HORIZONTAL';
            const score = marker.qualityScore ?? (marker.isDefault ? 98 : 85);
            const linkedProject = marker.projects?.[0];

            return (
              <div key={marker.id} className="glow-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                {/* Visual Target Container */}
                <div style={{
                  height: '190px',
                  background: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  padding: '1rem',
                  position: 'relative',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <img
                    src={marker.imageUrl}
                    alt={marker.name}
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                  />
                  {/* On-screen visual target badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    color: '#ffffff',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Monitor size={11} /> Target Visual
                  </div>
                </div>

                {/* Metadata & Badges */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge ${marker.isDefault ? 'badge-mode' : 'badge-published'}`}>
                      {marker.isDefault ? 'QR Marker Default' : 'Custom Marker'}
                    </span>

                    <span className="badge" style={{
                      background: isHorizontal ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                      color: isHorizontal ? 'var(--primary-light)' : 'var(--accent-light)',
                      border: `1px solid ${isHorizontal ? 'var(--primary)' : 'var(--accent)'}`,
                      fontSize: '0.7rem'
                    }}>
                      {isHorizontal ? '⬒ Horizontal (Meja)' : '▮ Vertical (Dinding)'}
                    </span>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
                    }}>
                      ★ {score}% {score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Poor'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {marker.name}
                  </h3>

                  {/* Linked Project info */}
                  <div style={{
                    fontSize: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '0.75rem'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>Proyek Terpasang: </span>
                    {linkedProject ? (
                      <Link
                        href={`/view/${linkedProject.slug}`}
                        target="_blank"
                        style={{ color: 'var(--accent-light)', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        {linkedProject.title} ↗
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Tersedia untuk proyek baru</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => setSelectedMarker(marker)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.45rem' }}
                    title="Buka target visual untuk discan di layar atau dicetak"
                  >
                    <Printer size={14} /> Cetak / Scan
                  </button>

                  <a
                    href={marker.imageUrl}
                    download={`${marker.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
                    target="_blank"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.45rem' }}
                  >
                    <Download size={14} /> Unduh
                  </a>

                  {/* MindAR Tracking Status & Compiler Trigger */}
                  {marker.patternUrl && marker.patternUrl.endsWith('.mind') ? (
                    <div style={{
                      gridColumn: 'span 2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      fontSize: '0.6875rem',
                      fontWeight: 700
                    }}>
                      <CheckCircle2 size={13} /> MindAR Image Tracking Aktif (.mind)
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCompileMarker(marker)}
                      disabled={compilingMarkerId === marker.id}
                      className="btn btn-secondary"
                      style={{
                        gridColumn: 'span 2',
                        fontSize: '0.75rem',
                        padding: '0.4rem',
                        justifyContent: 'center',
                        background: 'rgba(99, 102, 241, 0.12)',
                        borderColor: 'rgba(99, 102, 241, 0.35)',
                        color: 'var(--primary-light)'
                      }}
                      title="Ekstrak fitur gambar dan buat file .mind untuk pelacakan kamera AR presisi"
                    >
                      {compilingMarkerId === marker.id ? (
                        <>
                          <div className="animate-spin" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                          Mengompilasi MindAR... {compileProgress !== null ? `${compileProgress}%` : ''}
                        </>
                      ) : (
                        <>
                          <Zap size={13} /> Compile Target MindAR (.mind)
                        </>
                      )}
                    </button>
                  )}

                  {linkedProject && (
                    <Link
                      href={`/view/${linkedProject.slug}`}
                      target="_blank"
                      className="btn btn-accent"
                      style={{ gridColumn: 'span 2', fontSize: '0.75rem', padding: '0.45rem', justifyContent: 'center' }}
                    >
                      <Sparkles size={14} /> Buka WebAR Scanner Proyek ↗
                    </Link>
                  )}

                  {!marker.isDefault && (
                    <button
                      onClick={() => handleDeleteMarker(marker.id, marker.name)}
                      className="btn btn-secondary"
                      style={{ gridColumn: 'span 2', fontSize: '0.75rem', padding: '0.35rem', color: '#f87171', justifyContent: 'center' }}
                    >
                      <Trash2 size={13} /> Hapus Marker
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5-STEP CUSTOM MARKER SETUP MODAL */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-dialog" style={{ padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Setup Custom AR Marker</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Alur 5 langkah setup marker pemicu (berdasarkan standar Assemblr Studio)
                </div>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {uploadError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)',
                color: '#fca5a5',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem'
              }}>
                <AlertTriangle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUpload}>
              {/* STEP 1: Pilih File Gambar */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-published" style={{ borderRadius: '50%', width: '20px', height: '20px', padding: 0, justifyContent: 'center' }}>1</span>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Pilih File Gambar Marker</label>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem 1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    style={{ display: 'none' }}
                  />
                  {previewUrl ? (
                    <div>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ maxHeight: '130px', maxWidth: '130px', objectFit: 'contain', margin: '0 auto 0.5rem', background: '#fff', padding: '0.5rem', borderRadius: '4px' }}
                      />
                      <div style={{ fontSize: '0.8125rem', color: 'var(--accent-light)', fontWeight: 600 }}>Klik untuk mengganti gambar</div>
                    </div>
                  ) : (
                    <div>
                      <QrCode size={36} color="var(--primary-light)" style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Pilih Gambar (Logo, Poster, Kartu Nama)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Format PNG atau JPG (8-bit / 24-bit). Hindari gambar yang terlalu polos.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: Beri Nama Marker */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-published" style={{ borderRadius: '50%', width: '20px', height: '20px', padding: 0, justifyContent: 'center' }}>2</span>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Beri Nama Marker</label>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Logo Perusahaan, Poster Edukasi BM3, Kartu Nama"
                  value={markerName}
                  onChange={(e) => setMarkerName(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* STEP 3: Pasangkan ke Proyek */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-published" style={{ borderRadius: '50%', width: '20px', height: '20px', padding: 0, justifyContent: 'center' }}>3</span>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Pilih Proyek yang Dipasangkan</label>
                </div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="form-input"
                  style={{ background: 'var(--bg-dark)' }}
                >
                  <option value="">-- Pasangkan nanti atau pilih saat buat proyek --</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.title} ({proj.slug})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Satu marker dipasangkan ke satu proyek AR utama agar kamera langsung memunculkan proyek ini.
                </div>
              </div>

              {/* STEP 4: Evaluasi Kualitas Gambar */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-published" style={{ borderRadius: '50%', width: '20px', height: '20px', padding: 0, justifyContent: 'center' }}>4</span>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Penilaian Kualitas Tracking Kamera</label>
                </div>

                {qualityScore !== null ? (
                  <div style={{
                    padding: '0.875rem',
                    background: qualityRating === 'EXCELLENT' ? 'rgba(16, 185, 129, 0.12)' : qualityRating === 'GOOD' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${qualityRating === 'EXCELLENT' ? 'rgba(16, 185, 129, 0.35)' : qualityRating === 'GOOD' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: qualityRating === 'EXCELLENT' ? '#34d399' : qualityRating === 'GOOD' ? '#fbbf24' : '#f87171' }}>
                        Skor Kualitas: {qualityScore}% ({qualityRating})
                      </span>
                      {qualityRating === 'EXCELLENT' ? (
                        <CheckCircle2 size={18} color="#34d399" />
                      ) : (
                        <AlertTriangle size={18} color={qualityRating === 'GOOD' ? '#fbbf24' : '#f87171'} />
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {qualityText}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pilih file gambar terlebih dahulu untuk melihat hasil penilaian kualitas deteksi.
                  </div>
                )}
              </div>

              {/* STEP 5: Pilih Orientasi */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-published" style={{ borderRadius: '50%', width: '20px', height: '20px', padding: 0, justifyContent: 'center' }}>5</span>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Pilih Orientasi Penempatan Objek</label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div
                    onClick={() => setOrientation('HORIZONTAL')}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: orientation === 'HORIZONTAL' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                      border: orientation === 'HORIZONTAL' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>⬒</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: orientation === 'HORIZONTAL' ? 'var(--primary-light)' : 'var(--text-main)' }}>
                      Horizontal
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Objek berdiri di atas marker datar (meja/lantai)
                    </div>
                  </div>

                  <div
                    onClick={() => setOrientation('VERTICAL')}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: orientation === 'VERTICAL' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                      border: orientation === 'VERTICAL' ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>▮</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: orientation === 'VERTICAL' ? 'var(--accent-light)' : 'var(--text-main)' }}>
                      Vertical
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Objek muncul di depan marker (poster/dinding)
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 6: MindAR Feature Compilation Toggle & Progress */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-md)'
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoCompileMind}
                    onChange={(e) => setAutoCompileMind(e.target.checked)}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Zap size={14} /> Otomatis Ekstrak & Compile Target MindAR (.mind)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                      Mengekstrak titik fitur visual gambar secara otomatis di browser sehingga dapat dilacak secara akurat dengan kamera WebAR.
                    </div>
                  </div>
                </label>

                {uploading && compileProgress !== null && (
                  <div style={{ marginTop: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                      <span>{compileStatusText || 'Memproses target visual...'}</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{compileProgress}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${compileProgress}%`, background: 'var(--primary)', transition: 'width 0.2s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="btn btn-primary"
                  style={{ padding: '0.625rem 1.5rem' }}
                >
                  {uploading ? 'Mengunggah & Memasang...' : 'Upload & Pasangkan Marker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT / ON-SCREEN TARGET MODAL */}
      {selectedMarker && (
        <div className="modal-overlay">
          <div className="glass-panel modal-dialog" style={{ padding: '1.5rem', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Visual Target Marker AR</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Arahkan kamera ponsel Anda ke gambar ini untuk memunculkan AR
                </div>
              </div>
              <button onClick={() => setSelectedMarker(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* Target Display Frame */}
            <div style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              marginBottom: '1.25rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              border: '3px solid #000000'
            }}>
              <img
                src={selectedMarker.imageUrl}
                alt={selectedMarker.name}
                style={{ width: '250px', height: '250px', objectFit: 'contain' }}
              />
              <div style={{ color: '#0f172a', fontSize: '0.875rem', fontWeight: 800, marginTop: '0.75rem' }}>
                {selectedMarker.name}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                Orientasi: {(selectedMarker.orientation || 'HORIZONTAL') === 'HORIZONTAL' ? 'Horizontal (Di Atas Meja)' : 'Vertical (Di Depan Dinding)'}
              </div>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.75rem',
              color: 'var(--accent-light)',
              marginBottom: '1.25rem',
              textAlign: 'left'
            }}>
              💡 <strong>Tips Pengujian Langsung Tanpa Cetak:</strong> Biarkan modal ini terbuka di monitor komputer Anda, buka link viewer AR di ponsel, dan arahkan kamera ponsel ke gambar di atas!
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (printWin) {
                    printWin.document.write(`
                      <html>
                        <head><title>Cetak Marker AR - ${selectedMarker.name}</title></head>
                        <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center;">
                          <h2>TARGET AR MARKER: ${selectedMarker.name}</h2>
                          <div style="border:4px solid #000; padding:20px; display:inline-block;">
                            <img src="${selectedMarker.imageUrl}" style="width:400px; height:400px; object-fit:contain;" />
                          </div>
                          <p style="margin-top:20px; font-weight:bold; color:#1e293b;">AR STUDIO BM3 — Buka link proyek lalu arahkan kamera browser ponsel ke gambar ini</p>
                          <p style="font-size:12px; color:#64748b;">Orientasi: ${(selectedMarker.orientation || 'HORIZONTAL') === 'HORIZONTAL' ? 'Horizontal (Letakkan di atas meja/lantai)' : 'Vertical (Tempel di dinding/poster tegak)'}</p>
                          <script>window.onload = function() { window.print(); }<\/script>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }
                }}
                className="btn btn-primary"
              >
                <Printer size={16} /> Buka Dialog Cetak
              </button>

              <button
                onClick={() => setSelectedMarker(null)}
                className="btn btn-secondary"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
