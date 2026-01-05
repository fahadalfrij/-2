
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Participant } from '../types';

interface WheelProps {
  participants: Participant[];
  rotation: number;
  isSpinning: boolean;
  theme: 'dark' | 'light';
}

const Wheel: React.FC<WheelProps> = ({ participants, rotation, isSpinning, theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(200);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // منطق حجم فائق الرشاقة: تصغير النسب لترك مساحة أكبر للعناصر الأخرى
      let s = Math.min(w * 0.60, h * 0.28);
      if (s > 210) s = 210; // الحد الأقصى الجديد (أصغر قليلاً)
      if (s < 170) s = 170; // الحد الأدنى
      
      setSize(s);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const drawWheel = useMemo(() => {
    return () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 2;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);

      const center = size / 2;
      const radius = center - 8;
      ctx.clearRect(0, 0, size, size);

      if (participants.length === 0) {
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }

      const sliceAngle = (Math.PI * 2) / participants.length;

      participants.forEach((p, i) => {
        const startAngle = i * sliceAngle;
        const endAngle = startAngle + sliceAngle;
        const midAngle = startAngle + (sliceAngle / 2);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        
        const sectorGrad = ctx.createRadialGradient(center, center, radius * 0.1, center, center, radius);
        sectorGrad.addColorStop(0, p.color);
        sectorGrad.addColorStop(1, adjustColor(p.color, -25));
        ctx.fillStyle = sectorGrad;
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(midAngle);
        ctx.textAlign = 'right'; 
        ctx.textBaseline = 'middle'; 
        ctx.fillStyle = '#ffffff';
        
        let fontSize = size / 18;
        if (participants.length > 10) fontSize = size / 22;
        
        ctx.font = `bold ${fontSize}px Tajawal, sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 3;
        
        const displayName = p.name.length > 8 ? p.name.substring(0, 6) + '..' : p.name;
        ctx.fillText(displayName, radius * 0.88, 0);
        
        ctx.restore();
        ctx.restore();
      });

      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius + 1, 0, Math.PI * 2);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      const hubRadius = size / 12;
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, hubRadius, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(center - 2, center - 2, 0, center, center, hubRadius);
      grad.addColorStop(0, '#fffbeb');
      grad.addColorStop(0.5, '#fbbf24');
      grad.addColorStop(1, '#92400e');
      ctx.fillStyle = grad;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
      ctx.fill();
      ctx.restore();
    };
  }, [participants, size]);

  useEffect(() => { drawWheel(); }, [drawWheel]);

  function adjustColor(hex: string, percent: number) {
    const num = parseInt(hex.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
  }

  return (
    <div className="relative flex items-center justify-center touch-none select-none">
      <div className="absolute top-0 z-40 -mt-2.5 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] animate-pointer-tap">
        <svg width="14" height="20" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 60 L40 10 L0 10 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="4" />
        </svg>
      </div>
      
      <canvas
        ref={canvasRef}
        style={{ 
          width: `${size}px`,
          height: `${size}px`,
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 5s cubic-bezier(0.15, 0, 0.1, 1)',
          willChange: 'transform'
        }}
        className="block drop-shadow-[0_12px_24px_rgba(0,0,0,0.3)]"
      />

      <style>{`
        @keyframes pointer-tap { 
          0%, 100% { transform: translateY(0); } 
          50% { transform: translateY(3px); } 
        }
        .animate-pointer-tap { 
          animation: pointer-tap 0.2s infinite ease-in-out; 
          animation-play-state: ${isSpinning ? 'running' : 'paused'};
        }
      `}</style>
    </div>
  );
};

export default Wheel;
