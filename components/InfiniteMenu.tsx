import React, { useRef, useState } from 'react';
import { Dream } from '../types';
import PixelCard from './PixelCard';
import FuzzyText from './FuzzyText';
import Particles from './Particles';
import { Clock } from 'lucide-react';

interface InfiniteMenuProps {
  items: Dream[];
  onSelect: (dream: Dream) => void;
}

const ITEM_HEIGHT = 200; 
const CONTAINER_HEIGHT = 600; 

const InfiniteMenu: React.FC<InfiniteMenuProps> = ({ items, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  // If no items, show empty state with Particles Background
  if (items.length === 0) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
        <Particles 
            particleCount={80} 
            minSize={0.5} 
            maxSize={1.5} 
            speed={0.1} 
            particleColors={['#333', '#555', '#777']} 
        />
        
        <div className="z-10 w-full max-w-3xl px-6">
           <FuzzyText 
             fontSize="clamp(3rem, 8vw, 5rem)" 
             fontWeight={100} 
             color="#ffffff" 
             enableHover={true}
             baseIntensity={0.1}
             hoverIntensity={0.4}
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
      scale = 1 - (ratio * 0.1);
      opacity = 1 - (ratio * 0.5);
      blur = ratio * 2;
    } else {
      scale = 0.9;
      opacity = 0.3;
      blur = 2;
    }

    return {
      transform: `scale(${scale})`,
      opacity: Math.max(0.1, opacity),
      filter: `blur(${blur}px)`,
      zIndex: Math.round((1 - (distance / maxDist)) * 100),
    };
  };

  return (
    <div className="relative w-full h-full flex justify-center items-center overflow-hidden bg-black">
      {/* Overlay Gradients */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll no-scrollbar py-[50vh] scroll-smooth"
        style={{ height: CONTAINER_HEIGHT }}
      >
        <div className="flex flex-col items-center space-y-8 px-4 w-full">
          {items.map((dream, index) => (
            <div 
              key={dream.id}
              className="w-full max-w-[280px] transition-all duration-300 ease-out"
              style={{
                height: ITEM_HEIGHT,
                ...getStyle(index)
              }}
            >
              <PixelCard 
                color={dream.color}
                onClick={() => onSelect(dream)}
                className="h-full w-full overflow-hidden relative group border-none bg-zinc-900"
              >
                {/* Background Video/Image */}
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
                    </div>
                ) : dream.imageUrl && (
                    <div className="absolute inset-0 z-0">
                        <img 
                            src={dream.imageUrl} 
                            alt={dream.title} 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 grayscale group-hover:grayscale-0"
                        />
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                <div className="relative z-10 h-full p-5 flex flex-col justify-end pointer-events-none">
                  <h3 className="text-lg font-light text-white truncate tracking-wider">{dream.title}</h3>
                  
                  <div className="flex items-center space-x-2 text-[10px] text-white/60 mt-2 font-mono uppercase">
                    <Clock size={10} />
                    <span>{new Date(dream.date).toLocaleDateString('zh-CN')}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-3">
                    {dream.keyPoints && dream.keyPoints.slice(0, 2).map(pt => (
                        <span key={pt} className="text-[9px] px-2 py-px bg-white/10 backdrop-blur-md border border-white/5 truncate max-w-[80px] text-white/80">
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