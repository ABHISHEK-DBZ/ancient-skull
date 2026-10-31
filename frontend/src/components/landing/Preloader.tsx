import React, { useEffect, useState } from 'react';

interface PreloaderProps {
  onComplete: () => void;
}

const PHASES = [
  'INITIALIZING SYSTEM',
  'MAPPING DEPENDENCIES',
  'ANALYZING RISK',
  'GENERATING EVIDENCE'
];

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Check if user has already visited in this session or prefers reduced motion
    const hasSeen = sessionStorage.getItem('ec_preloader_seen');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (hasSeen || prefersReducedMotion) {
      onComplete();
      return;
    }

    const duration = 1800; // Fast, elegant 1.8s
    const startTime = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
      setProgress(pct);

      const idx = Math.min(Math.floor((pct / 100) * PHASES.length), PHASES.length - 1);
      setPhaseIndex(idx);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsExiting(true);
          sessionStorage.setItem('ec_preloader_seen', 'true');
          setTimeout(onComplete, 650);
        }, 150);
      }
    }, 24);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: '#090B0E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(1.04) translateY(-10px)' : 'scale(1) translateY(0)',
        transition: 'opacity 0.65s var(--ec-ease-out-expo), transform 0.65s var(--ec-ease-out-expo)',
        pointerEvents: isExiting ? 'none' : 'auto'
      }}
    >
      {/* Background blueprint grid */}
      <div 
        className="ec-grid-bg-dense"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          pointerEvents: 'none'
        }}
      />

      {/* Abstract Geometric Capsule Assembly */}
      <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '40px' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          {/* Outer hexagonal capsule perimeter */}
          <polygon
            points="50,5 90,25 90,75 50,95 10,75 10,25"
            fill="none"
            stroke="rgba(83, 109, 255, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Core Geometric Fragments that assemble with progress */}
          <path
            d="M50 15 L82 32 L82 68 L50 85 L18 68 L18 32 Z"
            fill="none"
            stroke="var(--ec-electric-blue)"
            strokeWidth="2"
            strokeDasharray="240"
            strokeDashoffset={240 - (progress / 100) * 240}
            style={{
              transition: 'stroke-dashoffset 0.1s linear',
              filter: 'drop-shadow(0 0 12px var(--ec-electric-blue-glow))'
            }}
          />

          {/* Internal core nucleus */}
          <circle
            cx="50"
            cy="50"
            r={progress > 60 ? '12' : `${(progress / 60) * 12}`}
            fill={progress > 85 ? 'var(--ec-acid-lime)' : 'var(--ec-electric-blue)'}
            style={{
              transition: 'fill 0.4s ease, r 0.2s ease',
              filter: progress > 85 ? 'drop-shadow(0 0 14px var(--ec-acid-lime-glow))' : 'none'
            }}
          />

          {/* Crosshair accents */}
          <line x1="50" y1="20" x2="50" y2="35" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="50" y1="65" x2="50" y2="80" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="20" y1="50" x2="35" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="65" y1="50" x2="80" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        </svg>

        {/* Small corner brackets */}
        <div style={{ position: 'absolute', top: -10, left: -10, color: 'var(--ec-text-dim)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>01</div>
        <div style={{ position: 'absolute', bottom: -10, right: -10, color: 'var(--ec-text-dim)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>SEC</div>
      </div>

      {/* Progress Telemetry */}
      <div style={{ width: '280px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--ec-acid-lime)',
            letterSpacing: '0.12em',
            fontWeight: 600
          }}>
            {PHASES[phaseIndex]}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--ec-text-primary)',
            fontWeight: 700
          }}>
            {progress}%
          </span>
        </div>

        {/* Thin High-Precision Progress Bar */}
        <div style={{
          width: '100%',
          height: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '1px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: 'var(--ec-electric-blue)',
            boxShadow: '0 0 10px var(--ec-electric-blue)',
            transition: 'width 0.08s linear'
          }} />
        </div>

        <div style={{
          marginTop: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.66rem',
          color: 'var(--ec-text-dim)',
          letterSpacing: '0.08em'
        }}>
          EXIT CAPSULE // SYSTEM PRE-CHECK
        </div>
      </div>
    </div>
  );
};

