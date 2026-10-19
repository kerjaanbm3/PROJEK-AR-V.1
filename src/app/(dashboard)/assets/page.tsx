'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Box,
  Image as ImageIcon,
  Music,
  Video,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  FileCode,
  HardDrive
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isDefault: boolean;
  createdAt: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error('Fetch assets error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, ''));
      }
      setUploadError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName);

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah berkas');
      }

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadName('');
      fetchAssets();
    } catch (err: any) {
      setUploadError(err.message || 'Gagal mengunggah berkas');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus aset "${name}" dari pustaka?`)) return;

    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setAssets(assets.filter((a) => a.id !== id));
      } else {
        alert(data.error || 'Gagal menghapus aset');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'MODEL_3D':
        return <Box size={24} color="var(--primary-light)" />;
      case 'IMAGE':
        return <ImageIcon size={24} color="var(--accent-light)" />;
      case 'AUDIO':
        return <Music size={24} color="#34d399" />;
      case 'VIDEO':
        return <Video size={24} color="#fbbf24" />;
      default:
        return <FileCode size={24} color="var(--text-secondary)" />;
    }
  };

  const filteredAssets = assets.filter((a) => {
    const matchesType = typeFilter === 'ALL' || a.type === typeFilter;
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalStorage = assets.reduce((acc, a) => acc + a.fileSize, 0);

  return (
    <div>
      {/* Header & Upload Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', fontWeight: 800 }}>Pustaka Aset 3D & Media</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Unggah dan kelola model 3D (GLB/glTF), gambar banner, serta audio untuk proyek AR
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary"
        >
          <Upload size={16} /> Unggah Aset Baru
        </button>
      </div>

      {/* Storage and Stat Bar */}
      <div className="mobile-col" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-card)',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-light)',
            flexShrink: 0
          }}>
            <HardDrive size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Total Penggunaan Penyimpanan</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              {formatFileSize(totalStorage)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 10 GB (Server Kantor)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'MODEL_3D', label: 'Model 3D (GLB)' },
            { id: 'IMAGE', label: 'Gambar' },
            { id: 'AUDIO', label: 'Audio' },
            { id: 'VIDEO', label: 'Video' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`btn ${typeFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem', maxWidth: '360px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari nama aset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <div className="animate-spin" style={{ width: '2rem', height: '2rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          Memuat berkas aset...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Box size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Tidak ada aset ditemukan</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Unggah file 3D GLB/glTF atau gambar untuk mulai menggunakannya di editor
          </p>
          <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
            <Upload size={16} /> Unggah Sekarang
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="glow-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                height: '110px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden'
              }}>
                {asset.type === 'IMAGE' ? (
                  <img src={asset.fileUrl} alt={asset.name} style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  getIcon(asset.type)
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span className="badge" style={{ fontSize: '0.6875rem', background: 'rgba(255,255,255,0.06)' }}>
                    {asset.type.replace('_', ' ')}
                  </span>
                  {asset.isDefault && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                      Bawaan
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {asset.name}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatFileSize(asset.fileSize)}
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <a
                  href={asset.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--accent-light)', textDecoration: 'underline' }}
                >
                  Buka File
                </a>

                {!asset.isDefault && (
                  <button
                    onClick={() => handleDelete(asset.id, asset.name)}
                    className="btn-icon"
                    style={{ color: '#f87171' }}
                    title="Hapus Aset"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-dialog" style={{ padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Unggah Aset Baru</h2>
              <button onClick={() => setShowUploadModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {uploadError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '0.8125rem',
                marginBottom: '1rem'
              }}>
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUpload}>
              {/* Drop area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.02)',
                  marginBottom: '1.25rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".glb,.gltf,.png,.jpg,.jpeg,.svg,.webp,.mp3,.mp4"
                  style={{ display: 'none' }}
                />
                <Upload size={32} color="var(--primary-light)" style={{ margin: '0 auto 0.75rem' }} />
                {uploadFile ? (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                      {uploadFile.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {formatFileSize(uploadFile.size)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                      Klik untuk memilih berkas
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Mendukung .GLB, .glTF, .PNG, .JPG, .MP3 (Maks 30MB)
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Nama Aset (Opsional)</label>
                <input
                  type="text"
                  placeholder="Nama display aset..."
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="form-input"
                />
              </div>

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
                >
                  {uploading ? 'Mengunggah...' : 'Unggah Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
