import React, { useState, useEffect } from 'react';
import { 
  Github, 
  X, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Lock, 
  GitBranch, 
  Play, 
  LogOut 
} from 'lucide-react';
import { 
  getGitHubStatus, 
  getGitHubLoginUrl, 
  listGitHubRepositories, 
  disconnectGitHub, 
  cloneAndScanGitHubRepo 
} from '../api/client';
import { GitHubAuthStatus, GitHubRepository } from '../api/types';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanStarted: (scanId: string) => void;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose, onScanStarted }) => {
  const [status, setStatus] = useState<GitHubAuthStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [cloningRepo, setCloningRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatusAndRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const st = await getGitHubStatus();
      setStatus(st);
      if (st.connected) {
        const repoList = await listGitHubRepositories();
        setRepos(repoList);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to GitHub service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndRepos();
    }
  }, [isOpen]);

  const handleConnect = async () => {
    setError(null);
    try {
      const { auth_url } = await getGitHubLoginUrl();
      // Redirect to GitHub OAuth authorize endpoint
      window.location.href = auth_url;
    } catch (err: any) {
      setError(err.message || 'GitHub OAuth is not configured on the backend.');
    }
  };

  const handleDisconnect = async () => {
    await disconnectGitHub();
    setStatus(prev => prev ? { ...prev, connected: false, user: null } : null);
    setRepos([]);
  };

  const handleCloneAndScan = async (repo: GitHubRepository) => {
    setCloningRepo(repo.full_name);
    setError(null);
    try {
      const res = await cloneAndScanGitHubRepo(repo.full_name, repo.default_branch, false);
      onScanStarted(res.scan_id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to clone repository');
    } finally {
      setCloningRepo(null);
    }
  };

  if (!isOpen) return null;

  const filteredRepos = repos.filter(r => 
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(23, 24, 21, 0.45)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div 
        className="workbench-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-neutral)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Github size={20} color="var(--text-primary)" />
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                GitHub Repository Integration
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Inspect and scan remote repositories directly
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              padding: '12px 14px',
              background: '#FFF5F5',
              border: '1px solid #FED7D7',
              borderRadius: '6px',
              color: '#C53030',
              fontSize: '0.82rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <RotateCcw size={20} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
              <p style={{ fontSize: '0.85rem' }}>Querying GitHub status...</p>
            </div>
          ) : !status?.configured ? (
            /* Unconfigured state */
            <div style={{ padding: '24px', background: 'var(--bg-canvas)', border: '1px solid var(--border-neutral)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Lock size={18} color="var(--text-secondary)" style={{ marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                    GitHub OAuth Not Configured
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px' }}>
                    To enable server-side GitHub repository discovery and cloning, add your GitHub OAuth App credentials to <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-subtle)', padding: '2px 4px', borderRadius: '4px' }}>backend/.env</code>:
                  </p>
                  <pre style={{
                    background: '#141618',
                    color: '#E5E7E1',
                    padding: '12px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    overflowX: 'auto',
                    marginBottom: '14px'
                  }}>
{`GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
APP_BASE_URL=https://your-public-origin.example.com`}
                  </pre>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Local analysis of any cloned repository or path remains 100% functional without GitHub credentials.
                  </p>
                </div>
              </div>
            </div>
          ) : !status.connected ? (
            /* Configured but disconnected */
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <Github size={40} color="var(--text-primary)" style={{ margin: '0 auto 16px' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Connect your GitHub Account
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                Authorize Exit Capsule to discover your repositories and run AST dependency resilience audits.
              </p>
              <button 
                onClick={handleConnect}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Github size={16} />
                <span>Authorize with GitHub</span>
              </button>
            </div>
          ) : (
            /* Connected state with repo listing */
            <div>
              {/* User Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-subtle)',
                borderRadius: '6px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {status.user?.avatar_url && (
                    <img 
                      src={status.user.avatar_url} 
                      alt={status.user.username} 
                      style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                    />
                  )}
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {status.user?.name || status.user?.username}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
                      @{status.user?.username}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleDisconnect}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.74rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <LogOut size={12} />
                  <span>Disconnect</span>
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ marginBottom: '14px', position: 'relative' }}>
                <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Filter repositories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Repos List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredRepos.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem', padding: '24px' }}>
                    No matching repositories found.
                  </p>
                ) : (
                  filteredRepos.map(repo => (
                    <div 
                      key={repo.id}
                      style={{
                        padding: '12px 14px',
                        border: '1px solid var(--border-neutral)',
                        borderRadius: '6px',
                        background: 'var(--surface-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            {repo.full_name}
                          </span>
                          {repo.private && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--bg-subtle)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              color: 'var(--text-secondary)'
                            }}>
                              private
                            </span>
                          )}
                        </div>
                        <p style={{
                          fontSize: '0.76rem',
                          color: 'var(--text-secondary)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {repo.description}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <GitBranch size={11} /> {repo.default_branch}
                          </span>
                          {repo.language && (
                            <span style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontFamily: 'var(--font-mono)',
                              background: repo.language.toLowerCase() === 'python' ? 'rgba(81, 214, 160, 0.15)' : 'var(--bg-subtle)',
                              color: repo.language.toLowerCase() === 'python' ? '#51D6A0' : 'var(--text-muted)',
                              border: repo.language.toLowerCase() === 'python' ? '1px solid rgba(81, 214, 160, 0.3)' : '1px solid var(--border-color)',
                              fontWeight: repo.language.toLowerCase() === 'python' ? 600 : 400
                            }}>
                              {repo.language.toLowerCase() === 'python' ? '🐍 Python' : repo.language}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCloneAndScan(repo)}
                        disabled={cloningRepo === repo.full_name}
                        className="btn btn-primary"
                        style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {cloningRepo === repo.full_name ? (
                          <>
                            <RotateCcw size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                            <span>Cloning...</span>
                          </>
                        ) : (
                          <>
                            <Play size={12} />
                            <span>Analyze</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
