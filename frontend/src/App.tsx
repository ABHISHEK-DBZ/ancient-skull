import React, { useState, useEffect } from 'react';
import { AppShell, AppTab } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewScanPage } from './pages/NewScanPage';
import { AnalysisResultsPage } from './pages/AnalysisResultsPage';
import { DependencyDetailsPage } from './pages/DependencyDetailsPage';
import { VerificationCenterPage } from './pages/VerificationCenterPage';
import { CapsulePage } from './pages/CapsulePage';
import { PlansListPage } from './pages/PlansListPage';
import { ImplementationPlannerPage } from './pages/ImplementationPlannerPage';
import { PostVerificationPage } from './pages/PostVerificationPage';
import { WorkforcePage } from './pages/WorkforcePage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { listScans, completeGitHubCallback } from './api/client';
import { GitHubModal } from './components/GitHubModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';

const VALID_TABS: Array<AppTab | 'landing'> = [
  'landing',
  'overview',
  'new-scan',
  'inventory',
  'verification',
  'capsules',
  'plans',
  'post-verify',
  'workforce',
  'audit-logs',
  'settings',
  'dependency',
  'plan-detail'
];

function getInitialAppState(): {
  tab: AppTab | 'landing';
  scanId: string | null;
  pkg: string | null;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace(/^#\/?/, '');
    const hashParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    const hashTab = hash.split('?')[0];

    const urlTab = (params.get('tab') || hashParams.get('tab') || hashTab) as (AppTab | 'landing') | null;
    const urlScan = params.get('scan') || params.get('scanId') || hashParams.get('scan') || hashParams.get('scanId');
    const urlPkg = params.get('package') || params.get('pkg') || hashParams.get('package') || hashParams.get('pkg');

    const savedTab = localStorage.getItem('exit_capsule_active_tab') as (AppTab | 'landing') | null;
    const savedScan = localStorage.getItem('exit_capsule_active_scan');
    const savedPkg = localStorage.getItem('exit_capsule_active_pkg');

    let resolvedTab: AppTab | 'landing' = 'landing';
    if (urlTab && VALID_TABS.includes(urlTab)) {
      resolvedTab = urlTab;
    } else if (savedTab && VALID_TABS.includes(savedTab)) {
      resolvedTab = savedTab;
    }

    const resolvedScan = urlScan || savedScan || null;
    const resolvedPkg = urlPkg || savedPkg || null;

    return {
      tab: resolvedTab,
      scanId: resolvedScan,
      pkg: resolvedPkg
    };
  } catch {
    return { tab: 'landing', scanId: null, pkg: null };
  }
}

