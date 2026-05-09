import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Pencil, Trash2 } from 'lucide-react';

interface BodyMapCanvasProps {
  value: number;
  onChange: (tbsa: number) => void;
  onImageChange?: (base64: string) => void;
}

export const BodyMapCanvas: React.FC<BodyMapCanvasProps> = ({ value, onChange, onImageChange }) => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const outlineImgRef = useRef<HTMLImageElement | null>(null);
  const isDrawing = useRef(false);
  
  const [brushSize, setBrushSize] = useState(10);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const dCanvas = displayCanvasRef.current;
    const drCanvas = drawingCanvasRef.current;
    const mCanvas = maskCanvasRef.current;
    if (!dCanvas || !drCanvas || !mCanvas) return;

    dCanvas.width = 600;
    dCanvas.height = 400;
    drCanvas.width = 600;
    drCanvas.height = 400;
    mCanvas.width = 600;
    mCanvas.height = 400;

    const img = new Image();
    img.src = '/assets/body_outline_hd.png';
    img.crossOrigin = 'anonymous'; // Important for pixel access
    img.onload = () => {
      outlineImgRef.current = img;
      
      const mCtx = mCanvas.getContext('2d', { willReadFrequently: true });
      if (mCtx) {
        mCtx.drawImage(img, 0, 0, 600, 400);
        
        // CREATE MASK: Make body solid, background transparent
        const mData = mCtx.getImageData(0, 0, 600, 400);
        const data = mData.data;
        
        // We use a simple flood fill or threshold
        // Since it's a white background, anything not white is "body"
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          // If pixel is white/near-white, it's background
          if (r > 245 && g > 245 && b > 245) {
            data[i+3] = 0; // Transparent
          } else {
            // It's body or outline. Make it solid black for the mask.
            data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
          }
        }
        
        // DILATE MASK: To ensure it covers the entire body including the edges
        // (Simple dilation: check neighbors)
        mCtx.putImageData(mData, 0, 0);
      }
      
      render();
      setIsLoaded(true);
    };
  }, []);

  const render = () => {
    const dCanvas = displayCanvasRef.current;
    const drCanvas = drawingCanvasRef.current;
    const mCanvas = maskCanvasRef.current;
    if (!dCanvas || !drCanvas || !mCanvas || !outlineImgRef.current) return;

    const dCtx = dCanvas.getContext('2d');
    if (!dCtx) return;

    dCtx.clearRect(0, 0, 600, 400);

    // 1. Draw HD Background
    dCtx.drawImage(outlineImgRef.current, 0, 0, 600, 400);

    // 2. Draw user ink clipped by mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 600;
    tempCanvas.height = 400;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(mCanvas, 0, 0);
      tCtx.globalCompositeOperation = 'source-in';
      tCtx.drawImage(drCanvas, 0, 0);
      
      dCtx.globalAlpha = 0.7;
      dCtx.drawImage(tempCanvas, 0, 0);
      dCtx.globalAlpha = 1.0;
    }

    if (onImageChange) {
      onImageChange(dCanvas.toDataURL('image/png', 0.8));
    }
  };

  const calculateTBSA = () => {
    const drCanvas = drawingCanvasRef.current;
    const mCanvas = maskCanvasRef.current;
    if (!drCanvas || !mCanvas) return;
    const drCtx = drCanvas.getContext('2d', { willReadFrequently: true });
    const mCtx = mCanvas.getContext('2d', { willReadFrequently: true });
    if (!drCtx || !mCtx) return;

    const drData = drCtx.getImageData(0, 0, 600, 400).data;
    const mData = mCtx.getImageData(0, 0, 600, 400).data;

    let frontTotal = 0, frontColored = 0, backTotal = 0, backColored = 0;
    const mid = 300;

    for (let i = 0; i < mData.length; i += 4) {
      if (mData[i+3] > 100) { // In body mask
        const x = (i / 4) % 600;
        if (x < mid) {
          frontTotal++;
          if (drData[i+3] > 50) frontColored++;
        } else {
          backTotal++;
          if (drData[i+3] > 50) backColored++;
        }
      }
    }

    const res = (frontTotal > 0 ? (frontColored / frontTotal) * 50 : 0) + (backTotal > 0 ? (backColored / backTotal) * 50 : 0);
    onChange(Math.round(res * 10) / 10);
  };

  const handlePointer = (clientX: number, clientY: number) => {
    const drCanvas = drawingCanvasRef.current;
    const dCanvas = displayCanvasRef.current;
    if (!drCanvas || !dCanvas || !isDrawing.current) return;
    const ctx = drCanvas.getContext('2d');
    if (!ctx) return;

    const rect = dCanvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (600 / rect.width);
    const y = (clientY - rect.top) * (400 / rect.height);

    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    if (mode === 'draw') {
      ctx.fillStyle = '#ef4444';
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.globalCompositeOperation = 'destination-out';
    }
    ctx.fill();
    render();
  };

  return (
    <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl shadow-lg border border-gray-100 w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-4">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button type="button" onClick={() => setMode('draw')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'draw' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Pencil size={18} /> Pen</button>
          <button type="button" onClick={() => setMode('erase')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'erase' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Eraser size={18} /> Eraser</button>
        </div>
        <div className="flex items-center gap-4 flex-1 max-w-xs">
          <span className="text-xs font-bold text-gray-400 uppercase">Brush Size</span>
          <input type="range" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} min="2" max="40" className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
          <span className="text-sm font-bold text-gray-700 w-8">{brushSize}</span>
        </div>
        <button type="button" onClick={() => { drawingCanvasRef.current?.getContext('2d')?.clearRect(0, 0, 600, 400); render(); onChange(0); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20} /></button>
      </div>

      <div className="relative bg-white rounded-xl border-4 border-gray-100 shadow-inner overflow-hidden cursor-crosshair touch-none select-none min-h-[400px]">
        <canvas
          ref={displayCanvasRef}
          onMouseDown={(e) => { isDrawing.current = true; handlePointer(e.clientX, e.clientY); }}
          onMouseMove={(e) => handlePointer(e.clientX, e.clientY)}
          onMouseUp={() => { isDrawing.current = false; calculateTBSA(); }}
          onMouseLeave={() => { isDrawing.current = false; calculateTBSA(); }}
          onTouchStart={(e) => { isDrawing.current = true; handlePointer(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchMove={(e) => handlePointer(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={() => { isDrawing.current = false; calculateTBSA(); }}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        <canvas ref={drawingCanvasRef} className="hidden" />
        <canvas ref={maskCanvasRef} className="hidden" />
        
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 w-full text-center mt-2 font-black text-[10px] tracking-tighter text-gray-300 uppercase">
        <div>Anterior (Front)</div>
        <div>Posterior (Back)</div>
      </div>

      <div className="mt-4 flex items-center gap-4 bg-blue-600 text-white px-8 py-3 rounded-2xl shadow-blue-200 shadow-lg">
        <div className="text-xs font-medium uppercase opacity-80">Total Surface Area</div>
        <div className="text-3xl font-black">{value}%</div>
      </div>
    </div>
  );
};
