import React, { useEffect, useRef, useState } from "react";

interface FuzzyTextProps {
  children: string;
  fontSize?: number | string;
  fontWeight?: number | string;
  fontFamily?: string;
  color?: string;
  enableHover?: boolean;
  baseIntensity?: number;
  hoverIntensity?: number;
}

const FuzzyText: React.FC<FuzzyTextProps> = ({
  children,
  fontSize = "clamp(2rem, 8vw, 5rem)", // Responsive default
  fontWeight = 900,
  fontFamily = "inherit",
  color = "#fff",
  enableHover = true,
  baseIntensity = 0.15,
  hoverIntensity = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      // Get the computed font size in pixels if a string unit is provided
      // We do this by creating a temporary element
      let computedFontSize = 100; // default
      if (typeof fontSize === "number") {
        computedFontSize = fontSize;
      } else {
        const temp = document.createElement("div");
        temp.style.fontSize = fontSize;
        document.body.appendChild(temp);
        computedFontSize = parseFloat(window.getComputedStyle(temp).fontSize);
        document.body.removeChild(temp);
      }

      // Set canvas dimensions
      width = container.offsetWidth;
      height = computedFontSize * 2.5; // Ensure enough vertical space
      
      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.scale(dpr, dpr);
      
      // Store font config for draw loop
      ctx.font = `${fontWeight} ${computedFontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
    };

    // Initial resize
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      // Clear
      ctx.clearRect(0, 0, width, height);

      // Draw original text
      ctx.fillStyle = color;
      ctx.fillText(children, width / 2, height / 2);

      // Get pixel data
      // Note: we are grabbing the scaled region. 
      // On High DPI, we need to grab the full canvas buffer resolution
      const dpr = window.devicePixelRatio || 1;
      const bufferWidth = canvas.width;
      const bufferHeight = canvas.height;
      
      const imageData = ctx.getImageData(0, 0, bufferWidth, bufferHeight);
      const data = imageData.data;
      
      // Determine current intensity
      const intensity = isHovered && enableHover ? hoverIntensity : baseIntensity;

      // Apply noise
      // We iterate by 4 because each pixel has R, G, B, A
      for (let i = 0; i < data.length; i += 4) {
        // Only modify if pixel has some opacity (is part of the text)
        if (data[i + 3] > 0) {
          // 1. Alpha Noise: Randomly reduce opacity
          // This creates the "fuzzy" static look
          if (Math.random() < intensity) {
             data[i + 3] = data[i + 3] * (0.5 + Math.random() * 0.5); 
          }
          
          // 2. Position Noise (simulated by color shifting adjacent pixels - simplified here to just alpha/color noise for performance)
          // For a true fuzzy text, we often just mess with alpha or slight color jitter.
        }
      }

      ctx.putImageData(imageData, 0, 0);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [children, fontSize, fontWeight, fontFamily, color, isHovered, enableHover, baseIntensity, hoverIntensity]);

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center justify-center overflow-hidden cursor-default select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};

export default FuzzyText;