import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, 
  ExternalLink, 
  ShieldCheck, 
  Play, 
  CheckCircle2,
  XCircle, 
  AlertTriangle, 
  Code, 
  FileText, 
  ArrowRight, 
  Ban, 
  Clock, 
  Sparkles,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileCode2,
  AlertCircle
} from 'lucide-react';
import { getDependencyDetails, verifyDependency, recordApproval, createImplementationPlan, getCapsule } from '../api/client';
import { DependencyDetail, VerificationReport } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { RiskGauge } from '../components/RiskGauge';
import { CodeBlock } from '../components/CodeBlock';

interface DependencyDetailsPageProps {
  scanId: string;
  packageName: string;
  onBack: () => void;
  onOpenImplementationPlan: (pkgName: string) => void;
}

export const DependencyDetailsPage: React.FC<DependencyDetailsPageProps> = ({
  scanId,
  packageName,
  onBack,
  onOpenImplementationPlan
}) => {
  const [detail, setDetail] = useState<DependencyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [candidatePackage, setCandidatePackage] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [verError, setVerError] = useState<string | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  // Approval state
  const [approvalDecision, setApprovalDecision] = useState<'APPROVED' | 'REJECTED' | 'PENDING'>('PENDING');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [approvalMsg, setApprovalMsg] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await getDependencyDetails(scanId, packageName);
      setDetail(data);
      if (data.ai_recommendation?.candidate_replacement) {
        setCandidatePackage(data.ai_recommendation.candidate_replacement);
      } else if (!candidatePackage) {
        setCandidatePackage('');
      }
      if (data.approval) {
        setApprovalDecision(data.approval.decision);
        setApprovalNotes(data.approval.notes || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dependency details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [scanId, packageName]);

  const handleRunVerification = async () => {
    if (!candidatePackage.trim()) {
      setVerError('Please specify a candidate replacement package name.');
      return;
    }
    try {
      setVerifying(true);
      setVerError(null);
      const rep = await verifyDependency(scanId, packageName, candidatePackage.trim(), false);
      setVerificationReport(rep);
      fetchDetails();
    } catch (err: any) {
      setVerError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const submitApproval = async (decision: 'APPROVED' | 'REJECTED', notes?: string) => {
    const capsule = await getCapsule(scanId);
    if (!capsule.capsule_sha256) throw new Error('Capsule is not sealed yet. Re-open the capsule and try again.');
    return recordApproval(scanId, packageName, decision, notes, capsule.capsule_sha256, capsule.capsule_version || 1);
  };

  const handleApproval = async (decision: 'APPROVED' | 'REJECTED') => {
    try {
      setApproving(true);
      await submitApproval(decision, approvalNotes);
      setApprovalDecision(decision);
      setApprovalMsg(`Decision persisted: ${decision}`);
      setTimeout(() => setApprovalMsg(null), 3000);
      fetchDetails();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleGeneratePlan = async () => {
    let cand = (candidatePackage || detail?.ai_recommendation?.candidate_replacement || '').trim();

    if (!cand || cand === packageName) {
      const entered = window.prompt(
        `Please specify the candidate replacement package for '${packageName}' (e.g. an alternative library or upgraded release):`,
        ''
      );
      if (!entered || !entered.trim()) {
        return;
      }
      cand = entered.trim();
      setCandidatePackage(cand);
    }

    // Implementation plans require developer approval in the Exit Capsule governance model
    if (approvalDecision !== 'APPROVED') {
      const confirmApprove = window.confirm(
        `Implementation plans require explicit developer approval for migration safety.\n\nWould you like to approve migrating '${packageName}' to '${cand}' and generate the implementation plan now?`
      );
      if (!confirmApprove) {
        const section5 = document.getElementById('review-approval-section');
        if (section5) section5.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      try {
        setApproving(true);
        await submitApproval('APPROVED', approvalNotes || `Approved migration to ${cand} via Plan Generator`);
        setApprovalDecision('APPROVED');
        setApprovalMsg('Decision persisted: APPROVED');
      } catch (appErr: any) {
        alert(`Approval error: ${appErr.message}`);
        return;
      } finally {
        setApproving(false);
      }
    }

    try {
      await createImplementationPlan(scanId, packageName, cand);
      onOpenImplementationPlan(packageName);
    } catch (err: any) {
      alert(`Plan creation error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '48px auto', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Loading dependency telemetry and AST call-site map...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ maxWidth: '700px', margin: '48px auto', padding: '24px' }} className="workbench-panel">
        <h2 style={{ color: 'var(--status-fail-text)', marginBottom: '8px', fontSize: '1.1rem' }}>Package Analysis Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem' }}>{error || 'Not found.'}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={14} /> <span>Return to Inventory</span>
        </button>
      </div>
    );
  }

  const aiRec = detail.ai_recommendation;
  const proposal = aiRec?.proposal;
  const verChecks = detail.verification_checks || [];
  const astLocations = detail.ast_usages || [];
  const pypi = detail.pypi_metadata;
  const risk = detail.risk_breakdown;

  return (
    <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '18px',
        marginBottom: '24px',
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
                fontFamily: 'var(--font-mono)'
              }}>
                {packageName}
              </h1>
              <span className="badge badge-low" style={{ textTransform: 'none' }}>
                {detail.declared_version || 'Undeclared'}
              </span>
              <RiskGauge score={detail.risk_score} level={risk?.level || 'LOW'} />
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Category: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{detail.category}</span> | {astLocations.length} AST call site{astLocations.length === 1 ? '' : 's'} identified
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={approvalDecision === 'APPROVED' ? "btn btn-primary" : "btn btn-secondary"}
            onClick={handleGeneratePlan}
            title={approvalDecision === 'APPROVED' ? "View or regenerate implementation plan" : "Requires developer approval before generating plan"}
          >
            <FileText size={14} /> 
            <span>{approvalDecision === 'APPROVED' ? "Implementation Plan" : "Approve & Generate Plan"}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Section 1: Package Overview & Constraints */}
        <div className="workbench-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            1. Package Telemetry & Constraints
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>Declared Pin:</span>
              <span className="font-mono" style={{ fontWeight: 600 }}>{detail.declared_version || 'None (Observed AST import)'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>Latest PyPI Version:</span>
              <span className="font-mono" style={{ fontWeight: 600 }}>{pypi?.latest_version || 'Unavailable'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>License:</span>
              <span>{pypi?.license || 'Proprietary / Unknown'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>PyPI Status:</span>
              <span style={{ color: pypi?.is_yanked ? 'var(--status-fail-text)' : 'var(--status-pass-text)', fontWeight: 600 }}>
                {pypi?.is_yanked ? 'Yanked release' : 'Active repository'}
              </span>
            </div>
          </div>

          {pypi?.yanked_reason && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: 'var(--status-fail-bg)',
              border: '1px solid var(--status-fail-border)',
              borderRadius: '4px',
              color: 'var(--status-fail-text)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={15} />
              <span>Yank Notice: {pypi.yanked_reason}</span>
            </div>
          )}
        </div>

        {/* Section 2: Source Code AST Usage Map */}
        <div className="workbench-panel" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px',
            background: 'var(--bg-sidebar)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={15} color="var(--text-secondary)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                2. Source Usage (AST Analysis)
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {astLocations.length} symbol site{astLocations.length === 1 ? '' : 's'} across repository
            </span>
          </div>

          {astLocations.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.82rem', fontStyle: 'italic' }}>
              No AST call-sites or direct imports detected in scanned Python source files.
            </div>
          ) : (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {astLocations.map((loc: any, idx: number) => (
                <div key={idx} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '5px',
                  background: 'var(--bg-app)',
                  padding: '12px 16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileCode2 size={14} color="var(--accent-sage-dark)" />
                      <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {loc.file_path}:{loc.line_number}
                      </span>
                      {loc.enclosing_scope && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          in <code>{loc.enclosing_scope}()</code>
                        </span>
                      )}
                    </div>
                    <span className="badge badge-observed">Observed AST</span>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Imported symbol: <code className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{loc.referenced_symbol || loc.imported_module || packageName}</code>
                    {loc.import_alias && <span> (aliased as: <code>{loc.import_alias}</code>)</span>}
                  </div>

                  {loc.code_snippet && (
                    <CodeBlock 
                      code={loc.code_snippet} 
                      language="python" 
                      title={`${loc.file_path} (Line ${loc.line_number})`}
                      showLineNumbers={true}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: AI Migration Proposal (Gemma 4) */}
        <div className="workbench-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#6D28D9" />
              <h3 style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                3. AI Proposal (Gemma 4 Migration Hypothesis)
              </h3>
            </div>
            <span className="badge badge-ai">Hypothesis — Requires Verification</span>
          </div>

          {aiRec ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '12px 16px',
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Proposed Drop-In Replacement:
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {aiRec.candidate_replacement}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field font-mono"
                    style={{ width: '160px', padding: '4px 8px', fontSize: '0.78rem' }}
                    value={candidatePackage}
                    onChange={(e) => setCandidatePackage(e.target.value)}
                    placeholder="Candidate package"
                  />
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                    onClick={handleRunVerification}
                    disabled={verifying}
                  >
                    <Play size={12} />
                    <span>{verifying ? 'Evaluating...' : 'Verify Candidate'}</span>
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>Migration Rationale:</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.55 }}>
                  {proposal?.risk_summary || proposal?.reasons?.join('. ') || 'Direct drop-in replacement candidate with active maintenance.'}
                </p>
              </div>

              {proposal?.proposed_migration_steps && proposal.proposed_migration_steps.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>Recommended Migration Steps:</span>
                  <ol style={{ paddingLeft: '18px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.6 }}>
                    {proposal.proposed_migration_steps.map((st: string, i: number) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                </div>
              )}

              {proposal?.potential_compatibility_problems && proposal.potential_compatibility_problems.length > 0 && (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--status-warn-bg)',
                  border: '1px solid var(--status-warn-border)',
                  borderRadius: '4px',
                  color: 'var(--status-warn-text)',
                  fontSize: '0.78rem'
                }}>
                  <strong>Potential API Divergences:</strong> {proposal.potential_compatibility_problems.join('; ')}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '12px 16px',
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Specify Candidate Replacement:
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Enter an alternative package name to evaluate or migrate:
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field font-mono"
                    style={{ width: '200px', padding: '5px 10px', fontSize: '0.8rem' }}
                    value={candidatePackage}
                    onChange={(e) => setCandidatePackage(e.target.value)}
                    placeholder="e.g. alternative-package"
                  />
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                    onClick={handleRunVerification}
                    disabled={verifying}
                  >
                    <Play size={12} />
                    <span>{verifying ? 'Evaluating...' : 'Verify Candidate'}</span>
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                💡 Tip: Type a replacement candidate above to execute the 10-point verification engine and generate an evidence-backed migration plan.
              </p>
            </div>
          )}
        </div>

        {/* Section 4: 10-Point Deterministic Verification Evidence */}
        <div className="workbench-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--accent-sage-dark)" />
              <h3 style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                4. Verification Evidence (10-Point Compatibility Suite)
              </h3>
            </div>
            {verChecks.length > 0 && (
              <span className="badge badge-pass">
                {verChecks.filter((c: any) => c.status === 'PASS').length} / {verChecks.length} Checks Passed
              </span>
            )}
          </div>

          {verError && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--status-fail-bg)',
              border: '1px solid var(--status-fail-border)',
              borderRadius: '4px',
              color: 'var(--status-fail-text)',
              fontSize: '0.8rem',
              marginBottom: '14px'
            }}>
              {verError}
            </div>
          )}

          {verChecks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {verChecks.map((chk: any) => {
                const isExpanded = expandedCheck === chk.check_name;
                return (
                  <div 
                    key={chk.check_name}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '5px',
                      background: 'var(--bg-app)',
                      overflow: 'hidden'
                    }}
                  >
                    <div 
                      onClick={() => setExpandedCheck(isExpanded ? null : chk.check_name)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                        <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {chk.check_name}
                        </span>
                      </div>
                      <StatusBadge status={chk.status} type="check" />
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid var(--border-color)',
                        background: 'var(--bg-surface)',
                        fontSize: '0.78rem'
                      }}>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Evidence output:
                        </div>
                        <div className="terminal-block" style={{ padding: '10px' }}>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {chk.evidence || chk.error_details || 'Check passed with zero errors.'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontStyle: 'italic' }}>
              Verification suite has not yet run for this dependency. Enter candidate replacement and click "Verify Candidate" to evaluate.
            </div>
          )}
        </div>

        {/* Section 5: Review & Approval Decision Box */}
        <div id="review-approval-section" className="workbench-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              5. Review Migration Proposal
            </h3>
            <StatusBadge status={approvalDecision} type="approval" />
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '16px' }}>
            Record an engineering decision for replacing <strong>{packageName}</strong> with <strong>{candidatePackage || 'unspecified'}</strong>.
            Approval commits the proposal to the persistent capsule and authorizes implementation planning.
          </p>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Engineering Reviewer Notes
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Record review notes, verification findings, or remaining acceptance conditions..."
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
          </div>

          {approvalMsg && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--status-pass-bg)',
              border: '1px solid var(--status-pass-border)',
              borderRadius: '4px',
              color: 'var(--status-pass-text)',
              fontSize: '0.78rem',
              marginBottom: '12px'
            }}>
              {approvalMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Approval does not modify source code or bypass post-implementation verification.
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {approvalDecision === 'APPROVED' ? (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleApproval('REJECTED')}
                    disabled={approving}
                  >
                    <Ban size={13} />
                    <span>Revoke / Reject</span>
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleGeneratePlan}
                  >
                    <FileText size={13} />
                    <span>Generate / Open Implementation Plan</span>
                    <ArrowRight size={13} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleApproval('REJECTED')}
                    disabled={approving}
                  >
                    <Ban size={13} />
                    <span>Reject Proposal</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleApproval('APPROVED')}
                    disabled={approving}
                  >
                    <CheckCircle2 size={13} />
                    <span>Approve Proposal</span>
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleGeneratePlan}
                    disabled={approving}
                  >
                    <CheckCircle2 size={13} />
                    <span>Approve & Generate Plan</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DependencyDetailsPage;
