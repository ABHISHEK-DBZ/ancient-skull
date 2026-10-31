import React from 'react';
import { ShieldCheck, Lock, Terminal, EyeOff, Server, KeyRound, Cpu, FileCheck } from 'lucide-react';

const SECURITY_PILLARS = [
  {
    icon: Terminal,
    title: 'Local Static AST Scanning',
    summary: 'Repository files are parsed purely using the Python standard library ast module. Your source code is never executed during scanning or inventory discovery.'
  },
  {
    icon: EyeOff,
    title: 'Bounded AI Context Snippets',
    summary: 'When AI planning is enabled, Exit Capsule transmits only bounded syntax snippets (line, symbol, and call expression) needed for recommendation — never your full codebase.'
  },
  {
    icon: Server,
    title: 'Offline / Ollama Support',
    summary: 'For strictly air-gapped environments, configure GEMMA_API_BASE_URL to a local Ollama instance (e.g. gemma4:latest). Zero cloud data transit.'
  },
  {
    icon: KeyRound,
    title: 'Ephemeral Sandbox Isolation',
    summary: 'Package installation and test verification occur inside ephemeral virtual environments created in temp_workspaces/. Subprocesses are sandboxed with timeouts.'
  },
  {
    icon: Lock,
    title: 'Secret Hygiene & Token Redaction',
    summary: 'API keys and GitHub OAuth tokens are stripped from subprocess environments and redacted from database records, generated markdown, and JSON capsules.'
  },
  {
    icon: FileCheck,
    title: 'Optional AI by Design',
    summary: 'No API key required. Scanning, deterministic risk scoring, package discovery, test execution, and capsule generation are 100% functional without AI.'
  }
];

export const SecurityChapter: React.FC = () => {
  return (
    <section
      id="security"
      className="ec-chapter ec-paper-section"
      style={{
        position: 'relative'
      }}
    >
      <div className="ec-container">
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 'var(--ec-radius-sm)',
            backgroundColor: 'rgba(18, 19, 22, 0.08)',
            color: 'var(--ec-paper-text)',
            border: '1px solid var(--ec-paper-border)'
          }}>
            CHAPTER 10 // TRUST BOUNDARIES &amp; SECURITY
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-paper-border)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--ec-paper-text-muted)' }}>
            SPECIFICATION 10-J
          </span>
        </div>

        {/* Section Headline */}
        <div style={{ maxWidth: '880px', marginBottom: '48px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 5vw, 4rem)',
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
            color: 'var(--ec-paper-text)',
            marginBottom: '20px'
          }}>
            Built for{' '}
            <span className="ec-editorial-accent" style={{ color: '#2B44E6' }}>
              careful engineering.
            </span>
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(1.05rem, 1.4vw, 1.25rem)',
            color: 'var(--ec-paper-text-muted)',
            lineHeight: 1.6
          }}>
            We believe trust is earned through explicit architectural boundaries, not vague marketing claims. Here is exactly how your code, metadata, and credentials are handled.
          </p>
        </div>

        {/* 6 Grid Security Pillars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {SECURITY_PILLARS.map((p, idx) => {
            const IconComp = p.icon;
            return (
              <div
                key={p.title}
                className="ec-paper-card"
                style={{
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(43, 68, 230, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2B44E6',
                    marginBottom: '18px'
                  }}>
                    <IconComp size={18} />
                  </div>

                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.18rem',
                    fontWeight: 700,
                    color: 'var(--ec-paper-text)',
                    marginBottom: '10px'
                  }}>
                    {p.title}
                  </h3>

                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.88rem',
                    color: 'var(--ec-paper-text-muted)',
                    lineHeight: 1.6
                  }}>
                    {p.summary}
                  </p>
                </div>

                <div style={{
                  marginTop: '20px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--ec-paper-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  color: 'var(--ec-paper-text-muted)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>BOUNDARY 0{idx + 1}</span>
                  <span style={{ color: '#166534', fontWeight: 600 }}>ENFORCED</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

