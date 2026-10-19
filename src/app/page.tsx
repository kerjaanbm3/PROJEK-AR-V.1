import Link from 'next/link';
import prisma from '@/lib/prisma';
import { Box, Sparkles, Layers, Eye, ArrowRight, ShieldCheck, QrCode, Camera } from 'lucide-react';
import ScanMarkerARButton from '@/components/common/ScanMarkerARButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const projectCount = await prisma.project.count();
  const assetCount = await prisma.asset.count();
  const demoProject = await prisma.project.findFirst({
    where: { slug: 'demo-kantor-ar' },
    include: { marker: true }
  }) || await prisma.project.findFirst({
    where: { status: 'PUBLISHED' },
    include: { marker: true }
  }) || await prisma.project.findFirst({
    include: { marker: true }
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 12, 19, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
            flexShrink: 0
          }}>
            <Box size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              AR STUDIO <span style={{ color: 'var(--primary-light)' }}>BM3</span>
            </h1>
            <p className="hide-on-mobile" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Platform Pembuat Konten 3D & AR</p>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {demoProject && (
            <Link href={`/view/${demoProject.slug}?ar=1`} className="btn btn-secondary hide-on-mobile" style={{ fontSize: '0.8125rem' }}>
              <Camera size={15} /> Pindai AR (Kamera)
            </Link>
          )}
          <Link href="/dashboard" className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}>
            <span>Studio</span> <ArrowRight size={15} />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient Glow Orbs */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.08) 50%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ maxWidth: '840px', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.875rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: 'var(--primary-light)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginBottom: '1.5rem'
          }}>
            <Sparkles size={14} /> Solusi Visual 3D & Augmented Reality Tanpa Coding
          </div>

          <h2 style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '1.25rem'
          }}>
            Ciptakan dan Bagikan Pengalaman <br />
            <span className="gradient-text">3D & Augmented Reality</span>
          </h2>

          <p style={{
            fontSize: '1.125rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '650px',
            margin: '0 auto 2.5rem auto'
          }}>
            Buat konten AR interaktif dalam kurang dari 5 menit. Penonton cukup membuka satu tautan atau memindai kode QR melalui browser ponsel tanpa perlu mengunduh aplikasi tambahan.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: '0.875rem 1.75rem', fontSize: '1rem', minWidth: '220px' }}>
              <Layers size={18} /> Buka Dashboard Studio
            </Link>
            {demoProject && (
              <ScanMarkerARButton
                slug={demoProject.slug}
                title={demoProject.title}
                markerImage={demoProject.marker?.imageUrl || '/markers/card.png'}
                markerName={demoProject.marker?.name || 'Kartu Target MindAR'}
                markerOrientation={demoProject.marker?.orientation || 'HORIZONTAL'}
              />
            )}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          maxWidth: '1100px',
          width: '100%',
          marginTop: '3.5rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div className="glow-card" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-light)',
              marginBottom: '1rem'
            }}>
              <Sparkles size={20} />
            </div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Super Simple Editor</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Alur cepat 3 langkah: pilih marker AR, pilih objek 3D dari library, atur ukuran, lalu langsung bagikan dalam hitungan menit.
            </p>
          </div>

          <div className="glow-card" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-light)',
              marginBottom: '1rem'
            }}>
              <Box size={20} />
            </div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Default 3D Studio</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Kontrol penuh Three.js dengan Transform Gizmo (geser, putar, skala), teks 3D, material PBR, pencahayaan, dan auto-save real-time.
            </p>
          </div>

          <div className="glow-card" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              marginBottom: '1rem'
            }}>
              <QrCode size={20} />
            </div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Universal Web Viewer</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tampilan 3D Orbit dan Augmented Reality berbasis kamera ponsel. Tanpa perlu unduh aplikasi dari Play Store atau App Store.
            </p>
          </div>
        </div>
      </section>

      {/* Responsive Footer */}
      <footer style={{
        padding: '1.25rem 1.5rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        background: 'rgba(7, 8, 13, 0.95)'
      }}>
        <div>AR STUDIO BM3 &copy; 2026 &bull; Sistem Internal Kantor</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{projectCount} Proyek Aktif</span>
          <span>&bull;</span>
          <span>{assetCount} Aset 3D</span>
          <span>&bull;</span>
          <Link href="/login" style={{ color: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <ShieldCheck size={14} /> Login Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
