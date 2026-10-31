import re
from typing import Dict

# Standard PEP 503 normalization
def normalize_package_name(name: str) -> str:
    """Normalize package name according to PEP 503 (lowercase, dashes instead of underscores/dots)."""
    if not name:
        return ""
    return re.sub(r"[-_.]+", "-", name).lower().strip()

# Common mapping from Python top-level import name to PyPI distribution name
DEFAULT_IMPORT_TO_DISTRIBUTION: Dict[str, str] = {
    "pil": "pillow",
    "yaml": "pyyaml",
    "bs4": "beautifulsoup4",
    "cv2": "opencv-python",
    "sklearn": "scikit-learn",
    "dateutil": "python-dateutil",
    "jwt": "pyjwt",
    "dotenv": "python-dotenv",
    "serial": "pyserial",
    "magic": "python-magic",
    "fitz": "pymupdf",
    "multipart": "python-multipart",
    "docx": "python-docx",
    "pptx": "python-pptx",
    "usb": "pyusb",
    "openssl": "pyopenssl",
    "crypto": "pycryptodome",
    "git": "gitpython",
    "websocket": "websocket-client",
    "attr": "attrs",
    "markupsafe": "markupsafe",
    "jinja2": "jinja2",
    "sqlalchemy": "sqlalchemy",
    "psycopg2": "psycopg2-binary",
}

def map_import_to_package(import_name: str) -> str:
    """
    Map an observed import name to a canonical PyPI distribution name.
    If no special mapping exists, normalize the import name.
    """
    top_import = import_name.split(".")[0].strip().lower()

    if top_import in DEFAULT_IMPORT_TO_DISTRIBUTION:
        return normalize_package_name(DEFAULT_IMPORT_TO_DISTRIBUTION[top_import])
        
    return normalize_package_name(top_import)
