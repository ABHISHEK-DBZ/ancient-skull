import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Github, Terminal, Menu, X, Shield, Cpu, Layers, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface CinematicNavbarProps {
  onOpenWorkspace: () => void;
  onOpenScan: () => void;
  onConnectGitHub: () => void;
  onOpenCli: () => void;
}

const NAV_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Philosophy', href: '#philosophy' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'AST Lab', href: '#laboratory' },
  { label: 'Verification', href: '#verification' },
  { label: 'Capsule', href: '#capsule' },
  { label: 'Security', href: '#security' }
];

export const CinematicNavbar: React.FC<CinematicNavbarProps> = ({
  onOpenWorkspace,
  onOpenScan,
  onConnectGitHub,
  onOpenCli
}) => {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);

      // Detect active section
      const sections = NAV_LINKS.map(link => link.href.substring(1));
      let current = '';
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 240 && rect.bottom >= 240) {
            current = section;
            break;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileMenuOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 900,
          padding: scrolled ? '12px 24px' : '22px 32px',
          transition: 'all 0.35s var(--ec-ease-out-expo)',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: scrolled ? '10px 20px' : '0',
            backgroundColor: scrolled ? 'var(--ec-bg-surface-glass)' : 'transparent',
            backdropFilter: scrolled ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
            border: scrolled ? '1px solid var(--ec-border-subtle)' : '1px solid transparent',
            borderRadius: scrolled ? 'var(--ec-radius-full)' : '0px',
            boxShadow: scrolled ? '0 10px 30px rgba(0, 0, 0, 0.5)' : 'none',
            pointerEvents: 'auto',
            transition: 'all 0.35s var(--ec-ease-out-expo)'
          }}
        >
          {/* Left: Brand Emblem & Wordmark */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            data-cursor="TOP"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {/* Animated Hexagonal Emblem */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--ec-bg-elevated) 0%, var(--ec-bg-dark) 100%)',
                border: '1px solid rgba(83, 109, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 14px var(--ec-electric-blue-glow)'
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: 'var(--ec-acid-lime)',
                  borderRadius: '2px',
                  transform: 'rotate(45deg)',
                  boxShadow: '0 0 8px var(--ec-acid-lime)'
                }}
              />
            </div>

            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.05rem',
                letterSpacing: '-0.03em',
                color: 'var(--ec-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                EXIT CAPSULE
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  color: 'var(--ec-emerald)',
                  background: 'rgba(81, 214, 160, 0.12)',
                  padding: '2px 6px',
                  borderRadius: '3px'
                }}>
                  v1.0
                </span>
              </div>
            </div>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            className="hidden-mobile"
          >
            {NAV_LINKS.map(link => {
              const isActive = activeSection === link.href.substring(1);
              return (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  data-cursor="GOTO"
                  style={{
                    background: isActive ? 'var(--ec-bg-chip)' : 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--ec-text-primary)' : 'var(--ec-text-muted)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.84rem',
                    fontWeight: isActive ? 600 : 500,
                    padding: '8px 14px',
                    borderRadius: 'var(--ec-radius-full)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.color = 'var(--ec-text-primary)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.color = 'var(--ec-text-muted)';
                  }}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* CLI Modal Trigger */}
            <button
              onClick={onOpenCli}
              data-cursor="CLI"
              title="CLI Quickstart"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--ec-bg-chip)',
                border: '1px solid var(--ec-border-light)',
                color: 'var(--ec-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--ec-text-primary)';
                e.currentTarget.style.borderColor = 'var(--ec-border-focus)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--ec-text-muted)';
                e.currentTarget.style.borderColor = 'var(--ec-border-light)';
              }}
            >
              <Terminal size={15} />
            </button>

            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              data-cursor="THEME"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: 'var(--ec-radius-full)',
                backgroundColor: theme === 'dark' ? 'rgba(216, 255, 69, 0.12)' : 'rgba(59, 85, 244, 0.1)',
                border: '1.5px solid',
                borderColor: theme === 'dark' ? 'rgba(216, 255, 69, 0.45)' : 'rgba(59, 85, 244, 0.4)',
                color: theme === 'dark' ? 'var(--ec-acid-lime)' : 'var(--ec-electric-blue)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === 'dark' ? 'DARK' : 'LIGHT'}</span>
            </button>

            {/* GitHub OAuth Trigger */}
            <button
              onClick={onConnectGitHub}
              data-cursor="AUTH"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: 'var(--ec-radius-full)',
                backgroundColor: 'var(--ec-bg-chip)',
                border: '1px solid var(--ec-border-light)',
                color: 'var(--ec-text-primary)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              className="hidden-mobile"
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--ec-bg-elevated)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'var(--ec-bg-chip)';
              }}
            >
              <Github size={14} />
              GitHub
            </button>

            {/* Primary Action: Launch Workspace / Explore */}
            <button
              onClick={onOpenScan}
              data-cursor="START"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: 'var(--ec-radius-full)',
                backgroundColor: 'var(--ec-electric-blue)',
                border: '1px solid transparent',
                color: '#FFFFFF',
                fontFamily: 'var(--font-display)',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 0 20px var(--ec-electric-blue-glow)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#6880FF';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'var(--ec-electric-blue)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>Explore Repo</span>
              <ArrowUpRight size={14} />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="show-mobile-only"
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                background: 'transparent',
                border: '1px solid var(--ec-border-light)',
                borderRadius: '8px',
                color: 'var(--ec-text-primary)',
                cursor: 'pointer'
              }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Fullscreen Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 890,
            backgroundColor: 'var(--ec-bg-dark)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '100px 28px 40px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {NAV_LINKS.map(link => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                style={{
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: 'var(--ec-text-primary)',
                  cursor: 'pointer'
                }}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenScan(); }}
              className="ec-btn-primary"
              style={{ width: '100%' }}
            >
              Explore Repository
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onConnectGitHub(); }}
              className="ec-btn-secondary"
              style={{ width: '100%' }}
            >
              <Github size={16} /> Connect GitHub
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenWorkspace(); }}
              className="ec-btn-secondary"
              style={{ width: '100%' }}
            >
              Open Workbench
            </button>
          </div>
        </div>
      )}

      {/* Media query helper styles for header */}
      <style>{`
        @media (max-width: 900px) {
          .hidden-mobile { display: none !important; }
          .show-mobile-only { display: inline-flex !important; }
        }
      `}</style>
    </>
  );
};

