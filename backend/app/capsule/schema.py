from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class CapsuleEvidenceItem(BaseModel):
    claim: str
    classification: str = Field(
        ...,
        description="'observed' | 'executed' | 'ai_suggested_unverified' | 'verified' | 'inconclusive' | 'rejected' | 'not_run'"
    )
    evidence: str
    timestamp: float

class ExitCapsuleData(BaseModel):
    schema_version: str = Field(default="1.0.0")
    scan_id: str
    repository_path: str
    scan_timestamp: float
    tool_version: str = "1.0.0"
    dependency_inventory: Dict[str, Any]
    risk_assessments: List[Dict[str, Any]]
    ast_usage_locations: List[Dict[str, Any]]
    ai_recommendations: List[Dict[str, Any]]
    verification_checks: List[Dict[str, Any]]
    evidence_ledger: List[CapsuleEvidenceItem]
    rejected_ai_claims: List[str]
    unverified_claims: List[str]
    unresolved_risks: List[str]
    limitations: List[str]
    approval_state: Dict[str, str]
    confidence_score: float
    implementation_plan_ref: Optional[str] = None
    capsule_version: int = 1
    capsule_sha256: str = ""
    previous_seal_sha256: Optional[str] = None

    class Config:
        extra = "ignore"
