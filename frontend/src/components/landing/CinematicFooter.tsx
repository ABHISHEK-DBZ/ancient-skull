import React from 'react';
import { ArrowUp, Github, Terminal, Shield, BookOpen } from 'lucide-react';

interface CinematicFooterProps {
  onOpenDocs: () => void;
  onOpenCli: () => void;
}

export const CinematicFooter: React.FC<CinematicFooterProps> = ({
  onOpenDocs,
  onOpenCli
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      style={{
        backgroundColor: '#07080A',
        color: 'var(--ec-text-primary)',
        padding: '80px 0 40px',
        position: 'relative'
      }}
    >
      <div className="ec-container">
        {/* Main Footer Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr',
          gap: '48px',
          paddingBottom: '60px',
          borderBottom: '1px solid var(--ec-border-subtle)'
        }}>
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: 'var(--ec-bg-secondary)',
                border: '1px solid rgba(83, 109, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  backgroundColor: 'var(--ec-acid-lime)',
                  borderRadius: '2px',
                  transform: 'rotate(45deg)'
                }} />
              </div>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--ec-text-primary)'
              }}>
                EXIT CAPSULE
              </span>
            </div>

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              color: 'var(--ec-text-muted)',
              maxWidth: '360px',
              lineHeight: 1.6,
              marginBottom: '20px'
            }}>
              AI-Powered Python Dependency Resilience &amp; Migration Planning Tool.
              Empirical sandbox verification for modern software architectures.
            </p>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              color: 'var(--ec-text-dim)'
            }}>
              SYSTEM PRINCIPLE: AI proposes. The tool verifies. The developer approves.
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <div className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)', marginBottom: '18px' }}>
              NAVIGATION
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Problem & Decay', href: '#problem' },
                { label: 'Core Philosophy', href: '#philosophy' },
                { label: 'Resilience Workflow', href: '#workflow' },
                { label: 'AST Laboratory', href: '#laboratory' },
                { label: 'AI Migration Target', href: '#migration' },
                { label: '10-Point Verification', href: '#verification' },
                { label: 'Security Boundaries', href: '#security' }
              ].map(link => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    data-cursor="LINK"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.88rem',
                      color: 'var(--ec-text-muted)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--ec-text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--ec-text-muted)')}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Developer Resources */}
          <div>
            <div className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)', marginBottom: '18px' }}>
              DEVELOPER RESOURCES
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>
                <button
                  onClick={onOpenDocs}
                  data-cursor="DOCS"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.88rem',
                    color: 'var(--ec-text-muted)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ec-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ec-text-muted)')}
                >
                  Architecture &amp; API Docs
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenCli}
                  data-cursor="CLI"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.88rem',
                    color: 'var(--ec-text-muted)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ec-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ec-text-muted)')}
                >
                  CLI Quickstart Guide
                </button>
              </li>
              <li>
                <a
                  href="https://github.com/Paritosh2681/H26_Lexacore_Exit-Capsule-Generator"
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="GITHUB"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.88rem',
                    color: 'var(--ec-text-muted)',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ec-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ec-text-muted)')}
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Back to Top */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingTop: '32px'
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--ec-text-dim)'
          }}>
            RELEASED UNDER THE APACHE 2.0 LICENSE • ZERO TELEMETRY WITHOUT PERMISSION
          </div>

          <button
            onClick={scrollToTop}
            data-cursor="TOP"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--ec-radius-full)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--ec-border-subtle)',
              color: 'var(--ec-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            <span>BACK TO TOP</span>
            <ArrowUp size={12} />
          </button>
        </div>
      </div>
    </footer>
  );
};

