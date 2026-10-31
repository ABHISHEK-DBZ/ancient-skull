import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  MinusCircle, 
  AlertCircle, 
  ShieldCheck, 
  Terminal, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface VerificationCheck {
  number: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'NOT_RUN' | 'AI_UNVERIFIED';
  summary: string;
  evidenceOutput: string;
}

const VERIFICATION_CHECKS: VerificationCheck[] = [
  {
    number: '01',
    name: 'PyPI Package Existence',
    category: 'METADATA',
    status: 'PASS',
    summary: 'Empirically queried PyPI JSON API. Target package "httpx" exists and is active.',
    evidenceOutput: 'GET https://pypi.org/pypi/httpx/json -> 200 OK. Normalized name: httpx.'
  },
  {
    number: '02',
    name: 'Compatible Release Match',
    category: 'METADATA',
    status: 'PASS',
    summary: 'Resolved latest stable release satisfying PEP 440 constraints.',
    evidenceOutput: 'Resolved release: httpx==0.27.0 (Yanked: False, Pre-release: False).'
  },
  {
    number: '03',
    name: 'Python Version Constraints',
    category: 'ENVIRONMENT',
    status: 'PASS',
    summary: 'Repository requires Python >=3.10. httpx specifies requires_python ">=3.8".',
    evidenceOutput: 'Constraint satisfied: 3.12.7 in ">=3.8".'
  },
  {
    number: '04',
    name: 'Isolated Venv Installation',
    category: 'SANDBOX',
    status: 'PASS',
    summary: 'Created ephemeral venv at temp_workspaces/verify_42a8b. Pip wheel installation succeeded with 0 exit code.',
    evidenceOutput: 'Command: python -m pip install --no-cache-dir httpx==0.27.0\nOutput: Successfully installed anyio-4.4.0 certifi-2024.7.4 httpcore-1.0.5 httpx-0.27.0 idna-3.7 sniffio-1.3.1 (Exit: 0)'
  },
  {
    number: '05',
    name: 'Module Export Inspection',
    category: 'INSPECTION',
    status: 'PASS',
    summary: 'Dynamic import of "httpx" in isolated subshell succeeded. Exported symbols verified.',
    evidenceOutput: 'Exported attributes checked: get, post, Client, AsyncClient, BasicAuth, HTTPStatusError (6/6 found).'
  },
  {
    number: '06',
    name: 'AST Symbol Parity',
    category: 'STATIC_ANALYSIS',
    status: 'INCONCLUSIVE',
    summary: 'requests.Session does not directly equal httpx.Client without minor configuration adaptation.',
    evidenceOutput: 'Manual adapter recommended: requests.Session() -> httpx.Client(). Adapter pattern required for custom transport adapters.'
  },
  {
    number: '07',
    name: 'Baseline Test Execution',
    category: 'TEST_EVIDENCE',
    status: 'PASS',
    summary: 'Executed existing project test suite against pristine repository. 14 passed.',
    evidenceOutput: 'Command: pytest tests/\nOutput: 14 passed in 0.82s (Exit: 0)'
  },
  {
    number: '08',
    name: 'Replacement Test Execution',
    category: 'TEST_EVIDENCE',
    status: 'PASS',
    summary: 'Ran candidate test harness in sandbox with patched imports. Tests passed cleanly.',
    evidenceOutput: 'Command: pytest tests/test_client.py\nOutput: 6 passed in 0.44s (Exit: 0)'
  },
  {
    number: '09',
    name: 'License Compatibility',
    category: 'COMPLIANCE',
    status: 'PASS',
    summary: 'Original license: Apache-2.0. Candidate license: BSD-3-Clause. Fully compatible.',
    evidenceOutput: 'SPDX license expression: BSD-3-Clause is permissive and compatible with Apache-2.0 downstream.'
  },
  {
    number: '10',
    name: 'AI Claim Reconciliation',
    category: 'RECONCILIATION',
    status: 'PASS',
    summary: 'Reconciled all Gemma 4 claims against observed empirical sandbox facts.',
    evidenceOutput: '4/4 claims empirically confirmed. 0 unverified claims remaining in evidence ledger.'
  }
];

