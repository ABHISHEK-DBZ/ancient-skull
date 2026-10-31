import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  RotateCcw,
  ListChecks,
  Code2,
  Terminal,
  BookOpen,
  Sparkles,
  Layers,
  AlertTriangle,
  FileCode2,
  CheckCircle2
} from 'lucide-react';
import { CodeBlock } from '../components/CodeBlock';
import { StatusBadge } from '../components/StatusBadge';
import { getImplementationPlan } from '../api/client';

interface ImplementationPlannerPageProps {
  scanId: string;
  packageName: string;
  onBack: () => void;
  onNavigatePostVerify: () => void;
}

export const ImplementationPlannerPage: React.FC<ImplementationPlannerPageProps> = ({
  scanId,
  packageName,
  onBack,
  onNavigatePostVerify
}) => {
  const [planData, setPlanData] = useState<any>(null);
  const [planMarkdown, setPlanMarkdown] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modes: 'document' | 'manual' | 'agent' | 'markdown'
  const [mode, setMode] = useState<'document' | 'manual' | 'agent' | 'markdown'>('document');
  
  // Interactive checklist tracking
  const [checklistState, setChecklistState] = useState<Record<number, boolean>>({});
  const [stepNotes, setStepNotes] = useState<Record<number, string>>({});
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedChecklist, setCopiedChecklist] = useState(false);

  useEffect(() => {
    setLoading(true);
    getImplementationPlan(scanId, packageName)
      .then((data) => {
        setPlanData(data.plan_data);
        setPlanMarkdown(data.plan_markdown);
        setAiPrompt(data.ai_agent_prompt);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scanId, packageName]);

  const toggleCheck = (idx: number) => {
    setChecklistState((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2200);
  };

  const handleCopyChecklist = () => {
    const lines = (planData?.verification_checklist || []).map((c: any, i: number) => 
      `[${checklistState[i] ? 'X' : ' '}] ${c.item} (${c.classification})`
    ).join('\n');
    navigator.clipboard.writeText(lines);
    setCopiedChecklist(true);
    setTimeout(() => setCopiedChecklist(false), 2200);
  };

  const handleDownloadPrompt = () => {
    const blob = new Blob([aiPrompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration_prompt_${packageName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '48px auto', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Synthesizing verified implementation document...
      </div>
    );
  }

  if (error || !planData) {
    return (
      <div style={{ maxWidth: '700px', margin: '48px auto', padding: '24px' }} className="workbench-panel">
        <h2 style={{ color: 'var(--status-fail-text)', marginBottom: '8px', fontSize: '1.1rem' }}>Plan Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={14} /> <span>Return to Dependency Detail</span>
        </button>
      </div>
    );
  }

  const checklistItems = planData.verification_checklist || [];
  const completedCount = Object.values(checklistState).filter(Boolean).length;
  const progressPercent = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px 24px' }}>
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
            <ArrowLeft size={14} /> <span>Back</span>
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
                Implementation Specification
              </h1>
              <span className="badge badge-executed">
                {packageName} &rarr; {planData.candidate_replacement || planData.candidate_package || 'Candidate'}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              Scan: {scanId} | Acceptance Criteria Defined
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={onNavigatePostVerify}>
            <ShieldCheck size={14} /> <span>Post-Implementation Verification</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Mode Navigation Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setMode('document')}
            style={{
              padding: '8px 14px',
              background: mode === 'document' ? 'var(--bg-surface)' : 'transparent',
              border: '1px solid',
              borderColor: mode === 'document' ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
              borderRadius: '5px 5px 0 0',
              fontWeight: mode === 'document' ? 600 : 500,
              fontSize: '0.82rem',
              color: mode === 'document' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            Engineering Plan
          </button>
          <button
            onClick={() => setMode('agent')}
            style={{
              padding: '8px 14px',
              background: mode === 'agent' ? 'var(--bg-surface)' : 'transparent',
              border: '1px solid',
              borderColor: mode === 'agent' ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
              borderRadius: '5px 5px 0 0',
              fontWeight: mode === 'agent' ? 600 : 500,
              fontSize: '0.82rem',
              color: mode === 'agent' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            AI Agent Prompt Export
          </button>
          <button
            onClick={() => setMode('manual')}
            style={{
              padding: '8px 14px',
              background: mode === 'manual' ? 'var(--bg-surface)' : 'transparent',
              border: '1px solid',
              borderColor: mode === 'manual' ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
              borderRadius: '5px 5px 0 0',
              fontWeight: mode === 'manual' ? 600 : 500,
              fontSize: '0.82rem',
              color: mode === 'manual' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            Manual Mode Checklist ({completedCount}/{checklistItems.length})
          </button>
          <button
            onClick={() => setMode('markdown')}
            style={{
              padding: '8px 14px',
              background: mode === 'markdown' ? 'var(--bg-surface)' : 'transparent',
              border: '1px solid',
              borderColor: mode === 'markdown' ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
              borderRadius: '5px 5px 0 0',
              fontWeight: mode === 'markdown' ? 600 : 500,
              fontSize: '0.82rem',
              color: mode === 'markdown' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            Raw Plan Markdown
          </button>
        </div>

        {mode === 'agent' && (
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '6px' }}>
            <button className="btn btn-secondary" onClick={handleCopyPrompt} style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
              {copiedPrompt ? <Check size={12} color="var(--status-pass-text)" /> : <Copy size={12} />}
              <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadPrompt} style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
              <Download size={12} />
              <span>Download .md</span>
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '6px' }}>
            <button className="btn btn-secondary" onClick={handleCopyChecklist} style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
              {copiedChecklist ? <Check size={12} color="var(--status-pass-text)" /> : <Copy size={12} />}
              <span>{copiedChecklist ? 'Copied' : 'Copy Checklist'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mode 1: Document View */}
      {mode === 'document' && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Narrow Plan Outline Sidebar */}
          <div className="workbench-panel" style={{ padding: '14px', position: 'sticky', top: '70px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Plan Sections
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
              <a href="#section-objective" style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '4px 6px', borderRadius: '4px' }}>
                1. Objective & Scope
              </a>
              <a href="#section-files" style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '4px 6px', borderRadius: '4px' }}>
                2. Files to Modify
              </a>
              <a href="#section-steps" style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '4px 6px', borderRadius: '4px' }}>
                3. Ordered Migration Steps
              </a>
              <a href="#section-tests" style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '4px 6px', borderRadius: '4px' }}>
                4. Test Commands
              </a>
              <a href="#section-acceptance" style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '4px 6px', borderRadius: '4px' }}>
                5. Acceptance Criteria
              </a>
              <a href="#section-rollback" style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '4px 6px', borderRadius: '4px' }}>
                6. Rollback Fallback
              </a>
            </nav>
          </div>

          {/* Central Implementation Document */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Objective & Scope */}
            <div id="section-objective" className="workbench-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                1. Objective & Scope
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {planData.objective || `Safely migrate ${packageName} to verified replacement ${planData.candidate_replacement} while maintaining full test regression parity.`}
              </p>
            </div>

            {/* Files to Modify */}
            <div id="section-files" className="workbench-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                2. Files to Modify
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="workbench-table">
                  <thead>
                    <tr>
                      <th>File Path</th>
                      <th>Expected Modification</th>
                      <th>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (planData.files_to_modify && planData.files_to_modify.length > 0)
                        ? planData.files_to_modify
                        : (planData.files_likely_to_change && planData.files_likely_to_change.length > 0)
                          ? planData.files_likely_to_change.map((f: any) => typeof f === 'string' ? { path: f, reason: `Update ${packageName} imports and caller methods`, classification: 'Observed AST' } : f)
                          : [{ path: 'requirements.txt / pyproject.toml', reason: `Remove ${packageName} and declare replacement candidate`, classification: 'Manifest' }]
                    ).map((f: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <span className="font-mono" style={{ fontWeight: 600 }}>{f.path}</span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {f.reason || 'Update imports and caller arguments'}
                        </td>
                        <td>
                          <span className="badge badge-observed">{f.classification || 'Observed AST'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ordered Migration Steps */}
            <div id="section-steps" className="workbench-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                3. Ordered Migration Steps
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(
                  (planData.migration_steps && planData.migration_steps.length > 0)
                    ? planData.migration_steps
                    : (planData.ordered_implementation_steps && planData.ordered_implementation_steps.length > 0)
                      ? planData.ordered_implementation_steps.map((s: any) => typeof s === 'string' ? { title: s, step: s, details: s } : s)
                      : [
                          { title: `Create feature branch migrate/${packageName}`, details: 'Isolate changes on a dedicated git branch before modifying code.' },
                          { title: 'Update dependency declarations in requirements.txt', details: `Replace ${packageName} with verified candidate package.` },
                          { title: 'Update module imports and call sites', details: 'Refactor import statements to match the replacement API.' },
                          { title: 'Run isolated test verification', details: 'Execute local pytest suite to ensure zero regressions.' }
                        ]
                ).map((step: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 14px',
                    background: 'var(--bg-app)',
                    borderRadius: '5px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <span className="font-mono" style={{
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      minWidth: '22px'
                    }}>
                      {i + 1}.
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {step.title || step.step || step}
                      </div>
                      {step.details && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                          {step.details}
                        </div>
                      )}
                    </div>
                    <span className="badge badge-ai" style={{ fontSize: '0.68rem' }}>
                      Verified Step
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Commands */}
            <div id="section-tests" className="workbench-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                4. Test Commands
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(planData.test_commands || ['python -m pytest tests/ -v']).map((cmd: string, i: number) => (
                  <div key={i} className="terminal-block" style={{ padding: '10px 14px' }}>
                    <code>$ {cmd}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div id="section-acceptance" className="workbench-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                5. Acceptance Criteria
              </h2>
              <ul style={{ paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {(planData.acceptance_criteria || [
                  'All unit tests pass with zero regressions.',
                  'No unhandled deprecation warnings.',
                  'Package pin updated in requirements.txt or pyproject.toml.'
                ]).map((crit: string, i: number) => (
                  <li key={i}>{crit}</li>
                ))}
              </ul>
            </div>

            {/* Rollback Strategy */}
            <div id="section-rollback" className="workbench-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <RotateCcw size={15} color="var(--status-fail-text)" />
                <h2 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  6. Rollback Fallback Plan
                </h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '10px' }}>
                If post-implementation tests fail or unexpected regressions occur, immediately execute:
              </p>
              <div className="terminal-block" style={{ padding: '10px 14px' }}>
                <code>{planData.rollback_strategy?.command || 'git restore . && pip install -r requirements.txt'}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: AI Agent Prompt View */}
      {mode === 'agent' && (
        <div className="workbench-panel" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Coding Agent Execution Prompt
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Pass this structured prompt directly into your AI coding assistant (Cursor, Claude Code, Aider, Antigravity) to execute the migration with bounded scope.
            </p>
          </div>
          <CodeBlock 
            code={aiPrompt} 
            language="markdown" 
            title="ai_agent_prompt.md"
            showLineNumbers={true}
          />
        </div>
      )}

      {/* Mode 3: Manual Implementation Mode */}
      {mode === 'manual' && (
        <div className="workbench-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Interactive Implementation Checklist
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Mark off items as you modify code and run local verification checks.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {progressPercent}% Complete
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {completedCount} of {checklistItems.length} items checked
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checklistItems.map((chk: any, idx: number) => {
              const isDone = Boolean(checklistState[idx]);
              return (
                <div 
                  key={idx}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '5px',
                    padding: '12px 16px',
                    background: isDone ? 'var(--status-pass-bg)' : 'var(--bg-app)',
                    borderColor: isDone ? 'var(--status-pass-border)' : 'var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggleCheck(idx)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: isDone ? 'var(--status-pass-text)' : 'var(--text-primary)',
                        textDecoration: isDone ? 'line-through' : 'none'
                      }}>
                        {chk.item || chk}
                      </span>
                    </div>
                    <StatusBadge status={chk.classification || 'EXECUTED'} />
                  </div>

                  <input
                    type="text"
                    className="input-field"
                    placeholder="Add developer notes or test observation..."
                    style={{ fontSize: '0.74rem', padding: '4px 8px', background: 'var(--bg-surface)' }}
                    value={stepNotes[idx] || ''}
                    onChange={(e) => setStepNotes({ ...stepNotes, [idx]: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 4: Raw Markdown */}
      {mode === 'markdown' && (
        <div className="workbench-panel" style={{ padding: '20px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            background: 'var(--bg-app)',
            padding: '16px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)'
          }}>
            {planMarkdown}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImplementationPlannerPage;
