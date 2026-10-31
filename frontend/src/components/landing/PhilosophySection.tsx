import React, { useState } from 'react';
import { Sparkles, ShieldCheck, UserCheck, ArrowDown, CheckCircle2 } from 'lucide-react';

const PILLARS = [
  {
    step: '01',
    title: 'AI Proposes',
    subtitle: 'SCHEMA-BOUND REASONING',
    color: 'var(--ec-ultraviolet)',
    glow: 'var(--ec-ultraviolet-glow)',
    icon: Sparkles,
    badge: 'GEMMA 4 / GEMINI',
    description: 'Migration alternatives are proposed using strictly schema-bound prompts containing bounded AST usages and project constraints — never whole repos. AI explores candidate libraries, expected API differences, and breaking changes.',
    evidenceTag: 'CLAIMS: ai_suggested_unverified'
  },
  {
    step: '02',
    title: 'The Tool Verifies',
    subtitle: '10-POINT EMPIRICAL SANDBOX',
    color: 'var(--ec-electric-blue)',
    glow: 'var(--ec-electric-blue-glow)',
    icon: ShieldCheck,
    badge: 'INDEPENDENT ENGINE',
    description: 'Every AI suggestion undergoes ruthless empirical validation: PyPI existence, Python constraint checks, clean virtualenv installation, module export inspection, AST symbol coverage, and baseline test execution.',
    evidenceTag: 'EVIDENCE: verified / rejected'
  },
  {
    step: '03',
    title: 'You Approve',
    subtitle: 'HUMAN-IN-THE-LOOP GATE',
    color: 'var(--ec-emerald)',
    glow: 'var(--ec-emerald-glow)',
    icon: UserCheck,
    badge: 'DEVELOPER AUTHORIZED',
    description: 'No code is modified and no implementation plan is emitted without explicit human review and authorization. You retain total agency over your architecture and codebase.',
    evidenceTag: 'GATE: human_approved_required'
  }
];

export const PhilosophySection: React.FC = () => {
  const [activePillar, setActivePillar] = useState<number>(0);

  return (
    <section
      id="philosophy"
      className="ec-chapter"
      style={{
        backgroundColor: 'var(--ec-bg-dark)',
        position: 'relative'
      }}
    >
      {/* Background blueprint grid */}
      <div className="ec-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none' }} />

      <div className="ec-container">
        {/* Editorial Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(83, 109, 255, 0.12)', color: 'var(--ec-electric-blue)', border: '1px solid rgba(83, 109, 255, 0.25)' }}>
            CHAPTER 02 // CORE PHILOSOPHY
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-border-subtle)' }} />
          <span className="ec-meta-mono">EVIDENCE 02-B</span>
        </div>

        {/* Section Grid */}
        <div
          className="ec-split-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 0.95fr',
            gap: '64px',
            alignItems: 'center'
          }}
        >
          {/* Left Column: Bold Typographic Manifesto */}
          <div>
            <h2 className="ec-title-section" style={{ marginBottom: '28px', lineHeight: 1.05 }}>
              AI proposes.{' '}
              <br />
              <span style={{ color: 'var(--ec-electric-blue)' }}>The tool verifies.</span>{' '}
              <br />
              <span className="ec-editorial-accent" style={{ color: 'var(--ec-emerald)' }}>
                You approve.
              </span>
            </h2>

            <p className="ec-body-large" style={{ maxWidth: '580px', marginBottom: '36px' }}>
              We reject the fallacy of autonomous coding agents modifying core dependencies unchecked. True dependency resilience requires AI speed combined with rigorous scientific verification and developer sovereignty.
            </p>

            {/* Editorial handwritten style callout */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              borderRadius: 'var(--ec-radius-md)',
              backgroundColor: 'var(--ec-bg-chip)',
              border: '1px solid var(--ec-border-light)',
              marginBottom: '36px'
            }}>
              <span className="ec-editorial-accent" style={{ fontSize: '1.25rem', color: 'var(--ec-acid-lime)' }}>
                "Human in the loop. Always."
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ec-text-dim)' }}>
                // ARCHITECTURAL MANDATE
              </span>
            </div>

            {/* Interactive pillar selector list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {PILLARS.map((p, idx) => {
                const isSelected = activePillar === idx;
                const IconComponent = p.icon;
                return (
                  <div
                    key={p.step}
                    onClick={() => setActivePillar(idx)}
                    data-cursor="EXPAND"
                    style={{
                      padding: '18px 22px',
                      borderRadius: 'var(--ec-radius-md)',
                      backgroundColor: isSelected ? 'var(--ec-bg-elevated)' : 'var(--ec-bg-card)',
                      border: '1px solid',
                      borderColor: isSelected ? p.color : 'var(--ec-border-subtle)',
                      boxShadow: isSelected ? `0 0 24px ${p.glow}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.25s var(--ec-ease-out-expo)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: p.color, fontWeight: 700 }}>
                          {p.step}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--ec-text-primary)' }}>
                          {p.title}
                        </span>
                      </div>
                      <span className="ec-badge-mono" style={{ backgroundColor: 'var(--ec-bg-chip)', color: p.color }}>
                        {p.badge}
                      </span>
                    </div>
                    {isSelected && (
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--ec-text-muted)', marginTop: '8px', lineHeight: 1.55 }}>
                        {p.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Three Dimensional Sculptural Slabs */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {PILLARS.map((p, idx) => {
              const isSelected = activePillar === idx;
              const IconComp = p.icon;
              return (
                <div
                  key={`slab-${p.step}`}
                  onClick={() => setActivePillar(idx)}
                  data-cursor="SELECT"
                  style={{
                    position: 'relative',
                    padding: '28px 32px',
                    borderRadius: 'var(--ec-radius-lg)',
                    background: 'var(--ec-bg-card)',
                    border: '1.5px solid',
                    borderColor: isSelected ? p.color : 'rgba(255, 255, 255, 0.1)',
                    boxShadow: isSelected ? `0 20px 40px -10px rgba(0,0,0,0.8), 0 0 35px ${p.glow}` : '0 10px 30px rgba(0, 0, 0, 0.4)',
                    transform: isSelected ? 'scale(1.02) translateX(8px)' : 'scale(1) translateX(0)',
                    transition: 'all 0.35s var(--ec-ease-out-expo)',
                    cursor: 'pointer'
                  }}
                >
                  {/* Decorative glowing edge tag */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0',
                      left: '32px',
                      width: '60px',
                      height: '3px',
                      backgroundColor: p.color,
                      boxShadow: `0 0 10px ${p.color}`
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--ec-bg-chip)',
                          border: `1px solid ${p.color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: p.color
                        }}
                      >
                        <IconComp size={22} />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ec-text-primary)' }}>
                          {p.title}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-text-dim)', letterSpacing: '0.08em' }}>
                          {p.subtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: p.color,
                      padding: '4px 10px',
                      borderRadius: 'var(--ec-radius-sm)',
                      backgroundColor: 'var(--ec-bg-chip)',
                      border: '1px solid var(--ec-border-subtle)'
                    }}>
                      {p.evidenceTag}
                    </div>
                  </div>

                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--ec-text-muted)', lineHeight: 1.55, margin: 0 }}>
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

