/**
 * MindAR Image Target Compiler Helper
 * Compiles PNG/JPG target images into .mind binary tracking data right inside the browser.
 */

// Dynamically load MindAR Image Compiler script if not already present
export async function loadMindARCompiler(): Promise<any> {
  if (typeof window === 'undefined') return null;

  if ((window as any).MINDAR?.IMAGE?.Compiler) {
    return (window as any).MINDAR.IMAGE.Compiler;
  }

  return new Promise((resolve, reject) => {
    // Check if script tag is already being appended
    const existing = document.getElementById('mindar-compiler-script');
    if (existing) {
      existing.addEventListener('load', () => {
        resolve((window as any).MINDAR?.IMAGE?.Compiler);
      });
      existing.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'mindar-compiler-script';
    script.type = 'module';
    script.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';
    script.onload = () => {
      // Allow a brief tick for window.MINDAR assignment
      setTimeout(() => {
        if ((window as any).MINDAR?.IMAGE?.Compiler) {
          resolve((window as any).MINDAR.IMAGE.Compiler);
        } else {
          // In ES module export mode, try dynamic import fallback
          const importDynamic = new Function('url', 'return import(url)');
          importDynamic('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js')
            .then((mod: any) => resolve(mod.Compiler || (window as any).MINDAR?.IMAGE?.Compiler))
            .catch(reject);
        }
      }, 50);
    };
    script.onerror = (err) => {
      // Try dynamic import fallback
      const importDynamic = new Function('url', 'return import(url)');
      importDynamic('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js')
        .then((mod: any) => resolve(mod.Compiler || (window as any).MINDAR?.IMAGE?.Compiler))
        .catch(reject);
    };
    document.head.appendChild(script);
  });
}

/**
 * Compile an image (File, Blob, or URL) into a .mind binary Blob
 */
export async function compileImageToMind(
  imageSource: File | Blob | string,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; buffer: Uint8Array }> {
  const CompilerClass = await loadMindARCompiler();
  if (!CompilerClass) {
    throw new Error('MindAR Compiler tidak dapat dimuat di browser');
  }

  // 1. Create HTMLImageElement
  const img = new Image();
  img.crossOrigin = 'anonymous';

  let objectUrlToRevoke: string | null = null;
  if (typeof imageSource === 'string') {
    img.src = imageSource;
  } else {
    objectUrlToRevoke = URL.createObjectURL(imageSource);
    img.src = objectUrlToRevoke;
  }

  await new Promise<void>((resolve, reject) => {
    if (img.complete && img.naturalWidth !== 0) {
      resolve();
    } else {
      img.onload = () => resolve();
      img.onerror = (err) => reject(new Error('Gagal memuat elemen gambar untuk kompilasi marker'));
    }
  });

  try {
    // 2. Initialize Compiler
    const compiler = new CompilerClass();

    // 3. Compile image targets
    await compiler.compileImageTargets([img], (progress: number) => {
      if (onProgress) {
        onProgress(Math.min(100, Math.round(progress)));
      }
    });

    // 4. Export compiled data
    const exportedBuffer = await compiler.exportData();
    const blob = new Blob([exportedBuffer], { type: 'application/octet-stream' });
    const buffer = new Uint8Array(exportedBuffer);

    return { blob, buffer };
  } finally {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}
