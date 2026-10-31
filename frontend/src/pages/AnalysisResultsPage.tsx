import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Search, 
  Filter, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight,
  ArrowUpDown,
  ExternalLink,
  Layers,
  Code2,
  Info
} from 'lucide-react';
import { getScanDetails } from '../api/client';
import { ScanDetails, DependencyOverview } from '../api/types';
import { RiskGauge } from '../components/RiskGauge';
import { StatusBadge } from '../components/StatusBadge';

interface AnalysisResultsPageProps {
  scanId: string;
  onBack: () => void;
  onSelectDependency: (packageName: string) => void;
  onOpenCapsule: () => void;
}

type SortField = 'risk' | 'name' | 'usage';
type SortOrder = 'asc' | 'desc';

export const AnalysisResultsPage: React.FC<AnalysisResultsPageProps> = ({
  scanId,
  onBack,
  onSelectDependency,
  onOpenCapsule
}) => {
  const [details, setDetails] = useState<ScanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('risk');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getScanDetails(scanId)
      .then(setDetails)
      .catch((err) => setError(err.message || 'Failed to fetch scan details'))
      .finally(() => setLoading(false));
  }, [scanId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1240px', margin: '48px auto', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Loading repository dependency inventory...
      </div>
    );
  }

  if (error || !details) {
    return (
      <div style={{ maxWidth: '700px', margin: '48px auto', padding: '24px' }} className="workbench-panel">
        <h2 style={{ color: 'var(--status-fail-text)', marginBottom: '8px', fontSize: '1.1rem' }}>Scan Analysis Failed to Load</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem' }}>{error || 'Scan not found.'}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={14} /> <span>Return to Workspace</span>
        </button>
      </div>
    );
  }

  const dependencies = details.dependencies || [];

  // Filter logic
  const filtered = dependencies.filter((dep) => {
    const matchesSearch = dep.package_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'ALL' || dep.risk_breakdown?.level === filterRisk;
    const matchesCategory = filterCategory === 'ALL' || dep.category === filterCategory;
    return matchesSearch && matchesRisk && matchesCategory;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'risk') {
      const scoreA = a.risk_score ?? -1;
      const scoreB = b.risk_score ?? -1;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    }
    if (sortField === 'name') {
      return sortOrder === 'desc' 
        ? b.package_name.localeCompare(a.package_name)
        : a.package_name.localeCompare(b.package_name);
    }
    if (sortField === 'usage') {
      const usageA = a.usages_count ?? 0;
      const usageB = b.usages_count ?? 0;
      return sortOrder === 'desc' ? usageB - usageA : usageA - usageB;
    }
    return 0;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const criticalCount = dependencies.filter(d => d.risk_breakdown?.level === 'CRITICAL').length;
  const highCount = dependencies.filter(d => d.risk_breakdown?.level === 'HIGH').length;
  const mediumCount = dependencies.filter(d => d.risk_breakdown?.level === 'MEDIUM').length;
  const lowCount = dependencies.filter(d => d.risk_breakdown?.level === 'LOW').length;

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
            <ArrowLeft size={14} /> <span>Workspace</span>
          </button>
          <div>
            <h1 style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-display)',
              marginBottom: '2px'
            }}>
              Dependency Inventory
            </h1>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Scan: {scanId} | Root: {details.repo_path}
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onOpenCapsule}>
          <FileText size={14} /> <span>View Exit Capsule</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <div className="workbench-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Total Packages
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {dependencies.length}
          </div>
        </div>
        <div className="workbench-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--status-fail-text)', fontWeight: 600 }}>
            Critical Risk
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--status-fail-text)', fontFamily: 'var(--font-mono)' }}>
            {criticalCount}
          </div>
        </div>
        <div className="workbench-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--status-warn-text)', fontWeight: 600 }}>
            High Risk
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--status-warn-text)', fontFamily: 'var(--font-mono)' }}>
            {highCount}
          </div>
        </div>
        <div className="workbench-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--status-pass-text)', fontWeight: 600 }}>
            Medium / Low Risk
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--status-pass-text)', fontFamily: 'var(--font-mono)' }}>
            {mediumCount + lowCount}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="workbench-panel" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={14} color="#8E9089" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search packages by name..."
            className="input-field"
            style={{ paddingLeft: '32px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>Risk:</span>
          <select
            className="input-field"
            style={{ width: 'auto', padding: '6px 10px' }}
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical Risk Only</option>
            <option value="HIGH">High Risk Only</option>
            <option value="MEDIUM">Medium Risk Only</option>
            <option value="LOW">Low Risk Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>Category:</span>
          <select
            className="input-field"
            style={{ width: 'auto', padding: '6px 10px' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="declared">Declared in Manifests</option>
            <option value="candidate_undeclared">Observed Undeclared</option>
            <option value="candidate_unused">Declared Unused</option>
          </select>
        </div>
      </div>

      {/* Dense Dependency Table or Empty State */}
      {dependencies.length === 0 ? (
        <div className="workbench-card" style={{
          textAlign: 'center',
          padding: '48px 24px',
          margin: '20px 0',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255, 184, 77, 0.12)',
            border: '1px solid rgba(255, 184, 77, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#FFB84D'
          }}>
            <AlertTriangle size={28} />
          </div>

          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            marginBottom: '8px'
          }}>
            No Python Dependencies Detected (0 Packages)
          </h3>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.86rem',
            maxWidth: '560px',
            margin: '0 auto 16px',
            lineHeight: 1.6
          }}>
            The repository scan completed successfully, but no Python dependency manifests (such as <code>requirements.txt</code>, <code>pyproject.toml</code>, <code>setup.py</code>, or <code>Pipfile</code>) or Python source files were found in <strong>{details.repo_path}</strong>.
          </p>

          <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'left',
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border-color)',
            padding: '14px 18px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '24px',
            maxWidth: '540px'
          }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              💡 Exit Capsule is built for Python Projects
            </div>
            <div>• Make sure the repository contains Python code and dependency manifests.</div>
            <div>• If you connected GitHub, select a Python repository (e.g. <code>data-predict</code>, <code>Atlas</code>, or <code>gurucortex</code>).</div>
          </div>

          <div>
            <button className="btn btn-primary" onClick={onBack} style={{ gap: '8px' }}>
              <ArrowLeft size={14} />
              <span>Select or Scan a Python Repository</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="workbench-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="workbench-table">
              <thead>
                <tr>
                  <th style={{ width: '28px' }}></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Package Name</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th>Declared Version</th>
                  <th>Latest PyPI Version</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('risk')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Risk Score</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th>Evidence Summary</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('usage')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>AST Usage</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th>Verification State</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                      No dependencies match the search query "{searchTerm}" or selected risk/category filters.
                    </td>
                  </tr>
                )}
                {sorted.map((dep) => {
                const isExpanded = expandedPkg === dep.package_name;
                const risk = dep.risk_breakdown || {
                  score: dep.risk_score || 0,
                  level: 'LOW',
                  factors: {}
                };

                return (
                  <React.Fragment key={dep.package_name}>
                    <tr 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedPkg(isExpanded ? null : dep.package_name)}
                    >
                      <td>
                        <button
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                          title="Toggle risk breakdown"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {dep.package_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {dep.category === 'declared' ? 'Declared' : dep.category === 'candidate_undeclared' ? 'Undeclared (AST)' : 'Unused'}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {dep.declared_version || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.78rem', color: dep.pypi_metadata?.latest_version ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {dep.pypi_metadata?.latest_version || 'Unavailable'}
                        </span>
                      </td>
                      <td>
                        <RiskGauge score={dep.risk_score} level={dep.risk_breakdown?.level || 'LOW'} />
                      </td>
                      <td>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          {dep.pypi_metadata?.is_yanked ? (
                            <span style={{ color: 'var(--status-fail-text)', fontWeight: 500 }}>
                              Yanked from PyPI
                            </span>
                          ) : (
                            <span>{dep.pypi_metadata?.license || 'Standard library / Clean'}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                          {dep.usages_count || 0}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>sites</span>
                      </td>
                      <td>
                        <StatusBadge 
                          status={dep.verification_status || 'NOT_VERIFIED'} 
                          type="check"
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                            onClick={() => onSelectDependency(dep.package_name)}
                          >
                            <span>Inspect</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Explainable Risk Breakdown */}
                    {isExpanded && (
                      <tr style={{ background: 'var(--bg-sidebar)' }}>
                        <td colSpan={9} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                              <div style={{ fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Explainable Risk Factors: {dep.package_name} (Score: {dep.risk_score}/100)
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                                {(dep.risk_breakdown?.factors || []).map((f, fi) => (
                                  <div key={fi} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{f.name}:</span>
                                    <span className="font-mono" style={{ fontWeight: 600 }}>+{f.score} pts</span>
                                  </div>
                                ))}
                                {(!dep.risk_breakdown?.factors || dep.risk_breakdown.factors.length === 0) && (
                                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    No adverse CVE or deprecation risk factors detected.
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Quick Actions
                              </div>
                              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                                Review exact source-code call sites, evaluate Gemma 4 migration hypotheses, or trigger the 10-point verification engine.
                              </p>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="btn btn-primary"
                                  style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                                  onClick={() => onSelectDependency(dep.package_name)}
                                >
                                  Open Detail Workspace
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

export default AnalysisResultsPage;
