import React from 'react';
import { 
  Code2, 
  Gauge, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  FileCheck2, 
  GitCompare,
  ArrowRight
} from 'lucide-react';

export const FeatureIndex: React.FC = () => {
  return (
    <section
      id="features"
      className="ec-chapter"
      style={{
        backgroundColor: 'var(--ec-bg-secondary)',
        position: 'relative'
      }}
    >
      <div className="ec-container">
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(216, 255, 69, 0.12)', color: 'var(--ec-acid-lime)', border: '1px solid rgba(216, 255, 69, 0.25)' }}>
            CHAPTER 09 // SYSTEM CAPABILITIES
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-border-subtle)' }} />
          <span className="ec-meta-mono">EVIDENCE 09-I</span>
        </div>

        {/* Headline */}
        <div style={{ maxWidth: '880px', marginBottom: '48px' }}>
          <h2 className="ec-title-section" style={{ marginBottom: '18px' }}>
            Engineered for{' '}
            <span className="ec-editorial-accent" style={{ color: 'var(--ec-acid-lime)' }}>
              dependency resilience.
            </span>
          </h2>
          <p className="ec-body-large">
            A complete suite of purpose-built tools designed to replace guesswork with empirical evidence across every stage of the software maintenance lifecycle.
          </p>
        </div>

        {/* Asymmetrical Irregular Bento Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '20px'
        }}>
          {/* Feature 01: Static AST Intelligence (Span 7) */}
          <div
            className="ec-card-glass"
            style={{
              gridColumn: 'span 7',
              padding: '36px',
              borderRadius: 'var(--ec-radius-lg)',
              backgroundColor: 'var(--ec-bg-card)',
              border: '1px solid var(--ec-border-light)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Code2 size={20} style={{ color: 'var(--ec-electric-blue)' }} />
                <span className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)' }}>
                  FEATURE 01 // STATIC AST PARSER
                </span>
              </div>
              <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(83, 109, 255, 0.12)', color: 'var(--ec-electric-blue)' }}>
                ZERO CODE EXECUTION
              </span>
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 700, color: 'var(--ec-text-primary)', marginBottom: '12px' }}>
              Deep Code Understanding via Static AST
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ec-text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
              Never executes unknown repository code during discovery. Analyzes Python standard library <code>ast</code> trees to inspect module imports, symbol bindings, and exact enclosing function scopes.
            </p>

            <div style={{
              backgroundColor: 'var(--ec-bg-chip)',
              borderRadius: 'var(--ec-radius-sm)',
              padding: '16px',
              border: '1px solid var(--ec-border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              color: 'var(--ec-acid-lime)'
            }}>
              ast.walk(tree) → Identifies 14 callsites across 8 modules
            </div>
          </div>

          {/* Feature 02: Deterministic Risk Scoring (Span 5) */}
          <div
            className="ec-card-glass"
            style={{
              gridColumn: 'span 5',
              padding: '36px',
              borderRadius: 'var(--ec-radius-lg)',
              backgroundColor: 'var(--ec-bg-card)',
              border: '1px solid var(--ec-border-light)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Gauge size={20} style={{ color: 'var(--ec-risk-red)' }} />
                <span className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)' }}>
                  FEATURE 02 // RISK ENGINE
                </span>
              </div>
              <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(255, 98, 78, 0.12)', color: 'var(--ec-risk-red)' }}>
                0 — 100 SCALE
              </span>
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 700, color: 'var(--ec-text-primary)', marginBottom: '12px' }}>
              Explainable Risk Scoring
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ec-text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
              Deterministic 0–100 risk calculation based on release lag, yanked package flags, maintenance silence, and runtime incompatibilities.
            </p>

            {/* Visual Risk Gauge Meter */}
            <div style={{
              height: '8px',
              width: '100%',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, #51D6A0 0%, #FFB84D 50%, #FF624E 100%)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-5px',
                left: '78%',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: 'var(--ec-bg-card)',
                boxShadow: '0 0 10px #FF624E',
                transform: 'translateX(-50%)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-text-dim)' }}>
              <span>0 (Pristine)</span>
              <span style={{ color: 'var(--ec-risk-red)', fontWeight: 700 }}>78 (High Risk)</span>
              <span>100 (Critical)</span>
            </div>
          </div>

          {/* Feature 03: AI Migration Proposals (Span 4) */}
          <div
            className="ec-card-glass"
            style={{
              gridColumn: 'span 4',
              padding: '32px',
              borderRadius: 'var(--ec-radius-lg)',
              backgroundColor: 'var(--ec-bg-card)',
              border: '1px solid var(--ec-border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Sparkles size={18} style={{ color: 'var(--ec-ultraviolet)' }} />
              <span className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)' }}>
                FEATURE 03 // GEMMA 4
              </span>
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ec-text-primary)', marginBottom: '10px' }}>
              Schema-Bound AI Plans
            </h4>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.86rem', color: 'var(--ec-text-muted)', lineHeight: 1.55 }}>
              Strict JSON validation against Pydantic models. Compatible with Google Gemini API, Together AI, or 100% offline local Ollama.
            </p>
          </div>

          {/* Feature 04: Independent Verification (Span 4) */}
          <div
            className="ec-card-glass"
            style={{
              gridColumn: 'span 4',
              padding: '32px',
              borderRadius: 'var(--ec-radius-lg)',
              backgroundColor: 'var(--ec-bg-card)',
              border: '1px solid var(--ec-border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--ec-emerald)' }} />
              <span className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)' }}>
                FEATURE 04 // VERIFICATION
              </span>
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ec-text-primary)', marginBottom: '10px' }}>
              10-Point Empirical Sandbox
            </h4>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.86rem', color: 'var(--ec-text-muted)', lineHeight: 1.55 }}>
              Independent installation and test harness execution in ephemeral virtualenvs. Proves compatibility before touching code.
            </p>
          </div>

          {/* Feature 05: Human Approval Gate (Span 4) */}
          <div
            className="ec-card-glass"
            style={{
              gridColumn: 'span 4',
              padding: '32px',
              borderRadius: 'var(--ec-radius-lg)',
              backgroundColor: 'var(--ec-bg-card)',
              border: '1px solid var(--ec-border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <UserCheck size={18} style={{ color: 'var(--ec-acid-lime)' }} />
              <span className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)' }}>
                FEATURE 05 // APPROVAL GATE
              </span>
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ec-text-primary)', marginBottom: '10px' }}>
              Human Authorization Gate
            </h4>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.86rem', color: 'var(--ec-text-muted)', lineHeight: 1.55 }}>
              Enforces developer sign-off with audit notes. Rejects unreviewed code modification to prevent AI drift.
            </p>
          </div>

          {/* Feature 06: Dependency Exit Capsule (Span 6) */}
          <div
            className="ec-card-glass"
            style={{
              gridColumn: 'span 6',
              padding: '36px',
              borderRadius: 'var(--ec-radius-lg)',
              backgroundColor: 'var(--ec-bg-card)',
              border: '1px solid var(--ec-border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <FileCheck2 size={18} style={{ color: 'var(--ec-electric-blue)' }} />
              <span className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)' }}>
                FEATURE 06 // EXIT CAPSULE ARTIFACT
              </span>
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ec-text-primary)', marginBottom: '10px' }}>
              Tamper-Evident Evidence Ledger
            </h4>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--ec-text-muted)', lineHeight: 1.55 }}>
              Generates versioned <code>capsule.json</code> and human-readable <code>capsule.md</code> containing full diagnostic test proofs.
            </p>
          </div>

          {/* Feature 07: Post-Implementation Verification (Span 6) */}
          <div
            className="ec-card-glass"
            style={{
              gridColumn: 'span 6',
              padding: '36px',
              borderRadius: 'var(--ec-radius-lg)',
              backgroundColor: 'var(--ec-bg-card)',
              border: '1px solid var(--ec-border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <GitCompare size={18} style={{ color: 'var(--ec-emerald)' }} />
              <span className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)' }}>
                FEATURE 07 // POST-VERIFICATION
              </span>
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ec-text-primary)', marginBottom: '10px' }}>
              Unified Diff &amp; Import Audit
            </h4>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--ec-text-muted)', lineHeight: 1.55 }}>
              Compares modified worktrees against baseline branches, verifies legacy import removals, and confirms clean test suite execution.
            </p>
          </div>
        </div>
      </div>

      {/* Responsive Grid Helpers */}
      <style>{`
        @media (max-width: 1024px) {
          .ec-card-glass[style*="gridColumn"] {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </section>
  );
};

