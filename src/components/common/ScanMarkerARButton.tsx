'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Smartphone,
  Eye,
  Monitor,
  Printer,
  Download,
  X,
  Sparkles,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';

interface ScanMarkerARButtonProps {
  slug: string;
  title?: string;
  markerImage?: string;
  markerName?: string;
  markerOrientation?: string;
}

export default function ScanMarkerARButton({
  slug,
  title = 'Demo AR Interaktif',
  markerImage = '/markers/card.png',
  markerName = 'Kartu Target MindAR',
  markerOrientation = 'HORIZONTAL'
}: ScanMarkerARButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [localIp, setLocalIp] = useState<string>('localhost');
  const [selectedIp, setSelectedIp] = useState<string>('localhost');
  const [ipList, setIpList] = useState<{ name: string; ip: string }[]>([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [fullScreenTarget, setFullScreenTarget] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch host LAN IP
  useEffect(() => {
    async function fetchNetworkInfo() {
      try {
        const res = await fetch('/api/network-info');
        if (res.ok) {
          const data = await res.json();
          if (data.localIp && data.localIp !== 'localhost') {
            setLocalIp(data.localIp);
            setSelectedIp(data.localIp);
          }
          if (data.addresses && Array.isArray(data.addresses)) {
            setIpList(data.addresses);
          }
        }
      } catch (e) {
        console.error('Failed to get network info', e);
      }
    }

    if (isOpen) {
      fetchNetworkInfo();
    }
  }, [isOpen]);

  // Compute mobile scanner URL with ?ar=1 so camera turns on immediately
  const port = typeof window !== 'undefined' && window.location.port ? window.location.port : '3000';
  let mobileScannerUrl = '';
  if (selectedIp === 'localhost') {
    mobileScannerUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/view/${slug}?ar=1`
      : `http://localhost:${port}/view/${slug}?ar=1`;
  } else {
    mobileScannerUrl = `http://${selectedIp}:${port}/view/${slug}?ar=1`;
  }

  // Generate QR code for mobile
  useEffect(() => {
    if (!mobileScannerUrl) return;

    QRCode.toDataURL(mobileScannerUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(setQrCodeDataUrl).catch(console.error);
  }, [mobileScannerUrl]);

  const handleLaunchCamera = () => {
    router.push(`/view/${slug}?ar=1`);
  };

  return (
    <>
      {/* Primary Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary"
        style={{
          padding: '0.875rem 1.75rem',
          fontSize: '1rem',
          minWidth: '220px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.625rem',
          background: 'linear-gradient(135deg, rgba(30, 35, 60, 0.95) 0%, rgba(18, 20, 36, 0.98) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.25)',
          color: '#ffffff',
          fontWeight: 700,
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="Buka Kamera untuk Pindai Gambar Marker AR"
      >
        <Camera size={19} color="var(--primary-light)" />
        <span>Pindai Marker AR (Kamera)</span>
      </button>

      {/* Camera & Scanner Selector Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 13, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '680px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '1.75rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glow)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <Camera size={17} />
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Kamera Pemindai Target Marker AR</h2>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Pindai gambar target fisik menggunakan kamera untuk memunculkan visual 3D AR secara otomatis.
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="btn-icon" style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            {/* Direct Instant Camera Launcher (Great for mobile & webcam) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(244, 63, 94, 0.15) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.35rem' }}>
                Buka Kamera di Perangkat Ini Sekarang
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', maxWidth: '480px', margin: '0 auto 1rem auto' }}>
                Klik tombol di bawah ini untuk langsung menyalakan kamera (webcam PC atau kamera ponsel) dan memindai target marker secara instan.
              </p>
              <button
                type="button"
                onClick={handleLaunchCamera}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  boxShadow: '0 0 20px rgba(99, 102, 241, 0.45)',
                  gap: '0.5rem'
                }}
              >
                <Camera size={18} /> Mulai Kamera Pemindai AR <ChevronRight size={16} />
              </button>
            </div>

            {/* Two-Column Options for Mobile Testing & Target Display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              {/* Left Column: QR Code for Phone Camera */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <Smartphone size={16} color="var(--primary-light)" />
                  <span>Pindai Menggunakan HP</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
                  Buka kamera HP atau Google Lens lalu scan QR code ini:
                </p>

                <div style={{
                  background: '#ffffff',
                  padding: '0.625rem',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  marginBottom: '0.75rem'
                }}>
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR Scanner HP" style={{ width: '150px', height: '150px', display: 'block' }} />
                  ) : (
                    <div style={{ width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QrCode size={40} color="#0f172a" />
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {mobileScannerUrl}
                </div>
              </div>

              {/* Right Column: Physical Target Marker Preview */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <Eye size={16} color="var(--accent)" />
                  <span>Gambar Target Marker</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
                  Arahkan kamera ke gambar ini agar visual AR 3D muncul:
                </p>

                <div style={{
                  background: '#ffffff',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #000000',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  marginBottom: '0.75rem',
                  height: '150px',
                  width: '150px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={markerImage}
                    alt={markerName}
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                  />
                </div>

                {/* Full-Screen Monitor Button */}
                <button
                  type="button"
                  onClick={() => setFullScreenTarget(true)}
                  className="btn btn-accent"
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.45rem 0.5rem', justifyContent: 'center', marginBottom: '0.5rem' }}
                  title="Tampilkan gambar target besar di layar laptop agar bisa langsung discan kamera HP"
                >
                  <Monitor size={14} /> Tampilkan di Monitor (Scan dari HP)
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const printWin = window.open('', '_blank');
                      if (printWin) {
                        printWin.document.write(`
                          <html>
                            <head><title>Cetak Marker AR - ${markerName}</title></head>
                            <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center;">
                              <h2>TARGET AR: ${title}</h2>
                              <div style="border:4px solid #000; padding:20px; display:inline-block;">
                                <img src="${markerImage}" style="width:380px; height:380px; object-fit:contain;" />
                              </div>
                              <p style="margin-top:20px; font-weight:bold; font-size:16px;">AR STUDIO BM3</p>
                              <p style="color:#64748b; font-size:13px;">Buka kamera AR viewer ponsel lalu arahkan kamera ke gambar ini!</p>
                              <script>window.onload = function() { window.print(); }<\/script>
                            </body>
                          </html>
                        `);
                        printWin.document.close();
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.6875rem', padding: '0.35rem 0.4rem' }}
                  >
                    <Printer size={13} /> Cetak A4
                  </button>

                  <a
                    href={markerImage}
                    target="_blank"
                    download="target-marker-ar.png"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.6875rem', padding: '0.35rem 0.4rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                  >
                    <Download size={13} /> Unduh
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary"
                style={{ minWidth: '100px' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Target Display (Direct Monitor Scan) */}
      {fullScreenTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#ffffff',
          zIndex: 250,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <button
            type="button"
            onClick={() => setFullScreenTarget(false)}
            className="btn btn-secondary"
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#0f172a', color: '#ffffff' }}
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
    </>
  );
}
