import React, { useEffect, useState } from 'react';
import { 
  Play, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle,
  Layers,
  FileCode,
  GitBranch,
  Terminal,
  Activity,
  Plus,
  RefreshCw,
  FolderGit2,
  Github
} from 'lucide-react';
import { listScans, deleteScan, listImplementationPlans } from '../api/client';
import { ScanItem, ImplementationPlanSummary } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { GitHubModal } from '../components/GitHubModal';

interface DashboardPageProps {
  onNavigateNewScan: () => void;
  onOpenScan: (scanId: string) => void;
  onOpenCapsule: (scanId: string) => void;
  onNavigateVerification?: (scanId: string) => void;
  onNavigatePlans?: (scanId: string) => void;
}

export function formatTimestamp(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  const date = Number.isFinite(numeric) && String(value).length <= 12
    ? new Date(numeric * 1000)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateNewScan,
  onOpenScan,
  onOpenCapsule,
  onNavigateVerification,
  onNavigatePlans
}) => {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [plans, setPlans] = useState<ImplementationPlanSummary[]>([]);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = async () => {
    try {
      setLoading(true);
      const data = await listScans();
      setScans(data);
      if (data.length > 0) {
        listImplementationPlans(data[0].scan_id)
          .then(setPlans)
          .catch(() => {});
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load scans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleDelete = async (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete scan ${scanId} and its associated artifacts?`)) {
      try {
        await deleteScan(scanId);
        fetchScans();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const totalDependencies = scans.reduce((acc, s) => acc + (s.summary?.total_dependencies || 0), 0);
  const completedScans = scans.filter(s => s.status === 'completed');

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Workspace Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '20px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-display)',
            marginBottom: '4px'
          }}>
            Workspace
          </h1>
          <p style={{
            fontSize: '0.86rem',
            color: 'var(--text-secondary)'
          }}>
            Review dependency risk, migration evidence, and outstanding implementation work.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setGithubModalOpen(true)}
            title="Discover and scan remote GitHub repositories"
          >
            <Github size={13} />
            <span>GitHub Repos</span>
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={fetchScans} 
            title="Refresh workspace records"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onNavigateNewScan}
          >
            <Plus size={14} />
            <span>Start Analysis</span>
          </button>
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
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        marginBottom: '28px'
      }}>
        <div className="workbench-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
            Active Repositories
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {scans.length}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ({completedScans.length} verified)
            </span>
          </div>
        </div>

        <div className="workbench-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
            Dependencies Indexed
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {totalDependencies}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              AST call-sites mapped
            </span>
          </div>
        </div>

        <div className="workbench-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
            Implementation Plans
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {plans.length}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              with verification checklists
            </span>
          </div>
        </div>

        <div className="workbench-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
            Verification Suite
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              10-Point
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--status-pass-text)' }}>
              Deterministic Engine
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="workbench-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Loading workspace inventory...
        </div>
      ) : scans.length === 0 ? (
        /* Empty State */
        <div className="workbench-panel" style={{ padding: '56px 24px', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '6px',
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border-color)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <FolderGit2 size={22} color="var(--accent-sage-dark)" />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
            No analyses in workspace
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
            Scan a local Python repository to discover dependencies, map AST call-sites, compute maintenance risk, and run independent verification checks.
          </p>
          <button className="btn btn-primary" onClick={onNavigateNewScan}>
            <Plus size={14} />
            <span>Start an Analysis</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Recent Analyses Section */}
          <div className="workbench-panel" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-sidebar)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  Recent Repository Analyses
                </h2>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {scans.length} repository scan{scans.length === 1 ? '' : 's'} recorded
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="workbench-table">
                <thead>
                  <tr>
                    <th>Repository / Path</th>
                    <th>Scan Identifier</th>
                    <th>Dependencies</th>
                    <th>Risk Profile</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => {
                    const repoName = scan.repo_path.split(/[/\\]/).pop() || scan.repo_path;
                    const summary: any = scan.summary || {
                      total_dependencies: 0,
                      critical_risk_count: 0,
                      high_risk_count: 0
                    };

                    return (
                      <tr 
                        key={scan.scan_id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onOpenScan(scan.scan_id)}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <GitBranch size={14} color="#696B66" />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {repoName}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {scan.repo_path}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {scan.scan_id.slice(-10)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{summary.total_dependencies}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>packages</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            {summary.critical_risk_count > 0 && (
                              <span className="badge badge-critical">
                                {summary.critical_risk_count} Critical
                              </span>
                            )}
                            {summary.high_risk_count > 0 && (
                              <span className="badge badge-high">
                                {summary.high_risk_count} High
                              </span>
                            )}
                            {summary.critical_risk_count === 0 && summary.high_risk_count === 0 && (
                              <span className="badge badge-low">
                                Clean / Low Risk
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: scan.status === 'completed' ? '#F0FDF4' : '#FEFCE8',
                            color: scan.status === 'completed' ? '#166534' : '#854D0E',
                            border: `1px solid ${scan.status === 'completed' ? '#BBF7D0' : '#FEF08A'}`
                          }}>
                            {scan.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {formatTimestamp(scan.created_at)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => onOpenScan(scan.scan_id)}
                              title="Inspect Dependency Inventory"
                            >
                              <Layers size={12} />
                              <span>Inspect</span>
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => onOpenCapsule(scan.scan_id)}
                              title="View Exit Capsule"
                            >
                              <FileText size={12} />
                              <span>Capsule</span>
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '4px 6px' }}
                              onClick={(e) => handleDelete(scan.scan_id, e)}
                              title="Delete Scan"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Access: Verification & Implementation Plans */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {/* Verification Center Shortcut */}
            <div className="workbench-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="var(--accent-sage-dark)" />
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Independent Verification
                  </h3>
                </div>
                {onNavigateVerification && scans.length > 0 && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                    onClick={() => onNavigateVerification(scans[0].scan_id)}
                  >
                    <span>View Suite</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                Run deterministic 10-point compatibility evaluations: API equivalence, AST symbol presence, ephemeral test harnesses, and PyPI wheel validation.
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-pass">API Compatibility</span>
                <span className="badge badge-pass">Isolated venv</span>
                <span className="badge badge-pass">Test Regression</span>
                <span className="badge badge-executed">SHA-256 Sealing</span>
              </div>
            </div>

            {/* Implementation Plans Shortcut */}
            <div className="workbench-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCode size={16} color="var(--accent-sage-dark)" />
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Implementation Plans
                  </h3>
                </div>
                {onNavigatePlans && scans.length > 0 && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                    onClick={() => onNavigatePlans(scans[0].scan_id)}
                  >
                    <span>View Plans</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                Turn verified migration hypotheses into actionable engineering specifications with rollback strategies, AI agent prompts, and manual checklists.
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-observed">{plans.length} Generated Plan{plans.length === 1 ? '' : 's'}</span>
                <span className="badge badge-executed">Agent Prompt Export</span>
                <span className="badge badge-ai">Rollback Fallbacks</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GITHUB INTEGRATION MODAL */}
      <GitHubModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        onScanStarted={(scanId) => {
          onOpenScan(scanId);
        }}
      />
    </div>
  );
};

export default DashboardPage;
