import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Code, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check,
  Hash,
  Clock,
  Layers,
  FileCode,
  FileCheck,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { getCapsule, getAgentVerifications, verifyCapsuleHash } from '../api/client';
import { AgentVerificationResponse, CapsuleResponse, CapsuleHashVerification } from '../api/types';
import { CodeBlock } from '../components/CodeBlock';
import { StatusBadge } from '../components/StatusBadge';

interface CapsulePageProps {
  scanId: string;
  onBack: () => void;
}

export const CapsulePage: React.FC<CapsulePageProps> = ({ scanId, onBack }) => {
  const [capsule, setCapsule] = useState<CapsuleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'ledger' | 'markdown' | 'json'>('report');
  const [copied, setCopied] = useState(false);
  const [hashCheck, setHashCheck] = useState<CapsuleHashVerification | null>(null);
  const [checking, setChecking] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const [agentReview, setAgentReview] = useState<AgentVerificationResponse | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!scanId) {
      setLoading(false);
      setError('No scan ID provided. Select a scan to inspect its Exit Capsule.');
      return;
    }
    setLoading(true);
    setError(null);
    getCapsule(scanId)
      .then((res) => {
        setCapsule(res);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load capsule:', err);
        setError(err.message || 'Failed to load capsule');
      })
      .finally(() => setLoading(false));
  }, [scanId]);

  const loadAgentReview = React.useCallback(async () => {
    if (!scanId) return;
    setReviewLoading(true);
    try {
      setAgentReview(await getAgentVerifications(scanId));
    } catch (err) {
      console.error('Failed to load agent verdicts:', err);
    } finally {
      setReviewLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    if (scanId) loadAgentReview();
  }, [scanId, loadAgentReview]);

  const data = capsule?.capsule_data;
  const ledger = data?.evidence_ledger || [];

  const dependencies = React.useMemo(() => {
    if (!data) return [];
    if (data.dependencies && Array.isArray(data.dependencies) && data.dependencies.length > 0) {
      return data.dependencies;
    }
    const recMap = new Map((data.ai_recommendations || []).map((r: any) => [r.package_name, r]));
    const verList = data.verification_checks || [];

    const allPkgs = new Set<string>();
    if (data.dependency_inventory && typeof data.dependency_inventory === 'object') {
      Object.values(data.dependency_inventory).forEach((list: any) => {
        if (Array.isArray(list)) list.forEach((p: string) => allPkgs.add(p));
      });
    }
    (data.risk_assessments || []).forEach((ra: any) => {
      if (ra?.package_name) allPkgs.add(ra.package_name);
    });

    const raMap = new Map((data.risk_assessments || []).map((ra: any) => [ra.package_name, ra]));

    return Array.from(allPkgs).map((pkgName) => {
      const ra = raMap.get(pkgName) as any;
      const rec = recMap.get(pkgName) as any;
      const vers = verList.filter((v: any) => v.package_name === pkgName);
      const passedCount = vers.filter((v: any) => v.status === 'PASS').length;
      return {
        package_name: pkgName,
        current_version: ra?.pinned_version || ra?.declared_version || '—',
        risk_score: ra?.overall_score ?? ra?.risk_score ?? 0,
        recommended_replacement: rec?.candidate_replacement || (rec?.proposal?.candidate_replacement) || 'None',
        classification: rec ? 'AI_RECOMMENDED' : (ra?.category === 'declared' ? 'OBSERVED' : 'UNVERIFIED'),
        verification_status: vers.length > 0 ? `${passedCount}/${vers.length} PASS` : ''
      };
    });
  }, [data]);

  const handleVerifyHash = async () => {
    try {
      setChecking(true);
      setHashError(null);
      setHashCheck(await verifyCapsuleHash(scanId));
    } catch (err: any) {
      setHashError(err.message || 'Hash verification failed.');
    } finally {
      setChecking(false);
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '48px auto', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Verifying cryptographic seal and rendering Exit Capsule...
      </div>
    );
  }

  if (error || !capsule) {
    return (
      <div style={{ maxWidth: '700px', margin: '48px auto', padding: '24px' }} className="workbench-panel">
        <h2 style={{ color: 'var(--status-fail-text)', marginBottom: '8px', fontSize: '1.1rem' }}>Capsule Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem' }}>{error || 'Unable to load capsule data.'}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={14} /> <span>Return to Workspace</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '18px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '6px 10px' }}>
            <ArrowLeft size={14} /> <span>Inventory</span>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-display)'
              }}>
                Exit Capsule Technical Report
              </h1>
              <span className="badge badge-executed">
                v{data?.capsule_version || 1} {data?.capsule_sha256 ? 'Sealed' : 'Unsealed'}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              Scan: {scanId} | Hash: {data?.capsule_sha256 ? `${data.capsule_sha256.slice(0, 16)}...` : 'not sealed'}
            </div>
          </div>
        </div>

        {/* Real Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => handleCopy(capsule.capsule_markdown)}
            style={{ fontSize: '0.78rem' }}
          >
            {copied ? <Check size={13} color="var(--status-pass-text)" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Report'}</span>
          </button>
          <a
            href={`/api/scans/${scanId}/capsule/download/md`}
            download="capsule.md"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', fontSize: '0.78rem' }}
          >
            <Download size={13} /> <span>Download Markdown</span>
          </a>
          <a
            href={`/api/scans/${scanId}/capsule/download/json`}
            download="capsule.json"
            className="btn btn-primary"
            style={{ textDecoration: 'none', fontSize: '0.78rem' }}
          >
            <Download size={13} /> <span>Download JSON</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setActiveTab('report')}
          style={{
            padding: '8px 14px',
            background: activeTab === 'report' ? 'var(--bg-surface)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'report' ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
            borderRadius: '5px 5px 0 0',
            fontWeight: activeTab === 'report' ? 600 : 500,
            fontSize: '0.82rem',
            color: activeTab === 'report' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Structured Audit Report
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          style={{
            padding: '8px 14px',
            background: activeTab === 'ledger' ? 'var(--bg-surface)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'ledger' ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
            borderRadius: '5px 5px 0 0',
            fontWeight: activeTab === 'ledger' ? 600 : 500,
            fontSize: '0.82rem',
            color: activeTab === 'ledger' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Evidence Ledger ({ledger.length})
        </button>
        <button
          onClick={() => setActiveTab('markdown')}
          style={{
            padding: '8px 14px',
            background: activeTab === 'markdown' ? 'var(--bg-surface)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'markdown' ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
            borderRadius: '5px 5px 0 0',
            fontWeight: activeTab === 'markdown' ? 600 : 500,
            fontSize: '0.82rem',
            color: activeTab === 'markdown' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Rendered Markdown
        </button>
        <button
          onClick={() => setActiveTab('json')}
          style={{
            padding: '8px 14px',
            background: activeTab === 'json' ? 'var(--bg-surface)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'json' ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
            borderRadius: '5px 5px 0 0',
            fontWeight: activeTab === 'json' ? 600 : 500,
            fontSize: '0.82rem',
            color: activeTab === 'json' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Raw JSON Schema
        </button>
      </div>

      {/* Tab 1: Structured Report */}
      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metadata Card */}
          <div className="workbench-panel" style={{ padding: '18px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Cryptographic Seal & Capsule Identity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>Target Repository:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>{data?.repository_path || 'Unknown repository'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>SHA-256 Digest:</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.74rem' }}>
                  {data?.capsule_sha256 || 'Not sealed'}
                </span>
                <button className="btn btn-secondary" onClick={handleVerifyHash} disabled={checking} style={{ marginTop: '6px', padding: '2px 8px', fontSize: '0.7rem' }}>
                  <ShieldCheck size={12} /> {checking ? 'Verifying...' : 'Verify seal chain'}
                </button>
                {hashCheck && (
                  <div style={{ marginTop: '4px', fontSize: '0.7rem', color: hashCheck.valid ? 'var(--status-pass-text)' : 'var(--status-fail-text)', fontWeight: 600 }}>
                    {hashCheck.valid ? `Verified v${hashCheck.version}` : `Mismatch in v${hashCheck.version}`}
                  </div>
                )}
                {hashError && <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--status-fail-text)' }}>{hashError}</div>}
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>Seal Timestamp:</span>
                <span>{data?.scan_timestamp ? new Date(Number(data.scan_timestamp) * (Number(data.scan_timestamp) < 10000000000 ? 1000 : 1)).toUTCString() : (data?.generated_at ? new Date(data.generated_at).toUTCString() : 'Not recorded')}</span>
              </div>
            </div>
          </div>

          {/* Slack Agent Verification (advisory) */}
          <div className="workbench-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                <MessageSquare size={13} /> Slack Agent Verification
                <span className="badge badge-ai" style={{ fontSize: '0.64rem', textTransform: 'none' }}>Advisory</span>
              </span>
              <button className="btn btn-secondary" onClick={loadAgentReview} disabled={reviewLoading} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                <RefreshCw size={12} /> {reviewLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {!agentReview?.requested && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Agents were not asked to review this capsule.
              </div>
            )}
            {agentReview?.requested && agentReview.verifications.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Agents are reviewing the seal; verdicts usually arrive within ~90 seconds. Press Refresh.
              </div>
            )}
            {agentReview?.verifications.map((verdict) => (
              <div key={verdict.message_id} style={{ borderTop: '1px solid var(--border-color)', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{verdict.agent_name}</span>
                  <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{verdict.role}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(verdict.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                  {verdict.body}
                </div>
              </div>
            ))}
          </div>

          {/* Migration Recommendations & Verification Table */}
          <div className="workbench-panel" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-sidebar)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Target Dependencies & Migration Evidence
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {dependencies.length} package records
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="workbench-table">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Current Pin</th>
                    <th>Risk Score</th>
                    <th>Gemma 4 Recommendation</th>
                    <th>Evidence State</th>
                    <th>Verification Suite</th>
                  </tr>
                </thead>
                <tbody>
                  {dependencies.map((dep: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <span className="font-mono" style={{ fontWeight: 600 }}>{dep.name || dep.package_name}</span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.78rem' }}>{dep.current_version || dep.declared_version || '—'}</span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontWeight: 600, color: dep.risk_score >= 70 ? 'var(--status-fail-text)' : 'var(--text-primary)' }}>
                          {dep.risk_score ?? '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="font-mono" style={{ fontWeight: 600, color: '#6D28D9' }}>
                            {dep.recommended_replacement || 'None'}
                          </span>
                          {dep.recommended_replacement && dep.recommended_replacement !== 'None' && (
                            <span className="badge badge-ai" style={{ fontSize: '0.66rem' }}>AI</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={dep.classification || 'UNVERIFIED'} />
                      </td>
                      <td>
                        <span style={{ fontSize: '0.76rem', color: dep.verification_status ? 'var(--status-pass-text)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {dep.verification_status || 'No checks run'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Evidence Ledger */}
      {activeTab === 'ledger' && (
        <div className="workbench-panel" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px',
            background: 'var(--bg-sidebar)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Deterministic Evidence Ledger
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {ledger.length} immutable records
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="workbench-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Classification</th>
                  <th>Claim / Hypothesis</th>
                  <th>Method & Tooling</th>
                  <th>Verification Outcome</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry: any, i: number) => (
                  <tr key={i}>
                    <td className="font-mono" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td>
                      <StatusBadge status={entry.classification || 'OBSERVED'} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {entry.claim || entry.item}
                      </div>
                      {(entry.evidence || entry.details) && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {typeof (entry.evidence || entry.details) === 'string' ? (entry.evidence || entry.details) : JSON.stringify(entry.evidence || entry.details)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {entry.method || 'AST Discovery / Sandbox'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={entry.outcome || 'PASS'} type="check" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Rendered Markdown */}
      {activeTab === 'markdown' && (
        <div className="workbench-panel" style={{ padding: '24px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            lineHeight: 1.65,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            background: 'var(--bg-app)',
            padding: '18px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            overflowX: 'auto'
          }}>
            {capsule.capsule_markdown}
          </div>
        </div>
      )}

      {/* Tab 4: Raw JSON Schema */}
      {activeTab === 'json' && (
        <div className="workbench-panel" style={{ padding: '16px' }}>
          <CodeBlock 
            code={JSON.stringify(data, null, 2)} 
            language="json" 
            title={`capsule_${scanId}.json`}
            showLineNumbers={true}
          />
        </div>
      )}
    </div>
  );
};

export default CapsulePage;
