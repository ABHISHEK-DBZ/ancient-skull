import React, { useState } from 'react';
import { 
  GitBranch, 
  Search, 
  Network, 
  Sparkles, 
  CheckCircle, 
  CheckCircle2,
  FileCheck, 
  ArrowRight, 
  FolderGit2, 
  ShieldCheck, 
  AlertCircle,
  FileCode,
  Terminal
} from 'lucide-react';

interface WorkflowStep {
  number: string;
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  visualComponent: React.ReactNode;
}

export const WorkflowJourney: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const STEPS: WorkflowStep[] = [
    {
      number: '01',
      id: 'connect',
      title: 'CONNECT',
      subtitle: 'LOCAL REPOSITORY OR GITHUB',
      badge: 'INPUT GATEWAY',
      description: 'Point Exit Capsule to any local directory or connect your GitHub repository via secure OAuth. The engine works in zero-execution mode.',
      visualComponent: (
        <div style={{ backgroundColor: 'var(--ec-bg-terminal)', padding: '24px', borderRadius: 'var(--ec-radius-md)', border: '1px solid var(--ec-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <FolderGit2 size={18} style={{ color: 'var(--ec-electric-blue)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ec-text-primary)', fontWeight: 600 }}>
              workspace / telemetry-service-py
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, padding: '14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px dashed var(--ec-border-light)', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--ec-text-muted)' }}>Local Directory</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-text-dim)', marginTop: '4px' }}>/path/to/project</div>
            </div>
            <div style={{ flex: 1, padding: '14px', backgroundColor: 'rgba(83, 109, 255, 0.08)', border: '1px solid rgba(83, 109, 255, 0.3)', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--ec-electric-blue)', fontWeight: 600 }}>GitHub OAuth</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-text-dim)', marginTop: '4px' }}>Branch: main</div>
            </div>
          </div>
        </div>
      )
    },
    {
      number: '02',
      id: 'discover',
      title: 'DISCOVER',
      subtitle: 'DEPENDENCY MANIFEST PARSING',
      badge: 'DETERMINISTIC EXTRACTION',
      description: 'The engine parses pyproject.toml, requirements.txt, setup.py, Pipfile, and poetry.lock to normalize package names via PEP 503 and evaluate specifiers.',
      visualComponent: (
        <div style={{ backgroundColor: 'var(--ec-bg-terminal)', padding: '20px', borderRadius: 'var(--ec-radius-md)', border: '1px solid var(--ec-border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          <div style={{ color: 'var(--ec-text-dim)', marginBottom: '8px' }}># Extracted from requirements.txt:</div>
          <div style={{ color: 'var(--ec-risk-red)', marginBottom: '4px' }}>requests==2.22.0  <span style={{ color: 'var(--ec-text-dim)' }}># [LAG: 5+ YEARS]</span></div>
          <div style={{ color: 'var(--ec-amber)', marginBottom: '4px' }}>pyyaml==5.1.2     <span style={{ color: 'var(--ec-text-dim)' }}># [CVE-2020-14343]</span></div>
          <div style={{ color: 'var(--ec-emerald)' }}>fastapi==0.110.0  <span style={{ color: 'var(--ec-text-dim)' }}># [UP TO DATE]</span></div>
        </div>
      )
    },
    {
      number: '03',
      id: 'understand',
      title: 'UNDERSTAND',
      subtitle: 'STATIC PYTHON AST ANALYSIS',
      badge: 'ZERO RUNTIME CODE EXECUTION',
      description: 'Walks the Abstract Syntax Tree without executing code. Tracks imports, function scopes, aliases, and every callsite where the package is actually invoked.',
      visualComponent: (
        <div style={{ backgroundColor: 'var(--ec-bg-terminal)', padding: '20px', borderRadius: 'var(--ec-radius-md)', border: '1px solid var(--ec-border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
          <div style={{ color: 'var(--ec-text-dim)', marginBottom: '6px' }}>AST Call Site Map:</div>
          <div style={{ padding: '8px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--ec-electric-blue)' }}>src/client.py:42</span> → <code>requests.get(url, timeout=5)</code>
          </div>
          <div style={{ padding: '8px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--ec-electric-blue)' }}>src/auth.py:18</span> → <code>HTTPBasicAuth(user, pass)</code>
          </div>
        </div>
      )
    },
    {
      number: '04',
      id: 'propose',
      title: 'PROPOSE',
      subtitle: 'SCHEMA-BOUND GEMMA 4 REASONING',
      badge: 'AI MIGRATION TARGET',
      description: 'Bounded AST usage snippets and compatibility flags are sent to Gemma 4. The model returns structured migration paths with expected API differences.',
      visualComponent: (
        <div style={{ backgroundColor: 'var(--ec-bg-terminal)', padding: '20px', borderRadius: 'var(--ec-radius-md)', border: '1px solid var(--ec-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ec-risk-red)', fontWeight: 600 }}>requests</span>
            <ArrowRight size={16} style={{ color: 'var(--ec-electric-blue)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ec-emerald)', fontWeight: 600 }}>httpx &gt;= 0.27.0</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.76rem', color: 'var(--ec-text-muted)' }}>
            Provides native async support and near drop-in synchronous API parity.
          </div>
        </div>
      )
    },
    {
      number: '05',
      id: 'verify',
      title: 'VERIFY',
      subtitle: 'INDEPENDENT 10-POINT EMPIRICAL CHECK',
      badge: 'EPHEMERAL VIRTUALENV',
      description: 'Builds isolated virtualenvs on demand. Installs candidate packages, inspects exports, runs AST symbol coverage, and executes project test suites.',
      visualComponent: (
        <div style={{ backgroundColor: 'var(--ec-bg-terminal)', padding: '16px', borderRadius: 'var(--ec-radius-md)', border: '1px solid var(--ec-border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ec-emerald)', marginBottom: '4px' }}>
            <span>01. PyPI Release Exists</span> <span>[PASS]</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ec-emerald)', marginBottom: '4px' }}>
            <span>04. Clean Venv Install</span> <span>[PASS]</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ec-amber)', marginBottom: '4px' }}>
            <span>06. API Symbol Parity</span> <span>[INCONCLUSIVE]</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ec-emerald)' }}>
            <span>07. Baseline Test Suite</span> <span>[PASS]</span>
          </div>
        </div>
      )
    },
    {
      number: '06',
      id: 'approve',
      title: 'APPROVE',
      subtitle: 'EVIDENCE-BACKED IMPLEMENTATION PLAN',
      badge: 'DECISION LOCK',
      description: 'You review empirical verification logs and approve or reject. On approval, Exit Capsule generates a 15-point implementation plan and AI agent directives.',
      visualComponent: (
        <div style={{ backgroundColor: 'var(--ec-bg-terminal)', padding: '20px', borderRadius: 'var(--ec-radius-md)', border: '1px solid var(--ec-emerald)', boxShadow: '0 0 20px var(--ec-emerald-glow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ec-emerald)', marginBottom: '8px' }}>
            <CheckCircle2 size={16} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700 }}>MIGRATION APPROVED BY DEVELOPER</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ec-text-muted)' }}>
            Artifact: capsule.json &amp; capsule.md generated. Implementation plan unlocked.
          </div>
        </div>
      )
    }
  ];

  return (
    <section
      id="workflow"
      className="ec-chapter"
      style={{
        backgroundColor: 'var(--ec-bg-secondary)',
        position: 'relative'
      }}
    >
      <div className="ec-container">
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(83, 109, 255, 0.12)', color: 'var(--ec-electric-blue)', border: '1px solid rgba(83, 109, 255, 0.25)' }}>
            CHAPTER 03 // THE RESILIENCE PIPELINE
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-border-subtle)' }} />
          <span className="ec-meta-mono">EVIDENCE 03-C</span>
        </div>

        <div style={{ maxWidth: '860px', marginBottom: '48px' }}>
          <h2 className="ec-title-section" style={{ marginBottom: '20px' }}>
            From repository{' '}
            <span className="ec-editorial-accent" style={{ color: 'var(--ec-electric-blue)' }}>
              to resilience.
            </span>
          </h2>
          <p className="ec-body-large">
            A continuous, verifiable six-stage pipeline that transforms unknown dependency vulnerabilities into an auditable, evidence-backed migration plan.
          </p>
        </div>

        {/* Step Progress Navigation Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px',
            marginBottom: '36px',
            overflowX: 'auto',
            paddingBottom: '8px'
          }}
        >
          {STEPS.map((s, idx) => {
            const isCurrent = activeStep === idx;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(idx)}
                data-cursor="STEP"
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--ec-radius-sm)',
                  backgroundColor: isCurrent ? 'rgba(83, 109, 255, 0.16)' : 'var(--ec-bg-chip)',
                  border: '1px solid',
                  borderColor: isCurrent ? 'var(--ec-electric-blue)' : 'var(--ec-border-subtle)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  minWidth: '130px'
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: isCurrent ? 'var(--ec-acid-lime)' : 'var(--ec-text-dim)', fontWeight: 700 }}>
                  STAGE {s.number}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: isCurrent ? 'var(--ec-text-primary)' : 'var(--ec-text-muted)', marginTop: '2px' }}>
                  {s.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Presentation Card */}
        <div
          className="ec-card-glass ec-crosshair-box"
          style={{
            padding: '40px',
            borderRadius: 'var(--ec-radius-lg)',
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '48px',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(83, 109, 255, 0.14)', color: 'var(--ec-electric-blue)' }}>
                {STEPS[activeStep].badge}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ec-text-dim)' }}>
                {STEPS[activeStep].subtitle}
              </span>
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, color: 'var(--ec-text-primary)', marginBottom: '16px' }}>
              {STEPS[activeStep].title}
            </h3>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', color: 'var(--ec-text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
              {STEPS[activeStep].description}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setActiveStep((prev) => (prev + 1) % STEPS.length)}
                className="ec-btn-secondary"
                data-cursor="NEXT"
                style={{ padding: '10px 20px', fontSize: '0.85rem' }}
              >
                <span>Next Stage</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div>
            {STEPS[activeStep].visualComponent}
          </div>
        </div>
      </div>
    </section>
  );
};

