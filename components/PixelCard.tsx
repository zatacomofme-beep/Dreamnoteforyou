import React, { useRef, useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';

interface PixelCardProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  onClick?: () => void;
  onShare?: () => void;
}

const PixelCard: React.FC<PixelCardProps> = ({ children, className = "", color = "#3b82f6", onClick, onShare }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let pixels: { x: number; y: number; age: number; life: number; color: string }[] = [];
    
    const resize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.offsetWidth;
        canvas.height = containerRef.current.offsetHeight;
      }
    };
    
    resize();
    window.addEventListener('resize', resize);

    const gridSize = 10;

    const spawnPixel = () => {
        if (Math.random() > 0.8) return; // limit spawn rate
        const x = Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize;
        const y = Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize;
        pixels.push({
            x,
            y,
            age: 0,
            life: Math.random() * 30 + 10,
            color: color
        });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw static border grid
      ctx.strokeStyle = `${color}22`;
      ctx.lineWidth = 1;
      
      // Only draw dynamic pixels if hovered or randomly for ambience
      if (isHovered || Math.random() > 0.95) {
         spawnPixel();
      }

      // Update and draw pixels
      for (let i = pixels.length - 1; i >= 0; i--) {
        const p = pixels[i];
        p.age++;
        
        if (p.age >= p.life) {
          pixels.splice(i, 1);
          continue;
        }

        const opacity = Math.sin((p.age / p.life) * Math.PI);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity * 0.4; // Semi-transparent
        ctx.fillRect(p.x, p.y, gridSize, gridSize);
        ctx.globalAlpha = 1;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, isHovered]);

  return (
    <div 
      ref={containerRef}
      className={`relative group bg-void border border-white/10 overflow-hidden cursor-pointer transition-all duration-300 hover:border-white/30 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none z-0"
      />
      <div className="relative z-10 h-full">
        {children}
      </div>
      
      {/* Share Button */}
      {onShare && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="absolute top-4 right-4 z-30 p-2 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 border border-white/10"
          title="分享梦境"
        >
          <Share2 size={18} />
        </button>
      )}

      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/40" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/40" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />
    </div>
  );
};

export default PixelCard;