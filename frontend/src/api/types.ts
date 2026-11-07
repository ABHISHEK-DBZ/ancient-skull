export interface ScanSummary {
  total_dependencies?: number;
  declared_count?: number;
  syntax_errors?: string[];
  critical_risk_count?: number;
  high_risk_count?: number;
  completed_at?: number;
}

export interface ScanItem {
  scan_id: string;
  repo_path: string;
  status: string;
  created_at: string;
  summary: ScanSummary;
  error_message?: string | null;
}

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
  evidence?: string | null;
}

export interface RiskBreakdown {
  package_name: string;
  overall_score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactor[];
  uncertainty: string;
  retrieval_timestamp: number;
}

export interface PyPIMetadata {
  package_name: string;
  found: boolean;
  latest_version?: string | null;
  pinned_version?: string | null;
  latest_release_date?: string | null;
  is_yanked: boolean;
  yanked_reason?: string | null;
  requires_python?: string | null;
  license?: string | null;
  summary?: string | null;
  github_url?: string | null;
  total_releases: number;
}

export interface DependencyOverview {
  package_name: string;
  declared_version?: string | null;
  category: string;
  risk_score: number;
  risk_breakdown: RiskBreakdown;
  pypi_metadata: PyPIMetadata;
  usages_count: number;
  verification_status?: 'VERIFIED' | 'FAILED' | 'INCONCLUSIVE' | 'NOT_VERIFIED' | 'NOT_RUN';
}

export interface ScanDetails {
  scan_id: string;
  repo_path: string;
  status: string;
  created_at: string;
  summary: ScanSummary;
  dependencies: DependencyOverview[];
}

export interface ASTUsage {
  file_path: string;
  line_number: number;
  imported_module: string;
  import_alias?: string | null;
  referenced_symbol?: string | null;
  call_expression?: string | null;
  enclosing_scope?: string | null;
  code_snippet: string;
  is_uncertain: boolean;
  uncertainty_reason?: string | null;
}

export interface APIDifference {
  original_api: string;
  replacement_api: string;
  notes?: string | null;
}

export interface GemmaProposal {
  schema_version: string;
  dependency: string;
  risk_summary: string;
  candidate_replacement: string;
  reasons: string[];
  proposed_migration_steps: string[];
  expected_api_differences: APIDifference[];
  relevant_source_locations: string[];
  potential_compatibility_problems: string[];
  suggested_tests: string[];
  estimated_migration_difficulty: string;
  confidence_explanation: string;
  assumptions_and_unknowns: string[];
}

export interface VerificationCheck {
  check_name: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'NOT_RUN' | 'AI_CLAIM_REJECTED' | 'UNVERIFIED';
  evidence: string;
  error_details?: string | null;
  limitations?: string | null;
  command_executed?: string | null;
  elapsed_seconds: number;
}

export interface VerificationReport {
  package_name: string;
  candidate_replacement: string;
  confidence_score: number;
  confidence_factors: Array<{ factor: string; score: number; status: string }>;
  checks: VerificationCheck[];
  rejected_claims: string[];
  unverified_claims: string[];
  unresolved_risks: string[];
}

export interface DependencyDetail {
  scan_id: string;
  package_name: string;
  declared_version?: string | null;
  category: string;
  risk_score: number;
  risk_breakdown: RiskBreakdown;
  pypi_metadata: PyPIMetadata;
  ast_usages: ASTUsage[];
  ai_recommendation?: {
    candidate_replacement: string;
    model_name: string;
    proposal: GemmaProposal;
    created_at: string;
  } | null;
  verification_checks: VerificationCheck[];
  approval?: {
    decision: 'APPROVED' | 'REJECTED' | 'PENDING';
    notes?: string | null;
    decided_at?: string;
  } | null;
  implementation_plan?: {
    plan_data: any;
    plan_markdown: string;
    ai_agent_prompt: string;
    created_at: string;
  } | null;
}

