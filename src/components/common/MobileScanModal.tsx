'use client';

import { useState, useEffect } from 'react';
import {
  Smartphone,
  Eye,
  Copy,
  Check,
  ExternalLink,
  Monitor,
  Printer,
  Download,
  X,
  Wifi,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Camera,
  HelpCircle
} from 'lucide-react';
import QRCode from 'qrcode';

interface MobileScanModalProps {
  slug: string;
  title: string;
  markerImage?: string;
  markerName?: string;
  markerOrientation?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileScanModal({
  slug,
  title,
  markerImage = '/markers/card.png',
  markerName = 'Kartu Target MindAR',
  markerOrientation = 'HORIZONTAL',
  isOpen,
  onClose
}: MobileScanModalProps) {
  const [localIp, setLocalIp] = useState<string>('localhost');
  const [ipList, setIpList] = useState<{ name: string; ip: string }[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('localhost');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [fullScreenTarget, setFullScreenTarget] = useState(false);

  // Fetch host machine LAN IP
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

  // Compute final URL for mobile phone
  const port = typeof window !== 'undefined' && window.location.port ? window.location.port : '3000';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

  let mobileViewerUrl = '';
  if (useCustomUrl && customUrl.trim()) {
    const trimmed = customUrl.trim();
    mobileViewerUrl = trimmed.endsWith('/')
      ? `${trimmed}view/${slug}`
      : `${trimmed}/view/${slug}`;
  } else if (selectedIp === 'localhost') {
    mobileViewerUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/view/${slug}`
      : `http://localhost:${port}/view/${slug}`;
  } else {
    mobileViewerUrl = `http://${selectedIp}:${port}/view/${slug}`;
  }

  // Generate QR code whenever mobileViewerUrl changes
  useEffect(() => {
    if (!mobileViewerUrl) return;

    QRCode.toDataURL(mobileViewerUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error(err));
  }, [mobileViewerUrl]);

  if (!isOpen) return null;

  // Full-Screen Target Mode (when user wants to scan directly from monitor screen)
  if (fullScreenTarget) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#ffffff',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <button
          onClick={() => setFullScreenTarget(false)}
          className="btn btn-secondary"
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#0f172a', color: '#fff' }}
        >
          <X size={16} /> Tutup Layar Penuh
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
          Arahkan kamera ponsel Anda ke gambar di bawah ini untuk memunculkan AR secara instan!
        </div>

        <div style={{
          padding: '1.5rem',
          border: '4px solid #000000',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
        }}>
          <img
            src={markerImage}
            alt={markerName}
            style={{ width: '420px', height: '420px', maxHeight: '55vh', maxWidth: '85vw', objectFit: 'contain' }}
          />
        </div>

        <div style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: '#64748b' }}>
          Marker: <strong>{markerName}</strong> • Orientasi: {markerOrientation === 'HORIZONTAL' ? 'Horizontal (Meja)' : 'Vertical (Dinding)'}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9990 }}>
      <div
        className="glass-panel"
        style={{
          width: 'min(940px, 94vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          border: '1px solid var(--border-glow)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Smartphone size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Uji Coba AR di Ponsel & Scan Target Marker
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                {title} • Buka kamera ponsel untuk melihat objek 3D di atas target
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* 2-Column Split: Left = Phone QR, Right = Target Image */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* SISI KIRI: Buka Link di HP */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span className="badge badge-published" style={{ borderRadius: '50%', width: '22px', height: '22px', padding: 0, justifyContent: 'center' }}>
                1
              </span>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                Buka Link Viewer di Ponsel
              </h3>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Arahkan kamera HP Anda ke QR Code di bawah untuk membuka viewer langsung di browser ponsel:
            </p>

            {/* QR Code Container */}
            <div style={{
              background: '#ffffff',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              alignSelf: 'center',
              marginBottom: '1rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
            }}>
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Ponsel"
                  style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }}
                />
              ) : (
                <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  Membuat QR...
                </div>
              )}
              <div style={{ fontSize: '0.6875rem', color: '#0f172a', fontWeight: 700, marginTop: '0.5rem' }}>
                📱 SCAN DENGAN KAMERA HP / GOOGLE LENS
              </div>
            </div>

            {/* IP / Connection Picker */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                <Wifi size={13} color="var(--primary-light)" /> Pilih Alamat Koneksi Jaringan:
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {localIp && localIp !== 'localhost' && (
                  <button
                    onClick={() => {
                      setSelectedIp(localIp);
                      setUseCustomUrl(false);
                    }}
                    className={`btn ${selectedIp === localIp && !useCustomUrl ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    Wi-Fi: {localIp}
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedIp('localhost');
                    setUseCustomUrl(false);
                  }}
                  className={`btn ${selectedIp === 'localhost' && !useCustomUrl ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Localhost (PC)
                </button>
                <button
                  onClick={() => setUseCustomUrl(!useCustomUrl)}
                  className={`btn ${useCustomUrl ? 'btn-accent' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  HTTPS Tunnel
                </button>
              </div>

              {/* Custom Tunnel input if user uses ngrok/localtunnel */}
              {useCustomUrl && (
                <div style={{ marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="https://xyz.loca.lt atau https://xyz.ngrok-free.app"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                  />
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    💡 Jalankan <code>npx localtunnel --port 3000</code> di terminal untuk link HTTPS otomatis.
                  </div>
                </div>
              )}
            </div>

            {/* Direct URL input with Copy Button */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                readOnly
                value={mobileViewerUrl}
                className="form-input"
                style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mobileViewerUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', flexShrink: 0 }}
                title="Salin Tautan"
              >
                {copiedLink ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
              </button>
              <a
                href={mobileViewerUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', flexShrink: 0 }}
                title="Buka di Tab Baru"
              >
                <ExternalLink size={15} />
              </a>
            </div>

            {/* Camera Permission Accordion */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginTop: '0.25rem'
            }}>
              <button
                onClick={() => setShowHelp(!showHelp)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--accent-light)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HelpCircle size={14} /> Izin Kamera HP di Wi-Fi Lokal
                </span>
                {showHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showHelp && (
                <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}>
                    Browser HP (Chrome/Safari) membatasi kamera hanya untuk link <strong>HTTPS</strong> atau <strong>localhost</strong>.
                  </p>
                  <p style={{ margin: '0 0 0.35rem 0', fontWeight: 600, color: '#ffffff' }}>
                    Cara Aktifkan di Chrome Android:
                  </p>
                  <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
                    <li>Buka <code>chrome://flags</code> di Chrome HP.</li>
                    <li>Cari: <code>Insecure origins treated as secure</code></li>
                    <li>Ketik: <code>http://{localIp}:{port}</code></li>
                    <li>Ubah jadi <strong>Enabled</strong>, lalu klik <strong>Relaunch</strong>.</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* SISI KANAN: Gambar Target Marker Fisik */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span className="badge badge-published" style={{ borderRadius: '50%', width: '22px', height: '22px', padding: 0, justifyContent: 'center' }}>
                2
              </span>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                Scan Target Marker AR Ini
              </h3>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Setelah menekan tombol <strong>"Lihat dalam AR"</strong> di HP, arahkan kamera HP ke gambar di bawah ini:
            </p>

            {/* Target Image Frame */}
            <div style={{
              background: '#ffffff',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '3px solid #000000',
              textAlign: 'center',
              alignSelf: 'center',
              marginBottom: '1rem',
              boxShadow: '0 12px 32px rgba(0,0,0,0.3)'
            }}>
              <img
                src={markerImage}
                alt={markerName}
                style={{ width: '210px', height: '210px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
              <div style={{ fontSize: '0.6875rem', color: '#0f172a', fontWeight: 700, marginTop: '0.5rem' }}>
                🎯 TARGET AR: {markerName}
              </div>
            </div>

            {/* Actions for Target */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
              <button
                onClick={() => setFullScreenTarget(true)}
                className="btn btn-accent"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.8125rem' }}
                title="Tampilkan marker di seluruh layar monitor agar sangat mudah discan dari HP"
              >
                <Monitor size={15} /> Buka Layar Penuh (Scan dari Layar Monitor)
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    if (printWin) {
                      printWin.document.write(`
                        <html>
                          <head><title>Cetak Marker AR - ${markerName}</title></head>
                          <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center;">
                            <h2>TARGET AR: ${title}</h2>
                            <div style="border:4px solid #000; padding:20px; display:inline-block;">
                              <img src="${markerImage}" style="width:400px; height:400px; object-fit:contain;" />
                            </div>
                            <p style="margin-top:20px; font-weight:bold; font-size:16px;">AR STUDIO BM3</p>
                            <p style="color:#64748b; font-size:13px;">Buka tautan di HP lalu arahkan kamera ke gambar ini!</p>
                            <script>window.onload = function() { window.print(); }<\/script>
                          </body>
                        </html>
                      `);
                      printWin.document.close();
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  <Printer size={14} /> Cetak Lembar A4
                </button>

                <a
                  href={markerImage}
                  target="_blank"
                  download="target-marker-ar.png"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  <Download size={14} /> Unduh Gambar
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={14} color="var(--primary-light)" />
            <span>Kamera HP akan mengenali pola visual gambar ini dan menempelkan 3D di atasnya.</span>
          </div>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '0.45rem 1.25rem', fontSize: '0.8125rem' }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
