import {
  ScanItem,
  ScanDetails,
  DependencyDetail,
  VerificationReport,
  CapsuleResponse,
  PostVerificationRun,
  SystemSettings
} from './types';

const API_BASE = '/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) }
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Request failed (${resp.status})`);
  }
  return resp.json();
}

export async function startScan(repoPath: string, runAi: boolean = false): Promise<{ scan_id: string; status: string; message: string }> {
  return request('/scans/start', {
    method: 'POST',
    body: JSON.stringify({ repo_path: repoPath, run_ai: runAi })
  });
}

export async function getScanProgress(scanId: string): Promise<{ scan_id: string; status: string; progress_pct: number; current_step: string; error_message?: string }> {
  return request(`/scans/${scanId}/progress`);
}

export async function listScans(): Promise<ScanItem[]> {
  return request('/scans/');
}

export async function getScanDetails(scanId: string): Promise<ScanDetails> {
  return request(`/scans/${scanId}`);
}

export async function deleteScan(scanId: string): Promise<void> {
  await request(`/scans/${scanId}`, { method: 'DELETE' });
}

export async function getDependencyDetails(scanId: string, packageName: string): Promise<DependencyDetail> {
  return request(`/scans/${scanId}/dependencies/${encodeURIComponent(packageName)}`);
}

export async function verifyDependency(scanId: string, packageName: string, candidatePackage: string, runLiveTests: boolean = true): Promise<VerificationReport> {
  return request(`/scans/${scanId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ package_name: packageName, candidate_package: candidatePackage, run_live_tests: runLiveTests })
  });
}

export async function recordApproval(scanId: string, packageName: string, decision: 'APPROVED' | 'REJECTED', notes?: string): Promise<any> {
  return request(`/scans/${scanId}/approval`, {
    method: 'POST',
    body: JSON.stringify({ package_name: packageName, decision, notes })
  });
}

export async function createImplementationPlan(scanId: string, packageName: string, candidatePackage: string): Promise<any> {
  return request(`/scans/${scanId}/plan`, {
    method: 'POST',
    body: JSON.stringify({ package_name: packageName, candidate_package: candidatePackage })
  });
}

export async function getCapsule(scanId: string): Promise<CapsuleResponse> {
  return request(`/scans/${scanId}/capsule`);
}

export async function postVerifyWorkingCopy(scanId: string, workingCopyPath: string, targetPackage: string, candidatePackage: string): Promise<PostVerificationRun> {
  return request(`/scans/${scanId}/post-verify`, {
    method: 'POST',
    body: JSON.stringify({
      working_copy_path: workingCopyPath,
      target_package: targetPackage,
      candidate_package: candidatePackage
    })
  });
}

export async function getPostVerifications(scanId: string): Promise<PostVerificationRun[]> {
  return request(`/scans/${scanId}/post-verify`);
}

export async function getSettings(): Promise<SystemSettings> {
  return request('/settings');
}

export async function listVerificationChecks(scanId: string): Promise<import('./types').VerificationCheckRecord[]> {
  return request(`/scans/${scanId}/verifications`);
}

export async function listImplementationPlans(scanId: string): Promise<import('./types').ImplementationPlanSummary[]> {
  return request(`/scans/${scanId}/plans`);
}

export async function getImplementationPlan(scanId: string, packageName: string): Promise<any> {
  return request(`/scans/${scanId}/plan/${encodeURIComponent(packageName)}`);
}

export async function getGitHubStatus(): Promise<import('./types').GitHubAuthStatus> {
  return request('/auth/github/status');
}

export async function getGitHubLoginUrl(): Promise<{ auth_url: string; redirect_uri: string }> {
  return request('/auth/github/login');
}

export async function completeGitHubCallback(code: string, state?: string): Promise<{ user: import('./types').GitHubUser }> {
  return request('/auth/github/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state })
  });
}

export async function disconnectGitHub(): Promise<void> {
  await request('/auth/github/disconnect', { method: 'POST' });
}

export async function listGitHubRepositories(search?: string): Promise<import('./types').GitHubRepository[]> {
  const url = search
    ? `/auth/github/repos?search=${encodeURIComponent(search)}`
    : '/auth/github/repos';
  return request(url);
}

export async function cloneAndScanGitHubRepo(
  repoFullName: string,
  defaultBranch?: string,
  runAi: boolean = false
): Promise<{ scan_id: string; status: string; message: string }> {
  return request('/auth/github/clone-and-scan', {
    method: 'POST',
    body: JSON.stringify({
      repo_full_name: repoFullName,
      default_branch: defaultBranch,
      run_ai: runAi
    })
  });
}
