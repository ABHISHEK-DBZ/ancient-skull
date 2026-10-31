from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from packaging.version import Version, InvalidVersion
from app.metadata.pypi_client import extract_pinned_version

class RiskFactor:
    def __init__(self, name: str, score: float, description: str, evidence: Optional[str] = None):
        self.name = name
        self.score = round(score, 1)
        self.description = description
        self.evidence = evidence

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "score": self.score,
            "description": self.description,
            "evidence": self.evidence
        }

class RiskScoreReport:
    def __init__(
        self,
        package_name: str,
        overall_score: float,
        level: str,
        factors: List[RiskFactor],
        uncertainty: str,
        retrieval_timestamp: float
    ):
        self.package_name = package_name
        self.overall_score = round(min(100.0, max(0.0, overall_score)), 1)
        self.level = level  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        self.factors = factors
        self.uncertainty = uncertainty
        self.retrieval_timestamp = retrieval_timestamp

    def to_dict(self) -> Dict[str, Any]:
        return {
            "package_name": self.package_name,
            "overall_score": self.overall_score,
            "level": self.level,
            "factors": [f.to_dict() for f in self.factors],
            "uncertainty": self.uncertainty,
            "retrieval_timestamp": self.retrieval_timestamp
        }

def calculate_risk_score(metadata: Dict[str, Any], pinned_version: Optional[str] = None) -> RiskScoreReport:
    """
    Calculate an explainable, deterministic risk score (0-100) based on verified factors.
    """
    pkg_name = metadata.get("package_name", "unknown")
    timestamp = metadata.get("retrieval_timestamp", datetime.now(timezone.utc).timestamp())
    factors: List[RiskFactor] = []
    
    # If package was not found or has an error
    if not metadata.get("found", False):
        factors.append(RiskFactor(
            name="Missing PyPI Metadata",
            score=30.0,
            description="Package was not found on PyPI or network metadata query failed.",
            evidence=metadata.get("error") or "404 Not Found on PyPI"
        ))
        return RiskScoreReport(
            package_name=pkg_name,
            overall_score=30.0,
            level="MEDIUM",
            factors=factors,
            uncertainty="HIGH - Metadata unavailable to verify maintenance or release history.",
            retrieval_timestamp=timestamp
        )

    # 1. Yanked status
    if metadata.get("is_yanked", False):
        factors.append(RiskFactor(
            name="Yanked Release",
            score=40.0,
            description=f"Pinned release is yanked by author: {metadata.get('yanked_reason', 'Unspecified reason')}",
            evidence=f"https://pypi.org/project/{pkg_name}/"
        ))

    # 2. Release Age / Inactivity
    latest_rel_date = metadata.get("latest_release_date")
    if latest_rel_date:
        try:
            # Parse ISO or standard PyPI timestamp
            rel_dt = datetime.fromisoformat(latest_rel_date.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            days_since = (now_dt - rel_dt).days
            years_since = days_since / 365.25

            if years_since > 3.0:
                factors.append(RiskFactor(
                    name="Prolonged Inactivity (>3 years)",
                    score=30.0,
                    description=f"Last upstream release was {days_since} days ago ({rel_dt.strftime('%Y-%m-%d')}). Project may be abandoned.",
                    evidence=f"https://pypi.org/project/{pkg_name}/#history"
                ))
            elif years_since > 2.0:
                factors.append(RiskFactor(
                    name="Maintenance Inactivity (>2 years)",
                    score=20.0,
                    description=f"Last upstream release was {days_since} days ago ({rel_dt.strftime('%Y-%m-%d')}).",
                    evidence=f"https://pypi.org/project/{pkg_name}/#history"
                ))
            elif years_since > 1.0:
                factors.append(RiskFactor(
                    name="Infrequent Releases (>1 year)",
                    score=10.0,
                    description=f"Last upstream release was {days_since} days ago ({rel_dt.strftime('%Y-%m-%d')}).",
                    evidence=f"https://pypi.org/project/{pkg_name}/#history"
                ))
        except Exception:
            pass

    # 3. Version Lag
    clean_pinned = extract_pinned_version(pinned_version)
    latest_v_str = metadata.get("latest_version")
    if clean_pinned and latest_v_str:
        try:
            p_v = Version(clean_pinned)
            l_v = Version(latest_v_str)
            if l_v.major > p_v.major:
                major_diff = l_v.major - p_v.major
                pts = 25.0 if major_diff > 1 else 15.0
                factors.append(RiskFactor(
                    name=f"Major Version Lag ({major_diff} major version{'s' if major_diff > 1 else ''} behind)",
                    score=pts,
                    description=f"Pinned version {clean_pinned} is {major_diff} major version(s) behind latest release {latest_v_str}.",
                    evidence=f"https://pypi.org/project/{pkg_name}/"
                ))
            elif l_v.minor > p_v.minor:
                minor_diff = l_v.minor - p_v.minor
                if minor_diff >= 3:
                    factors.append(RiskFactor(
                        name="Multiple Minor Versions Lag",
                        score=10.0,
                        description=f"Pinned version {clean_pinned} is {minor_diff} minor versions behind latest release {latest_v_str}.",
                        evidence=f"https://pypi.org/project/{pkg_name}/"
                    ))
        except (InvalidVersion, TypeError):
            pass

    # 4. Python Version Requirements Deprecation
    req_py = metadata.get("requires_python")
    if req_py:
        # Check if project requires obsolete Python (e.g. <3.7) or explicitly prohibits modern Python
        if any(term in req_py for term in ["<3.7", "<=3.6", "==2.", "<3.0"]):
            factors.append(RiskFactor(
                name="Legacy Python Constraint",
                score=25.0,
                description=f"Package requires legacy Python version ({req_py}) and is likely incompatible with modern Python 3.12+ runtimes.",
                evidence=f"https://pypi.org/project/{pkg_name}/"
            ))

    # Calculate total
    total_score = sum(f.score for f in factors)
    clamped_score = min(100.0, max(0.0, total_score))

    if clamped_score >= 70.0:
        level = "CRITICAL"
    elif clamped_score >= 40.0:
        level = "HIGH"
    elif clamped_score >= 20.0:
        level = "MEDIUM"
    else:
        level = "LOW"

    uncertainty = "LOW - PyPI package metadata successfully verified."
    if not factors:
        uncertainty = "LOW - No major risk flags identified."

    return RiskScoreReport(
        package_name=pkg_name,
        overall_score=clamped_score,
        level=level,
        factors=factors,
        uncertainty=uncertainty,
        retrieval_timestamp=timestamp
    )
