import React, { useEffect, useRef, useState } from 'react';

const ScrollSequence = ({ frameCount = 200 }) => {
  const canvasRef = useRef(null);
  const sceneContainerRef = useRef(null);
  const stickyWrapperRef = useRef(null);
  const [images, setImages] = useState([]);
  const [instructionOpacity, setInstructionOpacity] = useState(1);

  // Preload images
  useEffect(() => {
    const loadedImages = [];
    let loadedCount = 0;

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      const frameIndex = String(i).padStart(5, '0');
      img.src = `/animation/frame_${frameIndex}.jpg`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameCount) {
          setImages(loadedImages);
        }
      };
      loadedImages.push(img);
    }
  }, [frameCount]);

  const drawFrame = (index) => {
    const canvas = canvasRef.current;
    if (!canvas || !images[index]) return;
    const ctx = canvas.getContext('2d');
    
    // Smooth responsive resizing (Cover style)
    const img = images[index];
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.max(hRatio, vRatio);
    const centerShift_x = (canvas.width - img.width * ratio) / 2;
    const centerShift_y = (canvas.height - img.height * ratio) / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 
      0, 0, img.width, img.height,
      centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
    );
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!sceneContainerRef.current) return;
      
      const rect = sceneContainerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate progress relative to the container's scroll zone
      // progress = (currentScroll - containerTop) / (containerHeight - windowHeight)
      // Since rect.top is currentScroll relative to container entry:
      const progress = -rect.top / (rect.height - windowHeight);
      
      // Clamp 0 to 1
      const clampedProgress = Math.min(1, Math.max(0, progress));
      const frameIndex = Math.min(
        frameCount - 1,
        Math.max(0, Math.floor(clampedProgress * frameCount))
      );

      requestAnimationFrame(() => {
        drawFrame(frameIndex);
        
        // Instructional text fade out early in the sequence
        if (clampedProgress > 0.05) {
          setInstructionOpacity(Math.max(0, 1 - (clampedProgress - 0.05) * 10));
        } else {
          setInstructionOpacity(1);
        }
      });
    };

    // The scroll listener must be on the actual scroll container (main-content) or window
    // In our app, .main-content is the scrollable area.
    const scrollContainer = document.querySelector('.main-content') || window;
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [images, frameCount]);

  // Handle canvas resize and scale
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      drawFrame(0);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [images]);

  return (
    <div 
      ref={sceneContainerRef} 
      className="scene-container"
      style={{ 
        height: '400vh', // This is the scroll distance
        position: 'relative',
        width: '100%'
      }}
    >
      <div 
        ref={stickyWrapperRef}
        className="sticky-wrapper"
        style={{ 
          position: 'sticky', 
          top: 0, 
          height: '100vh', 
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          zIndex: 10
        }}
      >
        <div 
          className="glass-card" 
          style={{ 
            width: '90%', 
            maxWidth: '1100px',
            height: '70vh', 
            padding: '4px', 
            borderRadius: '32px', 
            overflow: 'hidden',
            boxShadow: '0 0 120px rgba(0, 242, 254, 0.2)',
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(30px)'
          }}
        >
          <canvas 
            ref={canvasRef} 
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'block',
              borderRadius: '28px' 
            }}
          />
          
          {/* Pulsing glow background effect */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', background: 'radial-gradient(circle, var(--accent-cyan), transparent 70%)', opacity: 0.1, zIndex: -1 }}></div>
        </div>

        <div 
          style={{ 
            marginTop: '40px', 
            color: 'var(--text-muted)', 
            fontSize: '1.3rem', 
            fontWeight: 400,
            opacity: instructionOpacity,
            transition: 'opacity 0.3s ease',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(0,0,0,0.5)'
          }}
        >
          Прокрутите, чтобы увидеть
        </div>
      </div>
    </div>
  );
};

export default ScrollSequence;
