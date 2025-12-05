import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Dream } from '../types';
import PixelCard from './PixelCard';
import FuzzyText from './FuzzyText';
import Particles from './Particles';
import { Calendar, Play } from 'lucide-react';

interface InfiniteMenuProps {
  items: Dream[];
  onSelect: (dream: Dream) => void;
}

const ITEM_HEIGHT = 200; // Increased height for image
const CONTAINER_HEIGHT = 600; // Visible area

const InfiniteMenu: React.FC<InfiniteMenuProps> = ({ items, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  // If no items, show empty state with Particles Background
  if (items.length === 0) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
        {/* Background only visible when empty */}
        <Particles 
            particleCount={120} 
            minSize={0.5} 
            maxSize={2} 
            speed={0.2} 
            particleColors={['#ffffff', '#a8a29e', '#64748b']} // White to slate grey
        />
        
        <div className="z-10 w-full max-w-3xl px-6">
           <FuzzyText 
             fontSize="clamp(3rem, 10vw, 6rem)" 
             fontWeight={900} 
             color="#ffffff" 
             enableHover={true}
             baseIntensity={0.2}
             hoverIntensity={0.6}
           >
             去做一个梦吧
           </FuzzyText>
        </div>
      </div>
    );
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  };

  const getStyle = (index: number) => {
    const containerCenter = scrollY + (CONTAINER_HEIGHT / 2);
    const itemCenter = (index * ITEM_HEIGHT) + (ITEM_HEIGHT / 2);
    const distance = Math.abs(containerCenter - itemCenter);
    const maxDist = CONTAINER_HEIGHT / 1.5;
    
    let scale = 1;
    let opacity = 1;
    let blur = 0;

    if (distance < maxDist) {
      const ratio = distance / maxDist;
      scale = 1 - (ratio * 0.15);
      opacity = 1 - (ratio * 0.6);
      blur = ratio * 4;
    } else {
      scale = 0.85;
      opacity = 0.4;
      blur = 4;
    }

    return {
      transform: `scale(${scale})`,
      opacity: Math.max(0.2, opacity),
      filter: `blur(${blur}px)`,
      zIndex: Math.round((1 - (distance / maxDist)) * 100),
    };
  };

  return (
    <div className="relative w-full h-full flex justify-center items-center overflow-hidden bg-void">
      {/* Overlay Gradients */}
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll no-scrollbar py-[50vh] scroll-smooth"
        style={{ height: CONTAINER_HEIGHT }}
      >
        <div className="flex flex-col items-center space-y-6 px-4 w-full">
          {items.map((dream, index) => (
            <div 
              key={dream.id}
              className="w-full max-w-xs transition-all duration-150 ease-out"
              style={{
                height: ITEM_HEIGHT,
                ...getStyle(index)
              }}
            >
              <PixelCard 
                color={dream.color}
                onClick={() => onSelect(dream)}
                className="h-full w-full rounded-lg overflow-hidden relative group"
              >
                {/* Background Video/Image with Gradient Overlay */}
                {dream.videoUrl ? (
                   <div className="absolute inset-0 z-0">
                        <video
                            src={dream.videoUrl}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                            muted
                            loop
                            onMouseOver={event => (event.target as HTMLVideoElement).play()}
                            onMouseOut={event => (event.target as HTMLVideoElement).pause()}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    </div>
                ) : dream.imageUrl && (
                    <div className="absolute inset-0 z-0">
                        <img 
                            src={dream.imageUrl} 
                            alt={dream.title} 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    </div>
                )}

                <div className="relative z-10 h-full p-6 flex flex-col justify-end pointer-events-none">
                  <h3 className="text-xl font-bold text-white truncate drop-shadow-lg">{dream.title}</h3>
                  <div className="flex items-center space-x-2 text-xs text-white/80 mt-1">
                    <Calendar size={12} />
                    <span>{new Date(dream.date).toLocaleDateString('zh-CN')}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dream.keyPoints && dream.keyPoints.slice(0, 2).map(pt => (
                        <span key={pt} className="text-[10px] px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/10 truncate max-w-[100px]">
                            {pt}
                        </span>
                    ))}
                  </div>
                </div>
              </PixelCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfiniteMenu;