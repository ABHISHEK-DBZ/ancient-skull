import React, { useState } from 'react';
import { ArrowRight, Sparkles, Check, AlertTriangle, ArrowLeftRight, Code2 } from 'lucide-react';

interface MigrationCase {
  sourcePkg: string;
  sourceVer: string;
  targetPkg: string;
  targetVer: string;
  reason: string;
  sourceCode: string;
  targetCode: string;
  apiDifferences: string[];
  suggestedTests: string[];
  assumptions: string;
}

const MIGRATIONS: MigrationCase[] = [
  {
    sourcePkg: 'requests',
    sourceVer: '2.22.0',
    targetPkg: 'httpx',
    targetVer: '>=0.27.0',
    reason: 'Modern async/await runtime support with nearly 100% synchronous API parity. Active maintainers and strict HTTP/2 protocol support.',
    sourceCode: `import requests\nresp = requests.get('https://api.dev/data', timeout=5)\ndata = resp.json()`,
    targetCode: `import httpx\nresp = httpx.get('https://api.dev/data', timeout=5.0)\ndata = resp.json()`,
    apiDifferences: [
      'httpx requires explicit float for timeouts (e.g., timeout=5.0).',
      'httpx raises HTTPStatusError instead of requests.HTTPError on raise_for_status().',
      'BasicAuth must be imported directly from httpx.BasicAuth.'
    ],
    suggestedTests: [
      'pytest tests/test_client.py -k test_http_get',
      'pytest tests/test_auth.py'
    ],
    assumptions: 'Assumes codebase runs Python 3.9+ and does not depend on private requests internals.'
  },
  {
    sourcePkg: 'pycrypto',
    sourceVer: '2.6.1',
    targetPkg: 'cryptography',
    targetVer: '>=42.0.0',
    reason: 'pycrypto is unmaintained abandonware with known buffer overflow vulnerabilities. cryptography provides audited, memory-safe primitives.',
    sourceCode: `from Crypto.Cipher import AES\ncipher = AES.new(secret_key, AES.MODE_CBC, iv)`,
    targetCode: `from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes\ncipher = Cipher(algorithms.AES(secret_key), modes.CBC(iv))`,
    apiDifferences: [
      'hazmat primitives require explicit backend passing in older Python versions.',
      'cryptography separates Cipher configuration from encryptor/decryptor contexts.'
    ],
    suggestedTests: [
      'pytest tests/test_security.py -k test_aes_encrypt'
    ],
    assumptions: 'Assumes OpenSSL development headers are installed in runtime image.'
  }
];

export const MigrationShowcase: React.FC = () => {
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0);
  const currentCase = MIGRATIONS[selectedCaseIdx];

  return (
    <section
      id="migration"
      className="ec-chapter"
      style={{
        backgroundColor: 'var(--ec-bg-secondary)',
        position: 'relative'
      }}
    >
      <div className="ec-container">
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(143, 114, 255, 0.14)', color: 'var(--ec-ultraviolet)', border: '1px solid rgba(143, 114, 255, 0.3)' }}>
            CHAPTER 05 // AI MIGRATION INTELLIGENCE
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-border-subtle)' }} />
          <span className="ec-meta-mono">EVIDENCE 05-E</span>
        </div>

        {/* Headline */}
        <div style={{ maxWidth: '860px', marginBottom: '40px' }}>
          <h2 className="ec-title-section" style={{ marginBottom: '18px' }}>
            Find a better path forward.{' '}
            <br />
            <span className="ec-editorial-accent" style={{ color: 'var(--ec-ultraviolet)' }}>
              Without trusting blind hallucinations.
            </span>
          </h2>
          <p className="ec-body-large">
            Gemma 4 evaluates bounded AST snippets and returns strict, schema-validated migration proposals with exact API delta analysis and minimal code disruption.
          </p>
        </div>

        {/* Migration Case Selector */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
          {MIGRATIONS.map((c, i) => (
            <button
              key={c.sourcePkg}
              onClick={() => setSelectedCaseIdx(i)}
              data-cursor="MIGRATE"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--ec-radius-sm)',
                backgroundColor: selectedCaseIdx === i ? 'rgba(143, 114, 255, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid',
                borderColor: selectedCaseIdx === i ? 'var(--ec-ultraviolet)' : 'var(--ec-border-light)',
                color: selectedCaseIdx === i ? 'var(--ec-text-primary)' : 'var(--ec-text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{c.sourcePkg}</span>
              <ArrowRight size={13} style={{ color: 'var(--ec-ultraviolet)' }} />
              <span style={{ color: 'var(--ec-emerald)' }}>{c.targetPkg}</span>
            </button>
          ))}
        </div>

        {/* Split-Screen Migration Bridge */}
        <div
          className="ec-card-glass ec-crosshair-box"
          style={{
            padding: '36px',
            borderRadius: 'var(--ec-radius-lg)',
            border: '1px solid var(--ec-border-light)'
          }}
        >
          {/* Header Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '20px',
            marginBottom: '28px',
            borderBottom: '1px solid var(--ec-border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} style={{ color: 'var(--ec-ultraviolet)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--ec-text-primary)' }}>
                GEMMA 4 MIGRATION TARGET: {currentCase.targetPkg}
              </span>
            </div>
            <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(81, 214, 160, 0.14)', color: 'var(--ec-emerald)' }}>
              VERIFICATION READY
            </span>
          </div>

          {/* Side by Side Code Comparison */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginBottom: '32px'
          }}>
            {/* Left: Legacy Dependency */}
            <div style={{
              backgroundColor: 'var(--ec-bg-terminal)',
              borderRadius: 'var(--ec-radius-md)',
              border: '1px solid rgba(255, 98, 78, 0.3)',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--ec-risk-red)', fontWeight: 700 }}>
                  ORIGINAL: {currentCase.sourcePkg} == {currentCase.sourceVer}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-text-dim)' }}>DEPRECATED</span>
              </div>
              <pre style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: '#E5E7EB',
                lineHeight: 1.6,
                overflowX: 'auto'
              }}>
                <code>{currentCase.sourceCode}</code>
              </pre>
            </div>

            {/* Right: Candidate Replacement */}
            <div style={{
              backgroundColor: 'var(--ec-bg-terminal)',
              borderRadius: 'var(--ec-radius-md)',
              border: '1px solid rgba(81, 214, 160, 0.4)',
              boxShadow: '0 0 20px rgba(81, 214, 160, 0.1)',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--ec-emerald)', fontWeight: 700 }}>
                  PROPOSAL: {currentCase.targetPkg} {currentCase.targetVer}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-emerald)' }}>RECOMMENDED</span>
              </div>
              <pre style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: '#E5E7EB',
                lineHeight: 1.6,
                overflowX: 'auto'
              }}>
                <code>{currentCase.targetCode}</code>
              </pre>
            </div>
          </div>

          {/* Reasoning & Detailed Differences */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '24px',
            backgroundColor: 'var(--ec-bg-card)',
            borderRadius: 'var(--ec-radius-md)',
            padding: '24px',
            border: '1px solid var(--ec-border-subtle)'
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ec-text-dim)', marginBottom: '8px' }}>
                MIGRATION RATIONALE
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ec-text-muted)', lineHeight: 1.6, marginBottom: '18px' }}>
                {currentCase.reason}
              </p>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ec-text-dim)', marginBottom: '8px' }}>
                EXPECTED API DELTAS
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontFamily: 'var(--font-body)', fontSize: '0.84rem', color: 'var(--ec-text-muted)', lineHeight: 1.6 }}>
                {currentCase.apiDifferences.map((diff, i) => (
                  <li key={i}>{diff}</li>
                ))}
              </ul>
            </div>

            <div style={{ borderLeft: '1px solid var(--ec-border-subtle)', paddingLeft: '24px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ec-text-dim)', marginBottom: '8px' }}>
                EMPIRICAL VERIFICATION SUITE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {currentCase.suggestedTests.map((t, idx) => (
                  <div key={idx} style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--ec-bg-terminal)',
                    border: '1px solid var(--ec-border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--ec-acid-lime)'
                  }}>
                    $ {t}
                  </div>
                ))}
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-text-dim)' }}>
                ASSUMPTIONS:
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.76rem', color: 'var(--ec-text-muted)', marginTop: '4px' }}>
                {currentCase.assumptions}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

