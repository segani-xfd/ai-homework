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
        if (loadedCount === 1) {
          // Immediately show the first frame when it's ready
          requestAnimationFrame(() => drawFrame(0));
        }
        if (loadedCount === frameCount) {
          setImages([...loadedImages]);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load frame ${i}`);
        loadedCount++;
      };
      loadedImages[i] = img; // Keep order
    }
    // Set them anyway so we can start drawing as they load
    setImages(loadedImages);
  }, [frameCount]);

  const drawFrame = (index) => {
    const canvas = canvasRef.current;
    if (!canvas || !images || !images[index]) return;
    const ctx = canvas.getContext('2d');
    
    const img = images[index];
    if (!img.complete) return; // Don't draw if not ready

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
      
      // Calculate progress relative to the container's presence on screen
      // For sticky, we care about the scroll within the container's height
      const totalScrollable = rect.height - windowHeight;
      if (totalScrollable <= 0) return;

      const progress = -rect.top / totalScrollable;
      const clampedProgress = Math.min(1, Math.max(0, progress));
      const frameIndex = Math.floor(clampedProgress * (frameCount - 1));

      drawFrame(frameIndex);
      
      if (clampedProgress > 0.05) {
        setInstructionOpacity(Math.max(0, 1 - (clampedProgress - 0.05) * 10));
      } else {
        setInstructionOpacity(1);
      }
    };

    // More aggressive scroll listening for mobile
    const scrollContainers = [window, document.querySelector('.main-content'), document.body, document.documentElement];
    
    const onScroll = (e) => {
      handleScroll();
    };

    scrollContainers.forEach(container => {
      if (container) container.addEventListener('scroll', onScroll, { passive: true, capture: true });
    });

    // Pulse check to ensure visibility
    const interval = setInterval(handleScroll, 100);
    handleScroll();

    return () => {
      scrollContainers.forEach(container => {
        if (container) container.removeEventListener('scroll', onScroll, { capture: true });
      });
      clearInterval(interval);
    };
  }, [images, frameCount]);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;

  // Handle canvas resize and scale
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      setWindowWidth(window.innerWidth);
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      
      // Force draw current state
      drawFrame(0);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Multiple retries for mobile environment
    const t1 = setTimeout(resizeCanvas, 100);
    const t2 = setTimeout(resizeCanvas, 500);
    const t3 = setTimeout(resizeCanvas, 1500);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [images]);

  // Periodic fallback draw for mobile stability
  useEffect(() => {
    if (!images || images.length === 0) return;
    const interval = setInterval(() => {
      drawFrame(0);
    }, 2000);
    return () => clearInterval(interval);
  }, [images]);

  return (
    <div 
      ref={sceneContainerRef} 
      className="scene-container"
      style={{ 
        height: isMobile ? '400vh' : '450vh', // Slowed down significantly on mobile
        position: 'relative',
        width: '100%',
        marginTop: '0'
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
          zIndex: 10,
          background: '#0a0f1d' // Deep background to prevent flash
        }}
      >
        <div 
          className="glass-card" 
          style={{ 
            width: '95%', 
            maxWidth: '1100px',
            height: isMobile ? '45vh' : '70vh', 
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
        </div>

        <div 
          style={{ 
            marginTop: '30px', 
            color: 'var(--text-muted)', 
            fontSize: isMobile ? '1rem' : '1.3rem', 
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
