import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCardProps {
  id: string;
  brandName?: string;
  size?: number;
  showLabels?: boolean;
}

export const QRCard: React.FC<QRCardProps> = ({ 
  id, 
  brandName = "SAFE-TAG", 
  size = 200,
  showLabels = true 
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const downloadSingle = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a high-res version for download
    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    // Define proportions
    const padding = size * 0.1;
    const headerHeight = showLabels ? size * 0.2 : 0;
    const footerHeight = showLabels ? size * 0.2 : 0;
    
    offscreen.width = size + (padding * 2);
    offscreen.height = size + headerHeight + footerHeight + (padding * 2);

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    // Border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, offscreen.width - 10, offscreen.height - 10);

    if (showLabels) {
      // Header: Brand
      ctx.fillStyle = '#1E293B';
      ctx.font = `black ${size * 0.12}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(brandName, offscreen.width / 2, padding + (headerHeight * 0.7));

      // Footer: ID
      ctx.fillStyle = '#3B82F6';
      ctx.font = `bold ${size * 0.1}px monospace`;
      ctx.fillText(id, offscreen.width / 2, offscreen.height - padding - 5);
    }

    // QR Code Image
    const qrCanvas = canvas.querySelector('canvas');
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, padding, padding + headerHeight, size, size);
    }

    const pngFile = offscreen.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = `SAFE_TAG_${id}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
      <div className="text-[10px] font-black tracking-[0.3em] text-slate-900 mb-2 uppercase">{brandName}</div>
      <div ref={canvasRef} className="p-2 bg-white rounded-lg border border-slate-50">
        <QRCodeCanvas 
          value={`${window.location.origin}/s/${id}`}
          size={size}
          level="H"
          marginSize={1}
        />
      </div>
      <div className="mt-3 font-mono font-bold text-blue-600 text-sm tracking-tighter uppercase">{id}</div>
      <button 
        onClick={downloadSingle}
        className="mt-4 w-full py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Download PNG
      </button>
    </div>
  );
};
