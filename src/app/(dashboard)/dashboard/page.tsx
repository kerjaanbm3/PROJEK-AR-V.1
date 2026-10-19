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
  X,
  Edit2,
  Globe,
  Lock,
  LayoutTemplate,
  CreditCard,
  Package
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
  const [selectedTemplate, setSelectedTemplate] = useState<'DEFAULT' | 'BUSINESS_CARD' | 'PRODUCT_SHOWCASE' | 'MULTI_SLIDE'>('DEFAULT');
  const [creating, setCreating] = useState(false);

  // Edit Project / Rename modal state
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('DRAFT');
  const [savingEdit, setSavingEdit] = useState(false);

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
          mode: newMode,
          template: selectedTemplate
        })
      });

      const data = await res.json();
      if (res.ok && data.project) {
        setShowCreateModal(false);
        setNewTitle('');
        setSelectedTemplate('DEFAULT');
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

  const handleOpenEdit = (p: Project) => {
    setEditProject(p);
    setEditTitle(p.title);
    setEditDescription(p.description || '');
    setEditStatus(p.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/projects/${editProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          status: editStatus
        })
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === editProject.id
              ? { ...p, title: editTitle.trim(), description: editDescription.trim() || null, status: editStatus }
              : p
          )
        );
        setEditProject(null);
      } else {
        alert('Gagal menyimpan perubahan');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleQuickStatusChange = async (projectId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DRAFT' ? 'PUBLISHED' : currentStatus === 'PUBLISHED' ? 'PRIVATE' : 'DRAFT';
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: nextStatus } : p))
        );
      }
    } catch (err) {
      console.error(err);
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
          {['ALL', 'PUBLISHED', 'DRAFT', 'PRIVATE'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`btn ${filterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}
            >
              {st === 'ALL' ? 'Semua' : st === 'PUBLISHED' ? 'Publik' : st === 'PRIVATE' ? 'Privat' : 'Draft'}
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

                  {/* Status Toggle Button */}
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                    <button
                      onClick={() => handleQuickStatusChange(project.id, project.status)}
                      title="Klik untuk ubah status: Draft / Publik / Privat"
                      className={`badge ${
                        project.status === 'PUBLISHED'
                          ? 'badge-published'
                          : project.status === 'PRIVATE'
                          ? 'badge-private'
                          : 'badge-draft'
                      }`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      {project.status === 'PUBLISHED' ? (
                        <>
                          <Globe size={11} /> Publik
                        </>
                      ) : project.status === 'PRIVATE' ? (
                        <>
                          <Lock size={11} /> Privat
                        </>
                      ) : (
                        'Draft'
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <h3 style={{ fontSize: '1.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {project.title}
                    </h3>
                    <button
                      onClick={() => handleOpenEdit(project)}
                      title="Ubah Nama & Pengaturan"
                      className="btn-icon"
                      style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
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
                      onClick={() => handleOpenEdit(project)}
                      title="Edit Nama & Status"
                      className="btn-icon"
                    >
                      <Edit2 size={15} />
                    </button>

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

              {/* Template Selection */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <LayoutTemplate size={14} color="var(--primary-light)" /> Pilih Template Awal
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.4rem' }}>
                  <div
                    onClick={() => setSelectedTemplate('DEFAULT')}
                    style={{
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      background: selectedTemplate === 'DEFAULT' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedTemplate === 'DEFAULT' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-light)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.2rem' }}>
                      <Box size={14} /> Proyek Kosong
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      Kanvas 3D kosong untuk mulai berkarya dari nol.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('BUSINESS_CARD')}
                    style={{
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      background: selectedTemplate === 'BUSINESS_CARD' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedTemplate === 'BUSINESS_CARD' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-light)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.2rem' }}>
                      <CreditCard size={14} /> Kartu Nama AR
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      Profil profesional, teks 3D & tombol link interaktif.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('PRODUCT_SHOWCASE')}
                    style={{
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      background: selectedTemplate === 'PRODUCT_SHOWCASE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedTemplate === 'PRODUCT_SHOWCASE' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.2rem' }}>
                      <Package size={14} /> Showcase Produk
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      Etalase 3D dengan animasi putar & teks info spesifikasi.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('MULTI_SLIDE')}
                    style={{
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      background: selectedTemplate === 'MULTI_SLIDE' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedTemplate === 'MULTI_SLIDE' ? '1px solid #ec4899' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f472b6', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.2rem' }}>
                      <Layers size={14} /> Multi-Slide AR
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      Presentasi 3 slide berurutan dengan tombol navigasi.
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

      {/* Edit / Rename Project Modal */}
      {editProject && (
        <div className="modal-overlay">
          <div className="glass-panel modal-dialog" style={{ padding: '1.5rem', maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={18} color="var(--primary-light)" />
                <h2 style={{ fontSize: '1.25rem' }}>Pengaturan Proyek</h2>
              </div>
              <button onClick={() => setEditProject(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Nama / Judul Proyek</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
                  placeholder="Nama proyek..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi (Opsional)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="Keterangan singkat tentang proyek ini..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Status Akses</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.35rem' }}>
                  {[
                    { id: 'DRAFT', label: 'Draft', desc: 'Hanya di editor' },
                    { id: 'PUBLISHED', label: 'Publik', desc: 'Bisa dilihat semua' },
                    { id: 'PRIVATE', label: 'Privat', desc: 'Akses terbatas' }
                  ].map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setEditStatus(s.id)}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: editStatus === s.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: editStatus === s.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: editStatus === s.id ? '#ffffff' : 'var(--text-secondary)' }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {s.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditProject(null)}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editTitle.trim()}
                  className="btn btn-primary"
                >
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
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