export const VerificationExperience: React.FC = () => {
  const [selectedCheck, setSelectedCheck] = useState<VerificationCheck>(VERIFICATION_CHECKS[3]); // Default check 04

  const getStatusBadge = (status: VerificationCheck['status']) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(81, 214, 160, 0.14)', color: 'var(--ec-emerald)' }}>
            <CheckCircle2 size={12} /> PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(255, 98, 78, 0.14)', color: 'var(--ec-risk-red)' }}>
            <XCircle size={12} /> FAIL
          </span>
        );
      case 'INCONCLUSIVE':
        return (
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(255, 184, 77, 0.14)', color: 'var(--ec-amber)' }}>
            <AlertCircle size={12} /> INCONCLUSIVE
          </span>
        );
      case 'NOT_RUN':
        return (
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--ec-text-dim)' }}>
            <MinusCircle size={12} /> NOT RUN
          </span>
        );
      case 'AI_UNVERIFIED':
        return (
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(143, 114, 255, 0.14)', color: 'var(--ec-ultraviolet)' }}>
            <HelpCircle size={12} /> AI SUGGESTED
          </span>
        );
    }
  };

  return (
    <section
      id="verification"
      className="ec-chapter"
      style={{
        backgroundColor: 'var(--ec-bg-dark)',
        position: 'relative'
      }}
    >
      <div className="ec-container">
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(81, 214, 160, 0.12)', color: 'var(--ec-emerald)', border: '1px solid rgba(81, 214, 160, 0.25)' }}>
            CHAPTER 06 // INDEPENDENT VERIFICATION
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-border-subtle)' }} />
          <span className="ec-meta-mono">EVIDENCE 06-F</span>
        </div>

        {/* Headline */}
        <div style={{ maxWidth: '880px', marginBottom: '40px' }}>
          <h2 className="ec-title-section" style={{ marginBottom: '18px' }}>
            A recommendation{' '}
            <span className="ec-editorial-accent" style={{ color: 'var(--ec-emerald)' }}>
              is not proof.
            </span>
          </h2>
          <p className="ec-body-large">
            Every candidate package is put through an automated 10-point verification engine inside isolated, ephemeral virtual environments. If it cannot install cleanly or breaks tests, the migration is rejected.
          </p>
        </div>

        {/* Verification Evidence Board */}
        <div
          className="ec-card-glass ec-crosshair-box"
          style={{
            borderRadius: 'var(--ec-radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--ec-border-light)'
          }}
        >
          {/* Top Control Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            backgroundColor: 'var(--ec-bg-card)',
            borderBottom: '1px solid var(--ec-border-subtle)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.74rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--ec-emerald)' }} />
              <span style={{ color: 'var(--ec-text-primary)', fontWeight: 600 }}>
                10-POINT EVIDENCE LEDGER: requests → httpx
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: 'var(--ec-emerald)' }}>9 VERIFIED</span>
              <span style={{ color: 'var(--ec-amber)' }}>1 INCONCLUSIVE</span>
              <span style={{ color: 'var(--ec-risk-red)' }}>0 FAILED</span>
            </div>
          </div>

          {/* Grid Layout: Checklist (Left) & Live Proof Inspector (Right) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            minHeight: '480px',
            backgroundColor: 'var(--ec-bg-card)'
          }}>
            {/* Left: 10 Check Items List */}
            <div style={{
              borderRight: '1px solid var(--ec-border-subtle)',
              maxHeight: '520px',
              overflowY: 'auto'
            }}>
              {VERIFICATION_CHECKS.map((chk) => {
                const isSelected = selectedCheck.number === chk.number;
                return (
                  <div
                    key={chk.number}
                    onClick={() => setSelectedCheck(chk)}
                    data-cursor="INSPECT"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--ec-border-subtle)',
                      backgroundColor: isSelected ? 'rgba(83, 109, 255, 0.12)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--ec-emerald)' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.18s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--ec-text-dim)', width: '22px' }}>
                        {chk.number}
                      </span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.86rem', fontWeight: 600, color: 'var(--ec-text-primary)' }}>
                          {chk.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'var(--ec-text-dim)', marginTop: '2px' }}>
                          {chk.category}
                        </div>
                      </div>
                    </div>

                    <div>
                      {getStatusBadge(chk.status)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Detailed Proof & Terminal Log Panel */}
            <div style={{
              padding: '28px',
              backgroundColor: 'var(--ec-bg-card)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span className="ec-meta-mono" style={{ color: 'var(--ec-text-dim)' }}>
                    CHECK #{selectedCheck.number} // EMPIRICAL LOG
                  </span>
                  {getStatusBadge(selectedCheck.status)}
                </div>

                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ec-text-primary)', marginBottom: '10px' }}>
                  {selectedCheck.name}
                </h3>

                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ec-text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                  {selectedCheck.summary}
                </p>

                {/* Subprocess Output Terminal Card */}
                <div style={{
                  backgroundColor: 'var(--ec-bg-terminal)',
                  borderRadius: 'var(--ec-radius-sm)',
                  border: '1px solid var(--ec-border-light)',
                  padding: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  lineHeight: 1.6,
                  color: '#E5E7EB',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  <div style={{ color: 'var(--ec-text-dim)', marginBottom: '6px' }}>$ Subprocess Evidence Dump:</div>
                  <div style={{ color: 'var(--ec-emerald)' }}>
                    {selectedCheck.evidenceOutput}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--ec-border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--ec-text-dim)'
              }}>
                <span>AUDIT: IMMUTABLE LEDGER</span>
                <span style={{ color: 'var(--ec-acid-lime)' }}>STATUS: DETERMINISTIC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

