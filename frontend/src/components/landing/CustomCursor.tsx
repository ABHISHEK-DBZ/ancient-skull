import React, { useEffect, useState, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [targetPos, setTargetPos] = useState({ x: -100, y: -100 });
  const [cursorState, setCursorState] = useState<{
    hovered: boolean;
    text: string | null;
    variant: 'default' | 'action' | 'copy' | 'drag';
  }>({
    hovered: false,
    text: null,
    variant: 'default'
  });
  const [isVisible, setIsVisible] = useState(false);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Check for touch device or reduced motion
    if (window.matchMedia('(pointer: coarse)').matches || 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      setTargetPos({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorTarget = target.closest('[data-cursor]') as HTMLElement | null;
      const isClickable = target.closest('button, a, input, select, textarea, [role="button"]');

      if (cursorTarget) {
        const customText = cursorTarget.getAttribute('data-cursor');
        const customVariant = (cursorTarget.getAttribute('data-cursor-variant') || 'action') as any;
        setCursorState({
          hovered: true,
          text: customText,
          variant: customVariant
        });
      } else if (isClickable) {
        setCursorState({
          hovered: true,
          text: null,
          variant: 'action'
        });
      } else {
        setCursorState({
          hovered: false,
          text: null,
          variant: 'default'
        });
      }
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth lerp follow loop
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;
    const render = () => {
      setPosition(prev => ({
        x: lerp(prev.x, targetPos.x, 0.22),
        y: lerp(prev.y, targetPos.y, 0.22)
      }));
      animFrameId.current = requestAnimationFrame(render);
    };
    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [targetPos, isVisible]);

  if (!isVisible) return null;

  const isExpanded = cursorState.hovered;
  const hasText = !!cursorState.text;

  return (
    <div
      className="ec-custom-cursor"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate(-50%, -50%)',
        transition: 'opacity 0.25s ease',
        opacity: isVisible ? 1 : 0
      }}
    >
      <div
        style={{
          width: hasText ? 'auto' : isExpanded ? '44px' : '10px',
          height: hasText ? '26px' : isExpanded ? '44px' : '10px',
          padding: hasText ? '0 10px' : '0',
          borderRadius: hasText ? '13px' : '50%',
          backgroundColor: hasText 
            ? 'var(--ec-electric-blue)' 
            : isExpanded 
              ? 'transparent' 
              : 'var(--ec-acid-lime)',
          border: isExpanded && !hasText ? '1.5px solid var(--ec-electric-blue)' : 'none',
          boxShadow: isExpanded ? '0 0 16px var(--ec-electric-blue-glow)' : '0 0 8px var(--ec-acid-lime-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'width 0.22s var(--ec-ease-out-expo), height 0.22s var(--ec-ease-out-expo), background-color 0.22s ease, border 0.22s ease',
          backdropFilter: isExpanded && !hasText ? 'blur(4px)' : 'none'
        }}
      >
        {hasText && (
          <span
            className="ec-cursor-label"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.66rem',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            {cursorState.text}
          </span>
        )}
      </div>
    </div>
  );
};