const AppContent: React.FC = () => {
  const initial = getInitialAppState();
  const [currentTab, setCurrentTab] = useState<AppTab | 'landing'>(initial.tab);
  const [activeScanId, setActiveScanId] = useState<string | null>(initial.scanId);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(initial.pkg);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Sync state to URL and localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('exit_capsule_active_tab', currentTab);
      if (activeScanId) {
        localStorage.setItem('exit_capsule_active_scan', activeScanId);
      }
      if (selectedPackage) {
        localStorage.setItem('exit_capsule_active_pkg', selectedPackage);
      }

      const url = new URL(window.location.href);
      if (currentTab === 'landing') {
        url.search = '';
        url.hash = '';
      } else {
        url.searchParams.set('tab', currentTab);
        if (activeScanId) {
          url.searchParams.set('scan', activeScanId);
        } else {
          url.searchParams.delete('scan');
        }
        if (selectedPackage && (currentTab === 'dependency' || currentTab === 'plan-detail')) {
          url.searchParams.set('package', selectedPackage);
        } else {
          url.searchParams.delete('package');
        }
      }
      window.history.replaceState({ tab: currentTab, scan: activeScanId, pkg: selectedPackage }, '', url.toString());
    } catch (e) {
      console.warn('Failed to persist app state in URL/localStorage:', e);
    }
  }, [currentTab, activeScanId, selectedPackage]);

  // Handle browser back and forward history buttons
  useEffect(() => {
    const handlePopState = () => {
      const state = getInitialAppState();
      setCurrentTab(state.tab);
      if (state.scanId) setActiveScanId(state.scanId);
      if (state.pkg) setSelectedPackage(state.pkg);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle GitHub OAuth callback redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const denied = params.get('error_description') || params.get('error');
    const clearCallbackUrl = () => {
      window.history.replaceState({}, document.title, `${window.location.origin}/?tab=overview`);
      setCurrentTab('overview');
    };

    if (denied) {
      clearCallbackUrl();
      setOauthError(denied);
      return;
    }

    if (code) {
      completeGitHubCallback(code, params.get('state') || undefined)
        .then(() => {
          clearCallbackUrl();
          setGithubModalOpen(true);
        })
        .catch((err) => {
          clearCallbackUrl();
          setOauthError(err.message || 'GitHub authorization failed');
        });
    }
  }, []);

  // Auto-select latest scan if none currently selected
  useEffect(() => {
    listScans().then((scans) => {
      if (scans.length > 0) {
        setActiveScanId((prev) => prev || scans[0].scan_id);
      }
    }).catch(() => {});
  }, []);

  const navigateToScan = (scanId: string) => {
    setActiveScanId(scanId);
    setCurrentTab('inventory');
  };

  const navigateToCapsule = (scanId: string) => {
    setActiveScanId(scanId);
    setCurrentTab('capsules');
  };

  const navigateToDependency = (pkgName: string) => {
    setSelectedPackage(pkgName);
    setCurrentTab('dependency');
  };

  const navigateToPlan = (pkgName: string) => {
    setSelectedPackage(pkgName);
    setCurrentTab('plan-detail');
  };

  if (currentTab === 'landing') {
    return (
      <ErrorBoundary fallbackTitle="Landing Page Error">
        <LandingPage
          onAnalyzeRepo={() => setCurrentTab('new-scan')}
          onOpenDashboard={() => setCurrentTab('overview')}
          onOpenScan={(scanId) => {
            setActiveScanId(scanId);
            setCurrentTab('inventory');
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <AppShell
      currentTab={currentTab}
      onSelectTab={(tab) => setCurrentTab(tab)}
      onReturnToLanding={() => setCurrentTab('landing')}
      activeScanId={activeScanId}
      onSelectScan={(id) => setActiveScanId(id)}
    >
      <ErrorBoundary fallbackTitle="Page View Error">
        {oauthError && (
          <div className="workbench-panel" style={{ margin: '12px 20px', padding: '10px 14px', border: '1px solid #FED7D7', background: '#FFF5F5', color: '#C53030', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span>GitHub authorization failed: {oauthError}</span>
            <button className="btn btn-secondary" style={{ padding: '2px 8px' }} onClick={() => setOauthError(null)}>Dismiss</button>
          </div>
        )}
        {currentTab === 'overview' && (
          <DashboardPage
            onNavigateNewScan={() => setCurrentTab('new-scan')}
            onOpenScan={navigateToScan}
            onOpenCapsule={navigateToCapsule}
            onNavigateVerification={(id) => {
              setActiveScanId(id);
              setCurrentTab('verification');
            }}
            onNavigatePlans={(id) => {
              setActiveScanId(id);
              setCurrentTab('plans');
            }}
          />
        )}

        {currentTab === 'new-scan' && (
          <NewScanPage
            onScanCompleted={(scanId) => {
              setActiveScanId(scanId);
              setCurrentTab('inventory');
            }}
            onCancel={() => setCurrentTab('overview')}
          />
        )}

        {currentTab === 'inventory' && activeScanId && (
          <AnalysisResultsPage
            scanId={activeScanId}
            onBack={() => setCurrentTab('overview')}
            onSelectDependency={navigateToDependency}
            onOpenCapsule={() => setCurrentTab('capsules')}
          />
        )}

        {currentTab === 'inventory' && !activeScanId && (
          <div style={{ maxWidth: '640px', margin: '48px auto', textAlign: 'center', padding: '36px' }} className="workbench-panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>No Active Repository Selected</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.84rem' }}>Select an existing repository scan or start a new analysis to inspect dependencies and AST usage.</p>
            <button className="btn btn-primary" onClick={() => setCurrentTab('new-scan')}>
              Start New Analysis
            </button>
          </div>
        )}

        {currentTab === 'dependency' && activeScanId && selectedPackage && (
          <DependencyDetailsPage
            scanId={activeScanId}
            packageName={selectedPackage}
            onBack={() => setCurrentTab('inventory')}
            onOpenImplementationPlan={navigateToPlan}
          />
        )}

        {currentTab === 'dependency' && (!activeScanId || !selectedPackage) && (
          <div style={{ maxWidth: '640px', margin: '48px auto', textAlign: 'center', padding: '36px' }} className="workbench-panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>No Dependency Selected</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.84rem' }}>Return to the Dependency Inventory and choose a package to inspect.</p>
            <button className="btn btn-primary" onClick={() => setCurrentTab('inventory')}>
              Go to Inventory
            </button>
          </div>
        )}

        {currentTab === 'verification' && (
          <VerificationCenterPage
            scanId={activeScanId}
            onSelectScan={setActiveScanId}
            onNavigateDependency={navigateToDependency}
          />
        )}

        {currentTab === 'capsules' && activeScanId && (
          <CapsulePage
            scanId={activeScanId}
            onBack={() => setCurrentTab('overview')}
          />
        )}

        {currentTab === 'capsules' && !activeScanId && (
          <div style={{ maxWidth: '640px', margin: '48px auto', textAlign: 'center', padding: '36px' }} className="workbench-panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>No Active Capsule Selected</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.84rem' }}>Select or run a repository scan to generate and inspect an Exit Capsule.</p>
            <button className="btn btn-primary" onClick={() => setCurrentTab('new-scan')}>
              Start New Analysis
            </button>
          </div>
        )}

        {currentTab === 'plans' && (
          <PlansListPage
            scanId={activeScanId}
            onSelectScan={setActiveScanId}
            onOpenPlan={navigateToPlan}
            onNavigateNewScan={() => setCurrentTab('new-scan')}
          />
        )}

        {currentTab === 'plan-detail' && activeScanId && selectedPackage && (
          <ImplementationPlannerPage
            scanId={activeScanId}
            packageName={selectedPackage}
            onBack={() => setCurrentTab('plans')}
            onNavigatePostVerify={() => setCurrentTab('post-verify')}
          />
        )}

        {currentTab === 'plan-detail' && (!activeScanId || !selectedPackage) && (
          <div style={{ maxWidth: '640px', margin: '48px auto', textAlign: 'center', padding: '36px' }} className="workbench-panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>No Implementation Plan Selected</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.84rem' }}>Select an implementation plan to inspect generated migration steps and prompts.</p>
            <button className="btn btn-primary" onClick={() => setCurrentTab('plans')}>
              View All Plans
            </button>
          </div>
        )}

        {currentTab === 'post-verify' && activeScanId && (
          <PostVerificationPage
            scanId={activeScanId}
            onBack={() => setCurrentTab('plans')}
            onOpenCapsule={() => setCurrentTab('capsules')}
          />
        )}

        {currentTab === 'post-verify' && !activeScanId && (
          <div style={{ maxWidth: '640px', margin: '48px auto', textAlign: 'center', padding: '36px' }} className="workbench-panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>No Active Scan Selected</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.84rem' }}>Select or run a scan before executing post-implementation verification.</p>
            <button className="btn btn-primary" onClick={() => setCurrentTab('new-scan')}>
              Start New Analysis
            </button>
          </div>
        )}

        {currentTab === 'workforce' && <WorkforcePage />}

        {currentTab === 'audit-logs' && <AuditLogsPage scanId={activeScanId} />}

        {currentTab === 'settings' && (
          <SettingsPage />
        )}
      </ErrorBoundary>

      <GitHubModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        onScanStarted={navigateToScan}
      />
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
