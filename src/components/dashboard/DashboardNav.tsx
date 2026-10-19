'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Layers,
  Image as ImageIcon,
  QrCode,
  LogOut,
  ExternalLink,
  Settings,
  X,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  user: {
    email: string;
    name?: string | null;
    role: string;
  };
}

export default function DashboardNav({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok' });
      return;
    }

    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Kata sandi baru minimal 6 karakter' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Kata sandi berhasil diperbarui!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Gagal mengubah kata sandi' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Terjadi kesalahan sistem' });
    } finally {
      setSavingPassword(false);
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Proyek 3D/AR', icon: Layers },
    { href: '/assets', label: 'Pustaka Aset', icon: ImageIcon },
    { href: '/markers', label: 'Marker AR', icon: QrCode },
  ];

  return (
    <>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.25rem',
        background: 'rgba(10, 12, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
              flexShrink: 0
            }}>
              <Box size={20} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                AR STUDIO <span style={{ color: 'var(--primary-light)' }}>BM3</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Icon size={16} color={isActive ? 'var(--primary-light)' : 'currentColor'} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            href="/view/demo-kantor-ar"
            target="_blank"
            className="btn btn-secondary hide-on-mobile"
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.875rem' }}
          >
            <ExternalLink size={14} /> Lihat Demo AR
          </Link>

          {/* User Info & Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              color: 'inherit'
            }}
            title="Pengaturan Akun & Ganti Kata Sandi"
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 8px var(--success)',
              flexShrink: 0
            }} />
            <span className="hide-on-mobile" style={{ color: 'var(--text-secondary)' }}>{user.email}</span>
            <Settings size={14} color="var(--text-muted)" />
          </button>

          <button
            onClick={handleLogout}
            title="Keluar / Logout"
            className="btn-icon"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible only on screens <= 768px) */}
      <nav className="mobile-bottom-nav">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-bottom-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} color={isActive ? 'var(--primary-light)' : 'currentColor'} />
              <span>{link.label.split(' ')[0]}</span>
            </Link>
          );
        })}
        <Link
          href="/view/demo-kantor-ar"
          target="_blank"
          className="mobile-bottom-link"
        >
          <ExternalLink size={20} />
          <span>Demo AR</span>
        </Link>
        <button
          onClick={() => setShowSettings(true)}
          className="mobile-bottom-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Settings size={20} />
          <span>Akun</span>
        </button>
      </nav>

      {/* Account & Security Settings Modal */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="glass-panel modal-dialog" style={{ padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} color="var(--primary-light)" />
                <h2 style={{ fontSize: '1.25rem' }}>Pengaturan Akun Admin</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Akun Pengelola</div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{user.email}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', marginTop: '0.25rem' }}>Peran: {user.role} (Pemilik Sistem)</div>
            </div>

            {statusMessage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: statusMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: statusMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                color: statusMessage.type === 'success' ? '#34d399' : '#fca5a5',
                fontSize: '0.8125rem',
                marginBottom: '1rem'
              }}>
                {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lock size={15} color="var(--accent-light)" /> Ganti Kata Sandi
              </div>

              <div className="form-group">
                <label className="form-label">Kata Sandi Saat Ini</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kata Sandi Baru (min. 6 karakter)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Ulangi Kata Sandi Baru</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="btn btn-secondary"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || !currentPassword || !newPassword}
                  className="btn btn-primary"
                >
                  {savingPassword ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
