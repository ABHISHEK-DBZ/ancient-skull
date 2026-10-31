import React from 'react';
import { ArrowRight, Github, ShieldCheck, Sparkles, Terminal } from 'lucide-react';

interface FinalCTAProps {
  onExploreRepo: () => void;
  onConnectGitHub: () => void;
  onOpenCli: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({
  onExploreRepo,
  onConnectGitHub,
  onOpenCli
}) => {
  return (
    <section
      id="cta"
      style={{
        position: 'relative',
        backgroundColor: 'var(--ec-bg-dark)',
        padding: '160px 0 140px',
        overflow: 'hidden',
        borderBottom: '1px solid var(--ec-border-subtle)'
      }}
    >
      {/* Background blueprint grid & radial glow */}
      <div className="ec-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }} />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(83, 109, 255, 0.14) 0%, rgba(216, 255, 69, 0.04) 50%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      <div className="ec-container" style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
        {/* Central Geometric Emblem Accent */}
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 32px',
          borderRadius: '12px',
          backgroundColor: 'rgba(22, 27, 34, 0.9)',
          border: '1.5px solid var(--ec-electric-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px var(--ec-electric-blue-glow)'
        }}>
          <div style={{
            width: '18px',
            height: '18px',
            backgroundColor: 'var(--ec-acid-lime)',
            borderRadius: '3px',
            transform: 'rotate(45deg)'
          }} />
        </div>

        {/* Section Headline */}
        <h2
          className="ec-title-display"
          style={{
            maxWidth: '1000px',
            margin: '0 auto 28px',
            lineHeight: 1.02
          }}
        >
          Your next migration{' '}
          <br />
          <span className="ec-editorial-accent" style={{ color: 'var(--ec-electric-blue)' }}>
            deserves better evidence.
          </span>
        </h2>

        {/* Supporting Copy */}
        <p
          className="ec-body-large"
          style={{
            maxWidth: '680px',
            margin: '0 auto 44px'
          }}
        >
          Start with your repository. Understand maintenance risks. Evaluate candidate alternatives with empirical tests. Make every architectural decision with proof.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <button
            onClick={onExploreRepo}
            className="ec-btn-primary"
            data-cursor="SCAN"
            style={{ padding: '16px 36px', fontSize: '1.05rem' }}
          >
            <span>Explore your repository</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={onConnectGitHub}
            className="ec-btn-secondary"
            data-cursor="GITHUB"
            style={{ padding: '16px 30px', fontSize: '1.05rem' }}
          >
            <Github size={18} />
            <span>Connect GitHub</span>
          </button>

          <button
            onClick={onOpenCli}
            className="ec-btn-secondary"
            data-cursor="CLI"
            style={{ padding: '16px 24px', fontSize: '1.05rem' }}
          >
            <Terminal size={18} />
            <span>CLI Quickstart</span>
          </button>
        </div>

        {/* Security / Open Source Assurance */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '16px',
          marginTop: '60px',
          padding: '10px 24px',
          borderRadius: 'var(--ec-radius-full)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--ec-border-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.74rem',
          color: 'var(--ec-text-dim)'
        }}>
          <span>OPEN SOURCE (APACHE 2.0)</span>
          <span>•</span>
          <span>LOCAL ZERO-EXECUTION AST</span>
          <span>•</span>
          <span>OFFLINE OLLAMA READY</span>
        </div>
      </div>
    </section>
  );
};