export interface CapsuleResponse {
  scan_id: string;
  created_at: string;
  capsule_version?: number;
  capsule_sha256?: string;
  previous_seal_sha256?: string | null;
  capsule_data: any;
  capsule_markdown: string;
  download_json_url: string;
  download_md_url: string;
}

export interface AgentVerification {
  agent_name: string;
  role: string;
  message_id: string;
  body: string;
  capsule_sha256?: string | null;
  created_at: string;
}

export interface AgentVerificationResponse {
  scan_id: string;
  requested: boolean;
  digest?: string | null;
  verifications: AgentVerification[];
}

export interface PostVerificationCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'NOT_RUN';
  details: string;
}

export interface PostVerificationRun {
  id?: number;
  scan_id: string;
  working_copy_path: string;
  diff_summary: string;
  status: string;
  checks: PostVerificationCheck[];
  report_markdown: string;
  created_at: string;
}

export interface SystemSettings {
  ai_provider: {
    configured: boolean;
    status_message: string;
    model: string;
    base_url: string;
    api_key_status: string;
    remote_inference_enabled: boolean;
  };
  execution_limits: {
    command_timeout_seconds: number;
    max_command_output_bytes: number;
    max_source_snippet_lines: number;
  };
  storage: {
    database_path: string;
    capsules_dir: string;
    temp_workspaces_dir: string;
  };
}

export interface VerificationCheckRecord {
  id: number;
  scan_id: string;
  package_name: string;
  check_name: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'NOT_RUN' | 'AI_CLAIM_REJECTED' | 'UNVERIFIED';
  evidence: string;
  error_details?: string | null;
  command_executed?: string | null;
  elapsed_seconds: number;
  created_at: string;
}

export interface ImplementationPlanSummary {
  scan_id: string;
  package_name: string;
  candidate_package: string;
  created_at: string;
  objective: string;
  files_count: number;
  steps_count: number;
  checks_count: number;
}

export interface SwitchAgent {
  id: string | null;
  name: string;
  role: string;
  display_name?: string | null;
  description: string;
  connector_type?: string | null;
  icon_url?: string | null;
  registered: boolean;
  status: 'live' | 'registered' | 'not_registered' | string;
  rooms: string[];
}

export interface SwitchRoom {
  id: string;
  name: string;
  description: string;
  bridge_type?: string | null;
  bridge_display_name?: string | null;
  external_channel_url?: string | null;
  agent_count: number;
  agent_statuses: Record<string, string>;
}

export interface SwitchStatus {
  available: boolean;
  gateway_url: string | null;
  error?: string;
  agents: unknown[];
  workforce: SwitchAgent[];
  rooms: SwitchRoom[];
}

export interface AuditLogEvent {
  type: 'scan' | 'ai_recommendation' | 'verification' | 'capsule_sealed' | 'approval' | string;
  scan_id: string;
  package_name?: string;
  timestamp: string;
  title: string;
  detail: string;
  status?: string;
  capsule_version?: number;
  capsule_sha256?: string;
  prev_sha256?: string | null;
}

export interface CapsuleHashVerification {
  scan_id: string;
  valid: boolean;
  version: number;
  stored_sha256: string;
  recomputed_sha256: string;
  versions: Array<{
    version: number;
    stored_sha256: string;
    recomputed_sha256: string;
    file_matches: boolean;
    prev_sha256?: string | null;
    chain_link_valid: boolean;
  }>;
}

export interface GitHubUser {
  username: string;
  name: string;
  avatar_url?: string;
}

export interface GitHubAuthStatus {
  configured: boolean;
  connected: boolean;
  user: GitHubUser | null;
  message: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  default_branch: string;
  language: string;
  updated_at: string;
}

export interface SwitchChatMessage {
  id?: string;
  seq?: number;
  roomId?: string;
  body: string;
  createdAt?: string;
  sender?: {
    clientId?: string;
    name?: string;
    kind?: string;
    agentId?: string;
    userId?: string;
  };
}

