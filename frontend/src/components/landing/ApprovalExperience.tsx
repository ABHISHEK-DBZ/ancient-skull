import React, { useState } from 'react';
import { UserCheck, Check, X, Clock, AlertTriangle, ShieldCheck, ArrowRight, MessageSquare } from 'lucide-react';

interface ApprovalExperienceProps {
  onOpenWorkspace: () => void;
}

export const ApprovalExperience: React.FC<ApprovalExperienceProps> = ({ onOpenWorkspace }) => {
  const [decisionState, setDecisionState] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [devNotes, setDevNotes] = useState<string>('Verified drop-in compatibility with tests. Approved for production rollout.');
  const [activeTab, setActiveTab] = useState<'reasoning' | 'deltas' | 'steps'>('reasoning');

  return (
    <section
      id="approval"
      className="ec-chapter"
      style={{
        backgroundColor: 'var(--ec-bg-secondary)',
        position: 'relative'
      }}
    >
      <div className="ec-container">
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(81, 214, 160, 0.12)', color: 'var(--ec-emerald)', border: '1px solid rgba(81, 214, 160, 0.25)' }}>
            CHAPTER 07 // DEVELOPER APPROVAL GATE
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-border-subtle)' }} />
          <span className="ec-meta-mono">EVIDENCE 07-G</span>
        </div>

        {/* Headline */}
        <div style={{ maxWidth: '860px', marginBottom: '40px' }}>
          <h2 className="ec-title-section" style={{ marginBottom: '18px' }}>
            Your code.{' '}
            <span className="ec-editorial-accent" style={{ color: 'var(--ec-emerald)' }}>
              Your decision.
            </span>
          </h2>
          <p className="ec-body-large">
            No autonomous agent ever pushes code or modifies requirements without explicit human approval. The developer examines empirical test results, writes review notes, and locks the decision.
          </p>
        </div>

        {/* Interactive Approval Demo Card */}
        <div
          className="ec-card-glass ec-crosshair-box"
          style={{
            maxWidth: '920px',
            margin: '0 auto',
            borderRadius: 'var(--ec-radius-lg)',
            border: '1.5px solid',
            borderColor: decisionState === 'approved' 
              ? 'var(--ec-emerald)' 
              : decisionState === 'rejected' 
                ? 'var(--ec-risk-red)' 
                : 'var(--ec-border-light)',
            boxShadow: decisionState === 'approved' 
              ? '0 0 35px var(--ec-emerald-glow)' 
              : decisionState === 'rejected' 
                ? '0 0 35px var(--ec-risk-red-glow)' 
                : 'var(--ec-shadow-cinematic)',
            padding: '36px',
            backgroundColor: 'var(--ec-bg-secondary)',
            transition: 'all 0.3s ease'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            paddingBottom: '20px',
            marginBottom: '24px',
            borderBottom: '1px solid var(--ec-border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ec-risk-red)' }}>
                requests
              </span>
              <ArrowRight size={18} style={{ color: 'var(--ec-text-dim)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ec-emerald)' }}>
                httpx
              </span>
            </div>

            {/* State Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(255, 98, 78, 0.14)', color: 'var(--ec-risk-red)' }}>
                RISK: HIGH (78/100)
              </span>
              <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(81, 214, 160, 0.14)', color: 'var(--ec-emerald)' }}>
                VERIFIED: 10/10 PASS
              </span>
            </div>
          </div>

          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {(['reasoning', 'deltas', 'steps'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                data-cursor="TAB"
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--ec-radius-sm)',
                  backgroundColor: activeTab === tab ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: '1px solid',
                  borderColor: activeTab === tab ? 'var(--ec-border-light)' : 'transparent',
                  color: activeTab === tab ? 'var(--ec-text-primary)' : 'var(--ec-text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.74rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                {tab === 'reasoning' ? 'AI Reasoning' : tab === 'deltas' ? 'API Differences' : 'Migration Steps'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{
            backgroundColor: 'var(--ec-bg-card)',
            padding: '20px',
            borderRadius: 'var(--ec-radius-md)',
            border: '1px solid var(--ec-border-subtle)',
            marginBottom: '28px',
            fontFamily: 'var(--font-body)',
            fontSize: '0.88rem',
            color: 'var(--ec-text-muted)',
            lineHeight: 1.6
          }}>
            {activeTab === 'reasoning' && (
              <div>
                <strong style={{ color: 'var(--ec-text-primary)' }}>Architecture Fit:</strong> requests has reached maintenance stasis with no native HTTP/2 or async support. httpx is maintained by Encode, is fully typed, and shares requests syntax for simple GET/POST calls.
              </div>
            )}
            {activeTab === 'deltas' && (
              <div>
                <strong style={{ color: 'var(--ec-text-primary)' }}>Breaking Surface:</strong> Timeouts must be explicitly passed or configured at client instantiation. Status error handling requires catching <code>httpx.HTTPStatusError</code>.
              </div>
            )}
            {activeTab === 'steps' && (
              <div>
                <strong style={{ color: 'var(--ec-text-primary)' }}>15-Step Roadmap:</strong> 1. Install httpx in sandbox. 2. Replace callsites in client.py. 3. Update tests. 4. Verify pytest pass. 5. Generate unified git diff.
              </div>
            )}
          </div>

          {/* Developer Review Notes Field */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ec-text-dim)', marginBottom: '8px' }}>
              <MessageSquare size={13} />
              DEVELOPER AUDIT NOTES &amp; RATIONALE:
            </label>
            <input
              type="text"
              value={devNotes}
              onChange={e => setDevNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--ec-radius-sm)',
                backgroundColor: 'var(--ec-bg-secondary)',
                border: '1px solid var(--ec-border-light)',
                color: 'var(--ec-text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Human Decision Buttons */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            paddingTop: '20px',
            borderTop: '1px solid var(--ec-border-subtle)'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDecisionState('approved')}
                data-cursor="APPROVE"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: 'var(--ec-radius-sm)',
                  backgroundColor: decisionState === 'approved' ? 'var(--ec-emerald)' : 'rgba(81, 214, 160, 0.1)',
                  border: '1px solid var(--ec-emerald)',
                  color: decisionState === 'approved' ? 'var(--ec-text-inverse)' : 'var(--ec-emerald)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Check size={16} />
                <span>Approve Migration</span>
              </button>

              <button
                onClick={() => setDecisionState('rejected')}
                data-cursor="REJECT"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: 'var(--ec-radius-sm)',
                  backgroundColor: decisionState === 'rejected' ? 'var(--ec-risk-red)' : 'rgba(255, 98, 78, 0.1)',
                  border: '1px solid var(--ec-risk-red)',
                  color: decisionState === 'rejected' ? 'var(--ec-text-inverse)' : 'var(--ec-risk-red)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <X size={16} />
                <span>Reject</span>
              </button>
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--ec-text-dim)'
            }}>
              INTERACTIVE DEMO // REAL WORKBENCH LOCKS PER-SCAN
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

