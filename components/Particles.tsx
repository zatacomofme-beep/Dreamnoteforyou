import React, { useRef, useEffect } from "react";

interface ParticlesProps {
  particleCount?: number;
  particleColors?: string[];
  minSize?: number;
  maxSize?: number;
  speed?: number;
  className?: string;
}

const Particles: React.FC<ParticlesProps> = ({
  particleCount = 100,
  particleColors = ["#ffffff", "#e0f2fe", "#bfdbfe"], // Dreamy white/blue-ish
  minSize = 0.4,
  maxSize = 2.5,
  speed = 0.3,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let mouseX = 0;
    let mouseY = 0;
    
    // Handle resizing
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      originalX: number;
      originalY: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.originalX = this.x;
        this.originalY = this.y;
        this.size = Math.random() * (maxSize - minSize) + minSize;
        
        // Random direction but generally slow drift
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        this.speedX = Math.cos(angle) * velocity;
        this.speedY = Math.sin(angle) * velocity;
        
        this.color = particleColors[Math.floor(Math.random() * particleColors.length)];
      }

      update() {
        // Basic movement
        this.x += this.speedX;
        this.y += this.speedY;

        // Mouse interaction (Parallax/Repulse effect)
        // We create a subtle drift away from mouse or based on mouse position
        const dx = mouseX - canvas!.width / 2;
        const dy = mouseY - canvas!.height / 2;
        
        // Add a tiny bit of parallax based on mouse position from center
        this.x += dx * 0.0001 * this.size; // Larger particles move more (depth)
        this.y += dy * 0.0001 * this.size;

        // Wrap around screen
        if (this.x > canvas!.width) this.x = 0;
        else if (this.x < 0) this.x = canvas!.width;
        if (this.y > canvas!.height) this.y = 0;
        else if (this.y < 0) this.y = canvas!.height;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        // Fade out edges for softer look
        ctx.globalAlpha = Math.random() * 0.5 + 0.3; 
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    const initParticles = () => {
      particles = [];
      const density = (canvas.width * canvas.height) / 15000; // Adjust count based on area
      const count = particleCount > 0 ? particleCount : Math.floor(density);
      
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    
    resize();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleCount, particleColors, minSize, maxSize, speed]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  );
};

export default Particles;