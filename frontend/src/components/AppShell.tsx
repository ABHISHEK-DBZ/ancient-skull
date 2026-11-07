import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Play, 
  Layers, 
  FileText, 
  FileCode, 
  History, 
  Bot,
  ScrollText,
  Settings as SettingsIcon, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  GitBranch, 
  Home,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Plus,
  Github,
  Sun,
  Moon
} from 'lucide-react';
import { ScanItem, SystemSettings } from '../api/types';
import { listScans, getSettings } from '../api/client';
import { GitHubModal } from './GitHubModal';
import { useTheme } from '../context/ThemeContext';

export type AppTab = 
  | 'overview' 
  | 'new-scan' 
  | 'inventory' 
  | 'verification' 
  | 'capsules' 
  | 'plans' 
  | 'post-verify' 
  | 'workforce'
  | 'audit-logs'
  | 'settings' 
  | 'dependency' 
  | 'plan-detail';

interface AppShellProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onReturnToLanding: () => void;
  activeScanId: string | null;
  onSelectScan: (scanId: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  onReturnToLanding,
  activeScanId,
  onSelectScan,
  children
}) => {
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    listScans().then(setScans).catch(() => {});
    getSettings().then(setSettings).catch(() => {});
  }, [currentTab, activeScanId]);

  const activeScan = scans.find(s => s.scan_id === activeScanId) || scans[0];
  const aiReady = settings?.ai_provider.configured;

  const navItems = [
    { id: 'overview' as AppTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'new-scan' as AppTab, label: 'New Analysis', icon: Play },
    { id: 'inventory' as AppTab, label: 'Dependencies', icon: Layers },
    { id: 'verification' as AppTab, label: 'Verification', icon: ShieldCheck },
    { id: 'capsules' as AppTab, label: 'Exit Capsules', icon: FileText },
    { id: 'plans' as AppTab, label: 'Implementation Plans', icon: FileCode },
    { id: 'post-verify' as AppTab, label: 'Post-Implementation', icon: History },
    { id: 'workforce' as AppTab, label: 'AI Workforce', icon: Bot },
    { id: 'audit-logs' as AppTab, label: 'Audit Logs', icon: ScrollText },
    { id: 'settings' as AppTab, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      {/* Collapsible Left Sidebar */}
      <aside 
        style={{
          width: collapsed ? '64px' : '240px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.15s ease',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          overflowX: 'hidden'
        }} 
        className="app-sidebar"
      >
        {/* Brand Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: '8px'
        }}>
          <div 
            onClick={() => onSelectTab('overview')}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', overflow: 'hidden' }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              background: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldCheck size={16} color="var(--text-inverse)" strokeWidth={2.2} />
            </div>
            {!collapsed && (
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', letterSpacing: '-0.01em', fontFamily: 'var(--font-display)' }}>
                  Exit Capsule
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  Workbench v1.0
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '4px'
              }}
              title="Collapse Sidebar"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
            <button
              onClick={() => setCollapsed(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
              title="Expand Sidebar"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Sidebar Nav Items */}
        <nav style={{
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          flex: 1,
          overflowY: 'auto'
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = 
              currentTab === item.id || 
              (item.id === 'inventory' && currentTab === 'dependency') ||
              (item.id === 'plans' && currentTab === 'plan-detail');

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: collapsed ? '8px 0' : '8px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '5px',
                  background: isActive ? 'var(--bg-surface)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.12s ease',
                  textAlign: 'left',
                  width: '100%',
                  position: 'relative'
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={16} color={isActive ? 'var(--text-primary)' : 'var(--text-muted)'} />
                {!collapsed && (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '3px',
                    borderRadius: '0 2px 2px 0',
                    background: 'var(--text-primary)'
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Controls */}
        <div style={{
          padding: '12px 10px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <button
            onClick={onReturnToLanding}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: collapsed ? '6px 0' : '7px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '4px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              width: '100%'
            }}
            title="Return to Public Website"
          >
            <Home size={14} color="var(--text-muted)" />
            {!collapsed && <span>Public Overview</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Compact Engineering Top Bar */}
        <header style={{
          height: '52px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          gap: '16px'
        }}>
          {/* Left: Mobile Toggle & Repository Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'none',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="mobile-toggle"
            >
              <Menu size={18} />
            </button>

            {/* Repository Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <GitBranch size={15} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'none' }} className="repo-label">
                Repository:
              </span>
              <select
                value={activeScanId || (activeScan?.scan_id || '')}
                onChange={(e) => onSelectScan(e.target.value)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 8px',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '280px',
                  textOverflow: 'ellipsis'
                }}
              >
                {scans.length === 0 ? (
                  <option value="">No repository analyzed</option>
                ) : (
                  scans.map((s) => (
                    <option key={s.scan_id} value={s.scan_id}>
                      {s.repo_path.split(/[/\\]/).pop() || s.repo_path} ({s.scan_id.slice(-6)})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Analysis State Pill */}
            {activeScan && (
              <span style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                padding: '2px 7px',
                borderRadius: '3px',
                background: activeScan.status === 'completed' ? '#F0FDF4' : '#FEFCE8',
                color: activeScan.status === 'completed' ? '#166534' : '#854D0E',
                border: `1px solid ${activeScan.status === 'completed' ? '#BBF7D0' : '#FEF08A'}`,
                whiteSpace: 'nowrap'
              }}>
                {activeScan.status.toUpperCase()}
              </span>
            )}
          </div>

          {/* Right: Model Configuration Status & Action Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Model Configuration Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              background: 'var(--bg-sidebar)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.74rem'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: aiReady ? '#166534' : '#854D0E'
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>Model:</span>
              <span style={{
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                {aiReady ? 'Gemma 4 (Ready)' : 'Deterministic'}
              </span>
            </div>

            {/* Sandbox Tag */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)'
            }}>
              <Terminal size={12} color="#95ABA7" />
              <span>Isolated Sandbox</span>
            </div>

            {/* Contextual Action Area */}
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={() => setGithubModalOpen(true)}
              title="Connect GitHub Repository"
            >
              <Github size={13} />
              <span>GitHub</span>
            </button>

            <button 
              className="btn btn-primary"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => onSelectTab('new-scan')}
            >
              <Plus size={13} />
              <span>New Analysis</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                color: theme === 'dark' ? '#D8FF45' : 'var(--text-primary)',
                cursor: 'pointer'
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div style={{
            background: 'var(--bg-sidebar)',
            borderBottom: '1px solid var(--border-color)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectTab(item.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  background: currentTab === item.id ? 'var(--bg-surface)' : 'transparent',
                  color: currentTab === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: currentTab === item.id ? '1px solid var(--border-color)' : 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.84rem'
                }}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onReturnToLanding();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.84rem'
              }}
            >
              <Home size={16} />
              <span>Public Overview</span>
            </button>
          </div>
        )}

        {/* Dynamic Page Body */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      <GitHubModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        onScanStarted={(id) => {
          onSelectScan(id);
          onSelectTab('inventory');
        }}
      />

      <style>{`
        @media (max-width: 840px) {
          .app-sidebar { display: none !important; }
          .mobile-toggle { display: block !important; }
          .repo-label { display: none !important; }
        }
        @media (min-width: 841px) {
          .repo-label { display: inline !important; }
        }
      `}</style>
    </div>
  );
};

export default AppShell;
