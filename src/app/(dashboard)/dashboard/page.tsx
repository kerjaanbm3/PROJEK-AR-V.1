'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Zap,
  Box,
  Copy,
  Trash2,
  ExternalLink,
  QrCode,
  Share2,
  Search,
  Check,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';
import QRCode from 'qrcode';

interface Project {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  mode: string;
  status: string;
  updatedAt: string;
  marker: {
    name: string;
    imageUrl: string;
  } | null;
  scenes: {
    id: string;
    objects: any[];
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMode, setNewMode] = useState<'SIMPLE' | 'DEFAULT'>('DEFAULT');
  const [creating, setCreating] = useState(false);

  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          mode: newMode
        })
      });

      const data = await res.json();
      if (res.ok && data.project) {
        setShowCreateModal(false);
        setNewTitle('');
        if (newMode === 'SIMPLE') {
          router.push(`/editor/simple/${data.project.id}`);
        } else {
          router.push(`/editor/${data.project.id}`);
        }
      } else {
        alert(data.error || 'Gagal membuat proyek');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        fetchProjects();
      } else {
        alert('Gagal menduplikasi proyek');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus proyek "${title}"?`)) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      } else {
        alert('Gagal menghapus proyek');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenShare = async (project: Project) => {
    setShareProject(project);
    setCopiedLink(false);
    setCopiedEmbed(false);

    const shareUrl = `${window.location.origin}/view/${project.slug}`;
    try {
      const qr = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setQrDataUrl(qr);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Page Title & Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', fontWeight: 800 }}>Studio Proyek 3D & AR</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Kelola, sunting, dan bagikan seluruh konten Augmented Reality internal
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: 'auto' }}>
          <button
            onClick={() => {
              setNewMode('SIMPLE');
              setShowCreateModal(true);
            }}
            className="btn btn-accent"
            style={{ fontSize: '0.8125rem' }}
          >
            <Zap size={15} /> Super Simple Editor
          </button>
          <button
            onClick={() => {
              setNewMode('DEFAULT');
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
            style={{ fontSize: '0.8125rem' }}
          >
            <Plus size={15} /> Proyek Baru (Full 3D)
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.875rem',
        marginBottom: '1.75rem'
      }}>
        <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Proyek</span>
            <Layers size={18} color="var(--primary-light)" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{projects.length}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Super Simple Proyek</span>
            <Zap size={18} color="var(--accent-light)" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {projects.filter((p) => p.mode === 'SIMPLE').length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Default 3D Studio</span>
            <Box size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {projects.filter((p) => p.mode === 'DEFAULT').length}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari proyek berdasarkan judul..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', maxWidth: '100%' }}>
          {['ALL', 'PUBLISHED', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`btn ${filterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}
            >
              {st === 'ALL' ? 'Semua' : st === 'PUBLISHED' ? 'Terpublikasi' : 'Draft'}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <div className="animate-spin" style={{ width: '2rem', height: '2rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          Memuat daftar proyek...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Box size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Belum ada proyek yang ditemukan</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {search ? 'Coba ubah kata kunci pencarian Anda' : 'Mulai buat konten 3D atau AR pertama Anda sekarang'}
          </p>
          <button
            onClick={() => {
              setNewMode('SIMPLE');
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
          >
            <Sparkles size={16} /> Buat Proyek Pertama
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredProjects.map((project) => {
            const objectCount = project.scenes.reduce((acc, s) => acc + (s.objects?.length || 0), 0);
            return (
              <div key={project.id} className="glow-card" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Card Top Preview / Banner */}
                <div style={{
                  height: '140px',
                  background: 'linear-gradient(135deg, rgba(30, 35, 55, 0.9) 0%, rgba(15, 18, 30, 0.95) 100%)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {project.marker?.imageUrl ? (
                    <img
                      src={project.marker.imageUrl}
                      alt={project.marker.name}
                      style={{ height: '80px', width: '80px', objectFit: 'contain', opacity: 0.85, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
                    />
                  ) : (
                    <Box size={44} color="var(--primary-light)" style={{ opacity: 0.6 }} />
                  )}

                  {/* Mode Tag */}
                  <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                    <span className="badge badge-mode">
                      {project.mode === 'SIMPLE' ? '⚡ Super Simple' : '🎨 3D Studio'}
                    </span>
                  </div>

                  {/* Status Tag */}
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                    <span className={`badge ${project.status === 'PUBLISHED' ? 'badge-published' : 'badge-draft'}`}>
                      {project.status === 'PUBLISHED' ? 'Publik' : 'Draft'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '0.375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {project.title}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4rem' }}>
                    {project.description || 'Konten interaktif 3D & AR berbasis browser.'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Box size={13} /> {objectCount} Objek
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={13} /> {new Date(project.updatedAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>

                  {/* Card Actions Footer */}
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <Link
                      href={project.mode === 'SIMPLE' ? `/editor/simple/${project.id}` : `/editor/${project.id}`}
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '0.8125rem', padding: '0.45rem 0.75rem' }}
                    >
                      Buka Editor
                    </Link>

                    <button
                      onClick={() => handleOpenShare(project)}
                      title="Bagikan & QR Code"
                      className="btn-icon"
                    >
                      <Share2 size={15} />
                    </button>

                    <Link
                      href={`/view/${project.slug}`}
                      target="_blank"
                      title="Lihat Pratinjau 3D/AR"
                      className="btn-icon"
                    >
                      <ExternalLink size={15} />
                    </Link>

                    <button
                      onClick={() => handleDuplicate(project.id)}
                      title="Duplikat Proyek"
                      className="btn-icon"
                    >
                      <Copy size={15} />
                    </button>

                    <button
                      onClick={() => handleDelete(project.id, project.title)}
                      title="Hapus Proyek"
                      className="btn-icon"
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-dialog" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Buat Proyek AR Baru</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Judul Proyek</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Showcase Produk BM3 / Logo 3D AR"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Pilih Mode Editor</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div
                    onClick={() => setNewMode('SIMPLE')}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: newMode === 'SIMPLE' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: newMode === 'SIMPLE' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-light)', fontWeight: 700, marginBottom: '0.25rem' }}>
                      <Zap size={16} /> Super Simple
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      3 Langkah cepat: Marker, Objek 3D, Ukuran. Selesai &lt; 2 menit.
                    </p>
                  </div>

                  <div
                    onClick={() => setNewMode('DEFAULT')}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: newMode === 'DEFAULT' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: newMode === 'DEFAULT' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-light)', fontWeight: 700, marginBottom: '0.25rem' }}>
                      <Box size={16} /> 3D Studio
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Editor penuh dengan transform gizmo, teks 3D, lampu, & multi-objek.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="btn btn-primary"
                >
                  {creating ? 'Membuat...' : 'Mulai Desain'} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share & QR Code Modal */}
      {shareProject && (
        <div className="modal-overlay">
          <div className="glass-panel modal-dialog" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Bagikan Konten 3D & AR</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{shareProject.title}</p>
              </div>
              <button onClick={() => setShareProject(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* QR Code Section */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR Code Proyek"
                  style={{ width: '180px', height: '180px', margin: '0 auto', display: 'block' }}
                />
              )}
              <p style={{ color: '#0f172a', fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.5rem' }}>
                Arahkan kamera ponsel rekan kantor untuk melihat dalam 3D / AR
              </p>
            </div>

            {/* Direct URL */}
            <div className="form-group">
              <label className="form-label">Tautan Publik Proyek</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/view/${shareProject.slug}`}
                  className="form-input"
                  style={{ fontSize: '0.8125rem' }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/view/${shareProject.slug}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 0.875rem' }}
                >
                  {copiedLink ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Embed Code */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Kode Embed Intranet (iframe)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/view/${shareProject.slug}" width="100%" height="500px" frameborder="0" allow="camera; xr-spatial-tracking"></iframe>`}
                  className="form-input"
                  style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`<iframe src="${window.location.origin}/view/${shareProject.slug}" width="100%" height="500px" frameborder="0" allow="camera; xr-spatial-tracking"></iframe>`);
                    setCopiedEmbed(true);
                    setTimeout(() => setCopiedEmbed(false), 2000);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 0.875rem' }}
                >
                  {copiedEmbed ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShareProject(null)} className="btn btn-primary" style={{ width: '100%' }}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
