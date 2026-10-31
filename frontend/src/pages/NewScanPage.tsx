import React, { useState, useEffect } from 'react';
import { 
  Play, 
  ArrowLeft,
  Terminal,
  Clock,
  Layers,
  Code2,
  FileCheck2,
  FlaskConical,
  ShieldCheck,
  Ban,
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
  Info
} from 'lucide-react';
import { startScan, getScanProgress, getSettings } from '../api/client';
import { SystemSettings } from '../api/types';

interface NewScanPageProps {
  onScanCompleted: (scanId: string) => void;
  onCancel: () => void;
}

interface PipelineStage {
  id: number;
  name: string;
  desc: string;
  minPct: number;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 1, name: 'Dependency Discovery', desc: 'Parse requirements.txt, pyproject.toml, and setup.py declarations', minPct: 15 },
  { id: 2, name: 'AST Usage Analysis', desc: 'Extract imports, call sites, and enclosing scopes', minPct: 35 },
  { id: 3, name: 'Metadata & Risk Scoring', desc: 'Query PyPI for release recency, yank status, and version lag', minPct: 60 },
  { id: 4, name: 'Gemma 4 Migration Proposal', desc: 'Propose replacement candidates when AI is enabled', minPct: 80 },
  { id: 5, name: 'Exit Capsule Generation', desc: 'Seal the JSON artifact and generate the Markdown report', minPct: 95 }
];

