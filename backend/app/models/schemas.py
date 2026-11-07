from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class StartScanRequest(BaseModel):
    repo_path: str = Field(..., description="Path to a local Python repository, or a public GitHub URL")
    run_ai: bool = Field(default=False, description="Whether to trigger Gemma 4 AI migration planning")

class StartScanResponse(BaseModel):
    scan_id: str
    status: str
    repo_path: str
    message: str

class DependencyItem(BaseModel):
    package_name: str
    declared_version: Optional[str]
    category: str
    risk_score: float
    risk_level: str
    usage_count: int

class ScanProgressResponse(BaseModel):
    scan_id: str
    status: str
    progress_pct: int
    current_step: str
    error_message: Optional[str] = None

class ApprovalRequest(BaseModel):
    package_name: str
    decision: str = Field(..., description="'APPROVED' or 'REJECTED'")
    notes: Optional[str] = None
    capsule_sha256: str = Field(..., description="SHA-256 of the exact capsule version the developer reviewed")
    capsule_version: int = Field(..., ge=1, description="Capsule version the developer reviewed")

class SwitchNotifyRequest(BaseModel):
    message: str
    room_id: Optional[str] = None

class VerificationRequest(BaseModel):
    package_name: str
    candidate_package: str
    run_live_tests: bool = True

class PlanRequest(BaseModel):
    package_name: str
    candidate_package: str

class PostVerifyRequest(BaseModel):
    working_copy_path: str
    target_package: str
    candidate_package: str
