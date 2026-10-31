import React, { useState, useRef } from 'react';
import { 
  ArrowRight, 
  Terminal, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  FileText, 
  Download, 
  Check, 
  Sparkles,
  ExternalLink,
  Cpu
} from 'lucide-react';

interface HeroExperienceProps {
  onExploreRepo: () => void;
  onExploreSystem: () => void;
  onConnectGitHub: () => void;
}

interface MockPackageRow {
  id: string;
  pkg: string;
  currentVer: string;
  risk: 'High' | 'Medium' | 'Low';
  riskScore: number;
  aiProposal: string;
  verifiedChecks: string;
  approved: boolean;
}

export const HeroExperience: React.FC<HeroExperienceProps> = ({
  onExploreRepo,
  onExploreSystem,
  onConnectGitHub
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 6, ry: -8 });

  const [packages, setPackages] = useState<MockPackageRow[]>([
    {
      id: 'req',
      pkg: 'requests',
      currentVer: '2.22.0',
      risk: 'High',
      riskScore: 78,
      aiProposal: 'httpx',
      verifiedChecks: '10/10 Verified',
      approved: true
    },
    {
      id: 'cv',
      pkg: 'opencv-python',
      currentVer: '4.5.1',
      risk: 'Medium',
      riskScore: 54,
      aiProposal: 'opencv-python-headless',
      verifiedChecks: '10/10 Verified',
      approved: false
    },
    {
      id: 'pd',
      pkg: 'pandas',
      currentVer: '1.1.5',
      risk: 'Medium',
      riskScore: 48,
      aiProposal: 'pandas 2.2.0',
      verifiedChecks: '10/10 Verified',
      approved: false
    },
    {
      id: 'flk',
      pkg: 'flask',
      currentVer: '1.1.2',
      risk: 'High',
      riskScore: 71,
      aiProposal: 'fastapi',
      verifiedChecks: '10/10 Verified',
      approved: false
    }
  ]);

  const toggleApprove = (id: string) => {
    setPackages(prev =>
      prev.map(p => (p.id === id ? { ...p, approved: !p.approved } : p))
    );
  };

  // Subtle 3D mouse parallax on the workstation preview
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: -(y * 12) + 4,
      ry: x * 14 - 6
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 6, ry: -8 });
  };

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        paddingTop: '130px',
        paddingBottom: '80px',
        borderBottom: '1px solid var(--ec-border-subtle)',
        overflow: 'hidden'
      }}
    >
      {/* Background Blueprint Grid & Scanning Shimmer */}
      <div 
        className="ec-grid-bg"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.18,
          pointerEvents: 'none'
        }}
      />
      <div className="ec-scanline" />

      {/* Atmospheric Radial Glow Behind Content */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          right: '18%',
          width: '650px',
          height: '650px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(83, 109, 255, 0.16) 0%, rgba(81, 214, 160, 0.05) 50%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none'
        }}
      />

      <div className="ec-container-wide" style={{ width: '100%' }}>
        <div
          className="ec-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 1.15fr',
            alignItems: 'center',
            gap: '48px'
          }}
        >
          {/* Left Column: Expressive Typography & Action CTAs */}
          <div>
            {/* Metadata Pill Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
              <span className="ec-badge-mono" style={{ backgroundColor: 'var(--ec-bg-chip)', color: 'var(--ec-text-primary)', border: '1px solid var(--ec-border-light)' }}>
                PYTHON 3.12+
              </span>
              <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(83, 109, 255, 0.14)', color: 'var(--ec-electric-blue)', border: '1px solid rgba(83, 109, 255, 0.35)' }}>
                STATIC AST ANALYSIS
              </span>
              <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(216, 255, 69, 0.14)', color: 'var(--ec-acid-lime)', border: '1px solid rgba(216, 255, 69, 0.35)' }}>
                GEMMA 4 PLANNER
              </span>
              <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(81, 214, 160, 0.14)', color: 'var(--ec-emerald)', border: '1px solid rgba(81, 214, 160, 0.35)' }}>
                EVIDENCE-DRIVEN
              </span>
            </div>

            {/* Editorial Headline */}
            <h1 className="ec-title-display" style={{ marginBottom: '24px' }}>
              Turn risky Python <br />
              <span style={{ color: 'var(--ec-electric-blue)' }}>dependencies</span> <br />
              <span className="ec-editorial-accent" style={{ color: 'var(--ec-text-primary)' }}>
                into a resilient future.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="ec-body-large" style={{ maxWidth: '580px', marginBottom: '36px' }}>
              Scan local projects, detect vulnerable or outdated packages via static AST analysis, get AI-powered alternatives from Gemma 4, verify everything in isolated virtualenvs, and generate an evidence-backed Exit Capsule.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', marginBottom: '44px' }}>
              <button
                onClick={onExploreRepo}
                className="ec-btn-primary"
                data-cursor="SCAN"
              >
                <span>Get Started Free</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={onExploreSystem}
                className="ec-btn-secondary"
                data-cursor="WORKSPACE"
              >
                <span>Launch Workspace</span>
              </button>
            </div>

            {/* Core Principle Footnote */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid var(--ec-border-subtle)'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--ec-emerald)',
                boxShadow: '0 0 8px var(--ec-emerald)'
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                color: 'var(--ec-text-muted)',
                letterSpacing: '0.04em'
              }}>
                PRODUCT PRINCIPLE: <strong style={{ color: 'var(--ec-text-primary)' }}>AI proposes. The tool verifies. The developer approves.</strong>
              </span>
            </div>
          </div>

          {/* Right Column: Sleek 3D Perspective Workstation & Live Scanning Dashboard */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              perspective: '1200px',
              transformStyle: 'preserve-3d',
              position: 'relative'
            }}
          >
            <div
              style={{
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                transition: 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
                backgroundColor: 'var(--ec-bg-card)',
                borderRadius: 'var(--ec-radius-xl)',
                border: '1.5px solid rgba(83, 109, 255, 0.35)',
                boxShadow: 'var(--ec-shadow-cinematic)',
                overflow: 'hidden',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              {/* Window Header Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 22px',
                backgroundColor: 'var(--ec-bg-secondary)',
                borderBottom: '1px solid var(--ec-border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#FF5F56' }} />
                  <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
                  <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#27C93F' }} />
                  <span style={{ marginLeft: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--ec-text-primary)', fontWeight: 600 }}>
                    Exit Capsule // Live Scanning Environment
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={onExploreSystem}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: 'var(--ec-radius-sm)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--ec-border-subtle)',
                      color: 'var(--ec-text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      cursor: 'pointer'
                    }}
                  >
                    <FileText size={11} />
                    <span>View Report</span>
                  </button>

                  <button
                    onClick={onExploreRepo}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: 'var(--ec-radius-sm)',
                      backgroundColor: 'rgba(83, 109, 255, 0.15)',
                      border: '1px solid var(--ec-electric-blue)',
                      color: 'var(--ec-electric-blue)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={11} />
                    <span>Download Capsule</span>
                  </button>
                </div>
              </div>

              {/* Workstation Body */}
              <div style={{ padding: '24px' }}>
                {/* 5-Step Progress Stepper Strip */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: 'var(--ec-bg-elevated)',
                  borderRadius: 'var(--ec-radius-md)',
                  border: '1px solid var(--ec-border-subtle)',
                  marginBottom: '20px'
                }}>
                  {[
                    { num: '1', label: 'Scanning', status: 'done', color: 'var(--ec-electric-blue)' },
                    { num: '2', label: 'Analyzing', status: 'done', color: 'var(--ec-electric-blue)' },
                    { num: '3', label: 'AI Proposals', status: 'active', color: 'var(--ec-ultraviolet)' },
                    { num: '4', label: 'Verifying', status: 'active', color: 'var(--ec-emerald)' },
                    { num: '5', label: 'Generating', status: 'ready', color: 'var(--ec-acid-lime)' }
                  ].map((step, idx) => (
                    <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: step.color,
                        color: 'var(--ec-text-inverse)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {step.num}
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--ec-text-primary)'
                      }}>
                        {step.label}
                      </span>
                      {idx < 4 && (
                        <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--ec-border-subtle)', margin: '0 4px' }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* 4 Summary Metric Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  marginBottom: '22px'
                }}>
                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--ec-bg-elevated)', borderRadius: 'var(--ec-radius-sm)', border: '1px solid var(--ec-border-subtle)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'var(--ec-text-dim)', marginBottom: '4px' }}>
                      Dependencies Found
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ec-text-primary)' }}>
                      124
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--ec-bg-elevated)', borderRadius: 'var(--ec-radius-sm)', border: '1px solid rgba(255, 98, 78, 0.3)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'var(--ec-risk-red)', marginBottom: '4px' }}>
                      High Risk
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ec-risk-red)' }}>
                      8
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--ec-bg-elevated)', borderRadius: 'var(--ec-radius-sm)', border: '1px solid rgba(255, 184, 77, 0.3)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'var(--ec-amber)', marginBottom: '4px' }}>
                      Needs Update
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ec-amber)' }}>
                      32
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--ec-bg-elevated)', borderRadius: 'var(--ec-radius-sm)', border: '1px solid rgba(81, 214, 160, 0.3)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'var(--ec-emerald)', marginBottom: '4px' }}>
                      Safe &amp; Clean
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ec-emerald)' }}>
                      84
                    </div>
                  </div>
                </div>

                {/* Interactive Dependency Audit Table */}
                <div style={{
                  backgroundColor: 'var(--ec-bg-elevated)',
                  borderRadius: 'var(--ec-radius-md)',
                  border: '1px solid var(--ec-border-subtle)',
                  overflow: 'hidden'
                }}>
                  {/* Table Headers */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 0.8fr 1.3fr 1.1fr 0.9fr',
                    padding: '10px 16px',
                    backgroundColor: 'var(--ec-bg-chip)',
                    borderBottom: '1px solid var(--ec-border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'var(--ec-text-dim)',
                    letterSpacing: '0.06em'
                  }}>
                    <span>PACKAGE</span>
                    <span>RISK</span>
                    <span>AI SUGGESTION</span>
                    <span>VERIFICATION</span>
                    <span style={{ textAlign: 'right' }}>ACTION</span>
                  </div>

                  {/* Table Rows */}
                  {packages.map(p => (
                    <div
                      key={p.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 0.8fr 1.3fr 1.1fr 0.9fr',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--ec-border-subtle)',
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {/* Package Name & Ver */}
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--ec-text-primary)' }}>
                          {p.pkg}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--ec-text-dim)' }}>
                          == {p.currentVer}
                        </div>
                      </div>

                      {/* Risk Badge */}
                      <div>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: p.risk === 'High' ? 'rgba(255, 98, 78, 0.16)' : 'rgba(255, 184, 77, 0.16)',
                          color: p.risk === 'High' ? 'var(--ec-risk-red)' : 'var(--ec-amber)',
                          border: `1px solid ${p.risk === 'High' ? 'rgba(255, 98, 78, 0.3)' : 'rgba(255, 184, 77, 0.3)'}`
                        }}>
                          {p.risk}
                        </span>
                      </div>

                      {/* AI Suggestion */}
                      <div style={{ color: 'var(--ec-ultraviolet)', fontWeight: 600 }}>
                        {p.aiProposal}
                      </div>

                      {/* Verification Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--ec-emerald)' }}>
                        <CheckCircle2 size={13} />
                        <span style={{ fontSize: '0.72rem' }}>{p.verifiedChecks}</span>
                      </div>

                      {/* Action Button */}
                      <div style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => toggleApprove(p.id)}
                          data-cursor="CLICK"
                          style={{
                            padding: '4px 12px',
                            borderRadius: 'var(--ec-radius-sm)',
                            border: '1px solid',
                            borderColor: p.approved ? 'var(--ec-emerald)' : 'var(--ec-border-light)',
                            backgroundColor: p.approved ? 'rgba(81, 214, 160, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: p.approved ? 'var(--ec-emerald)' : 'var(--ec-text-primary)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {p.approved ? '✓ Approved' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Footer Telemetry */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 22px',
                backgroundColor: 'var(--ec-bg-secondary)',
                borderTop: '1px solid var(--ec-border-subtle)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--ec-text-dim)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--ec-emerald)', display: 'inline-block' }} />
                  <span>WORKSPACE: telemetry-service-py (Active)</span>
                </div>
                <div>
                  AI PROPOSES • TOOL VERIFIES • DEVELOPER APPROVES
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
