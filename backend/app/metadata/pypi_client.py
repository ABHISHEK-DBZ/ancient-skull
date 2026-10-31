import httpx
import time
from typing import Dict, Any, Optional
from packaging.specifiers import InvalidSpecifier, SpecifierSet
from packaging.version import Version, InvalidVersion
from app.scanner.package_mappings import normalize_package_name

# Simple in-memory cache with timestamp
_METADATA_CACHE: Dict[str, tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour


def extract_pinned_version(version_spec: Optional[str]) -> Optional[str]:
    """Return the exact version of a '==' specifier, or None for ranges.

    A range such as '>=2,<3' has no single pinned release, so version-lag
    scoring must not treat the first number as a pin.
    """
    if not version_spec:
        return None
    try:
        specifiers = SpecifierSet(version_spec.strip())
    except InvalidSpecifier:
        return None
    for spec in specifiers:
        if spec.operator in ("==", "===") and not spec.version.endswith(".*"):
            return spec.version
    return None

def fetch_pypi_metadata(package_name: str, pinned_version: Optional[str] = None, timeout: float = 6.0) -> Dict[str, Any]:
    """
    Fetch package metadata from PyPI JSON API.
    Handles network errors, 404, rate limits, and caches responses.
    """
    norm_name = normalize_package_name(package_name)
    now = time.time()
    
    # Check cache
    if norm_name in _METADATA_CACHE:
        cached_time, cached_data = _METADATA_CACHE[norm_name]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_data

    url = f"https://pypi.org/pypi/{norm_name}/json"
    result: Dict[str, Any] = {
        "package_name": norm_name,
        "found": False,
        "latest_version": None,
        "pinned_version": pinned_version,
        "latest_release_date": None,
        "pinned_release_date": None,
        "is_yanked": False,
        "yanked_reason": None,
        "requires_python": None,
        "license": None,
        "summary": None,
        "project_urls": {},
        "github_url": None,
        "total_releases": 0,
        "retrieval_timestamp": now,
        "error": None
    }

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code == 404:
                result["error"] = "Package not found on PyPI (404)"
                _METADATA_CACHE[norm_name] = (now, result)
                return result
            elif resp.status_code != 200:
                result["error"] = f"PyPI API returned HTTP {resp.status_code}"
                return result

            data = resp.json()
            info = data.get("info", {})
            releases = data.get("releases", {})

            result["found"] = True
            result["latest_version"] = info.get("version")
            result["requires_python"] = info.get("requires_python")
            result["license"] = info.get("license")
            result["summary"] = info.get("summary")
            result["project_urls"] = info.get("project_urls") or {}
            result["total_releases"] = len(releases)

            # Detect GitHub URL from project_urls or home_page
            for url_key, url_val in result["project_urls"].items():
                if url_val and "github.com" in url_val.lower():
                    result["github_url"] = url_val
                    break
            if not result["github_url"] and info.get("home_page") and "github.com" in info.get("home_page", "").lower():
                result["github_url"] = info.get("home_page")

            # Check latest release upload date
            latest_v = result["latest_version"]
            if latest_v and latest_v in releases and releases[latest_v]:
                result["latest_release_date"] = releases[latest_v][0].get("upload_time_iso_8601") or releases[latest_v][0].get("upload_time")

            # Check pinned version metadata & yanked status
            clean_pinned = extract_pinned_version(pinned_version)
            if clean_pinned:
                if clean_pinned in releases:
                    rel_files = releases[clean_pinned]
                    if rel_files:
                        result["pinned_release_date"] = rel_files[0].get("upload_time_iso_8601") or rel_files[0].get("upload_time")
                        if any(f.get("yanked", False) for f in rel_files):
                            result["is_yanked"] = True
                            yanked_reasons = [f.get("yanked_reason") for f in rel_files if f.get("yanked_reason")]
                            result["yanked_reason"] = yanked_reasons[0] if yanked_reasons else "Yanked on PyPI"

            _METADATA_CACHE[norm_name] = (now, result)
            return result

    except httpx.TimeoutException:
        result["error"] = "PyPI API request timed out"
        return result
    except Exception as e:
        result["error"] = f"Network or parsing error: {str(e)}"
        return result