export const NewScanPage: React.FC<NewScanPageProps> = ({ onScanCompleted, onCancel }) => {
  const [repoPath, setRepoPath] = useState('');
  const [runAi, setRunAi] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const [scanning, setScanning] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stageLogs, setStageLogs] = useState<string[]>([]);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  // Elapsed timer when scanning
  useEffect(() => {
    let timer: any;
    if (scanning) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [scanning]);

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim()) {
      setError('Please provide a valid repository path.');
      return;
    }

    try {
      setError(null);
      setScanning(true);
      setProgressPct(8);
      setCurrentStep('Initializing analysis request...');
      setStageLogs([`[0.0s] Initiating scan for repository: ${repoPath.trim()}`]);

      const resp = await startScan(repoPath.trim(), runAi);
      setActiveScanId(resp.scan_id);

      // Poll progress from real backend
      const interval = setInterval(async () => {
        try {
          const prog = await getScanProgress(resp.scan_id);
          setProgressPct(prog.progress_pct);
          setCurrentStep(prog.current_step);

          setStageLogs((prev) => {
            if (!prev.includes(`[step] ${prog.current_step}`)) {
              return [...prev, `[step] ${prog.current_step}`];
            }
            return prev;
          });

          if (prog.status === 'completed') {
            clearInterval(interval);
            setScanning(false);
            onScanCompleted(resp.scan_id);
          } else if (prog.status === 'failed') {
            clearInterval(interval);
            setScanning(false);
            setError(prog.error_message || 'Scan process failed on the backend.');
          }
        } catch (pollErr: any) {
          console.warn('Polling error:', pollErr);
        }
      }, 750);
    } catch (err: any) {
      setScanning(false);
      setError(err.message || 'Failed to start scan.');
    }
  };

  const handleCancel = () => {
    setScanning(false);
    onCancel();
  };

  const fillSamplePath = () => {
    setRepoPath('tests/fixtures/sample_project');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '18px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
            disabled={scanning}
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={14} />
            <span>Workspace</span>
          </button>
          <div>
            <h1 style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-display)'
            }}>
              {scanning ? 'Analysis in Progress' : 'New Repository Analysis'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {scanning 
                ? `Job ID: ${activeScanId || 'pending'} — Elapsed: ${elapsedSeconds}s`
                : 'Configure AST scan scope, package registry lookup, and verification constraints.'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--status-fail-bg)',
          border: '1px solid var(--status-fail-border)',
          borderRadius: '5px',
          color: 'var(--status-fail-text)',
          fontSize: '0.84rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {!scanning ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
          {/* Main Form */}
          <form onSubmit={handleStartScan} className="workbench-panel" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Repository Path or Public GitHub URL <span style={{ color: 'var(--status-fail-text)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={fillSamplePath}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-sage-dark)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Use local fixture
                  </button>
                </div>
              </div>
              <input
                type="text"
                className="input-field font-mono"
                placeholder="e.g. https://github.com/rishrek/LinkWatch or c:/projects/my-service"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                required
              />
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Paste any public GitHub repository URL or a local folder path.
              </p>
            </div>

            <div style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '16px',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                Analysis & Verification Modules
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={runAi}
                  onChange={(e) => setRunAi(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Gemma 4 Migration Recommendations
                    </span>
                    <span className="badge badge-ai">AI Assisted</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Uses Gemma 4 with AST call-site context to propose drop-in package replacements.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Play size={14} />
                <span>Execute Analysis Job</span>
              </button>
            </div>
          </form>

          {/* Context & Execution Boundaries Guide */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="workbench-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Info size={16} color="var(--accent-sage-dark)" />
                <h3 style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Execution Boundaries
                </h3>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '12px' }}>
                Before executing an analysis, Exit Capsule enforces strict boundary guarantees:
              </p>
              <ul style={{ paddingLeft: '16px', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>
                  <strong>Static Analysis:</strong> Manifest parsing and AST usage analysis operate in memory without executing scanned code.
                </li>
                <li>
                  <strong>Dynamic Testing:</strong> Test runs use temporary directories outside your working tree with timeout limits.
                </li>
                <li>
                  <strong>Read-Only Scans:</strong> No files in your source repository will be modified by this step.
                </li>
              </ul>
            </div>

            <div className="workbench-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Environment Status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Backend Engine:</span>
                  <span style={{ fontWeight: 600, color: 'var(--status-pass-text)' }}>FastAPI (running)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>AI Model:</span>
                  <span style={{ fontWeight: 600, color: settings?.ai_provider.configured ? 'var(--status-pass-text)' : 'var(--status-warn-text)' }}>
                    {settings?.ai_provider.configured ? 'Gemma 4 (Active)' : 'Deterministic Fallback'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Isolation:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Temporary copies, host interpreter</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Progress View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Indicator */}
          <div className="workbench-panel" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Active Execution Stage
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {currentStep || 'Processing repository...'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {progressPct}%
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Elapsed: {elapsedSeconds}s
                </div>
              </div>
            </div>

            {/* Progress Track */}
            <div style={{
              width: '100%',
              height: '6px',
              background: 'var(--border-color)',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <div style={{
                width: `${progressPct}%`,
                height: '100%',
                background: '#171815',
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }} />
            </div>

            {/* Compact Sequence of Pipeline Stages */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '8px',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '14px'
            }}>
              {PIPELINE_STAGES.map((st) => {
                const isComplete = progressPct >= st.minPct;
                const isCurrent = !isComplete && (progressPct >= st.minPct - 20);

                return (
                  <div 
                    key={st.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '4px',
                      background: isCurrent ? 'var(--bg-subtle)' : 'transparent',
                      border: isCurrent ? '1px solid var(--border-dark)' : '1px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      {isComplete ? (
                        <CheckCircle2 size={13} color="var(--status-pass-text)" />
                      ) : (
                        <span style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: `1px solid ${isCurrent ? '#171815' : 'var(--border-dark)'}`,
                          display: 'inline-block'
                        }} />
                      )}
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: isCurrent ? 600 : 500,
                        color: isComplete ? 'var(--text-primary)' : isCurrent ? '#171815' : 'var(--text-muted)'
                      }}>
                        {st.id}. {st.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actual Log Stream (Dark Charcoal Code Surface) */}
          <div className="workbench-panel" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '10px 16px',
              background: 'var(--bg-sidebar)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={14} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Execution Event Stream
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {stageLogs.length} events logged
              </span>
            </div>

            <div style={{
              background: 'var(--code-bg)',
              padding: '14px',
              maxHeight: '260px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: 'var(--code-text)',
              lineHeight: 1.55
            }}>
              {stageLogs.map((log, index) => (
                <div key={index} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  <span style={{ color: 'var(--code-muted)', marginRight: '8px' }}>[{index + 1}]</span>
                  <span>{log}</span>
                </div>
              ))}
              {stageLogs.length === 0 && (
                <div style={{ color: 'var(--code-muted)', fontStyle: 'italic' }}>
                  Awaiting output events from runner...
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={handleCancel}>
              <Ban size={14} />
              <span>Cancel Job</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewScanPage;
