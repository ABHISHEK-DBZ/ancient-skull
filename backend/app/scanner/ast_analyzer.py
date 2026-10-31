import ast
import os
from pathlib import Path
from typing import Dict, List, Set, Optional, Any, Tuple
from app.core.stdlib_list import is_stdlib_module
from app.scanner.package_mappings import map_import_to_package, normalize_package_name

class ASTUsageLocation:
    def __init__(
        self,
        file_path: str,
        line_number: int,
        imported_module: str,
        import_alias: Optional[str] = None,
        referenced_symbol: Optional[str] = None,
        call_expression: Optional[str] = None,
        enclosing_scope: Optional[str] = None,
        code_snippet: str = "",
        is_uncertain: bool = False,
        uncertainty_reason: Optional[str] = None
    ):
        self.file_path = file_path
        self.line_number = line_number
        self.imported_module = imported_module
        self.import_alias = import_alias
        self.referenced_symbol = referenced_symbol
        self.call_expression = call_expression
        self.enclosing_scope = enclosing_scope
        self.code_snippet = code_snippet
        self.is_uncertain = is_uncertain
        self.uncertainty_reason = uncertainty_reason

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "line_number": self.line_number,
            "imported_module": self.imported_module,
            "import_alias": self.import_alias,
            "referenced_symbol": self.referenced_symbol,
            "call_expression": self.call_expression,
            "enclosing_scope": self.enclosing_scope,
            "code_snippet": self.code_snippet,
            "is_uncertain": self.is_uncertain,
            "uncertainty_reason": self.uncertainty_reason
        }

class ScopeVisitor(ast.NodeVisitor):
    """AST visitor that tracks enclosing class/function scopes and parent nodes."""
    def __init__(self, rel_path: str, source_lines: List[str]):
        self.rel_path = rel_path
        self.source_lines = source_lines
        self.scope_stack: List[str] = []
        
        # Mapping from local alias/name in this file -> (top_level_module, imported_symbol)
        # e.g. "import requests as req" -> req: ("requests", None)
        # e.g. "from requests import get as fetch" -> fetch: ("requests", "get")
        self.imported_bindings: Dict[str, tuple[str, Optional[str]]] = {}
        
        # Captured usage locations
        self.usages: List[ASTUsageLocation] = []
        self.observed_modules: Set[str] = set()

    def _get_bounded_snippet(self, line_num: int, context: int = 2) -> str:
        """Extract a bounded snippet of code around line_num."""
        total = len(self.source_lines)
        start = max(0, line_num - 1 - context)
        end = min(total, line_num + context)
        snippet_lines = self.source_lines[start:end]
        return "\n".join(snippet_lines).strip()

    def _get_enclosing_scope(self) -> Optional[str]:
        return "::".join(self.scope_stack) if self.scope_stack else None

    def visit_ClassDef(self, node: ast.ClassDef):
        self.scope_stack.append(f"class {node.name}")
        self.generic_visit(node)
        self.scope_stack.pop()

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.scope_stack.append(f"def {node.name}")
        self.generic_visit(node)
        self.scope_stack.pop()

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self.scope_stack.append(f"async def {node.name}")
        self.generic_visit(node)
        self.scope_stack.pop()

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            mod_name = alias.name
            top_mod = mod_name.split(".")[0]
            self.observed_modules.add(top_mod)
            local_name = alias.asname or alias.name
            self.imported_bindings[local_name] = (top_mod, None)

            # Record import usage location
            snippet = self._get_bounded_snippet(node.lineno)
            self.usages.append(ASTUsageLocation(
                file_path=self.rel_path,
                line_number=node.lineno,
                imported_module=top_mod,
                import_alias=alias.asname,
                referenced_symbol=None,
                call_expression=f"import {alias.name}" + (f" as {alias.asname}" if alias.asname else ""),
                enclosing_scope=self._get_enclosing_scope(),
                code_snippet=snippet,
                is_uncertain=False
            ))
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        # Ignore relative imports for external dependency tracking (level > 0)
        if node.level and node.level > 0:
            self.generic_visit(node)
            return

        if not node.module:
            self.generic_visit(node)
            return

        top_mod = node.module.split(".")[0]
        self.observed_modules.add(top_mod)

        for alias in node.names:
            local_name = alias.asname or alias.name
            self.imported_bindings[local_name] = (top_mod, alias.name)

            snippet = self._get_bounded_snippet(node.lineno)
            self.usages.append(ASTUsageLocation(
                file_path=self.rel_path,
                line_number=node.lineno,
                imported_module=top_mod,
                import_alias=alias.asname,
                referenced_symbol=alias.name,
                call_expression=f"from {node.module} import {alias.name}" + (f" as {alias.asname}" if alias.asname else ""),
                enclosing_scope=self._get_enclosing_scope(),
                code_snippet=snippet,
                is_uncertain=False
            ))
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        # Detect calls on imported bindings (e.g. requests.get(), client.post(), fetch())
        call_expr_str = ""
        try:
            call_expr_str = ast.unparse(node.func)
        except Exception:
            call_expr_str = "call"

        # Check if the call function is an attribute or a direct name
        matched_binding = None
        ref_symbol = None

        if isinstance(node.func, ast.Attribute):
            # e.g., requests.get(...) -> value is Name(id='requests'), attr is 'get'
            # or client.session.get(...)
            curr = node.func
            attr_chain = []
            while isinstance(curr, ast.Attribute):
                attr_chain.append(curr.attr)
                curr = curr.value
            if isinstance(curr, ast.Name) and curr.id in self.imported_bindings:
                top_mod, imp_sym = self.imported_bindings[curr.id]
                ref_symbol = attr_chain[0] if attr_chain else None
                matched_binding = top_mod
        elif isinstance(node.func, ast.Name):
            # e.g., get(...) from "from requests import get"
            if node.func.id in self.imported_bindings:
                top_mod, imp_sym = self.imported_bindings[node.func.id]
                matched_binding = top_mod
                ref_symbol = imp_sym or node.func.id

        if matched_binding:
            snippet = self._get_bounded_snippet(node.lineno)
            self.usages.append(ASTUsageLocation(
                file_path=self.rel_path,
                line_number=node.lineno,
                imported_module=matched_binding,
                referenced_symbol=ref_symbol,
                call_expression=call_expr_str,
                enclosing_scope=self._get_enclosing_scope(),
                code_snippet=snippet,
                is_uncertain=False
            ))

        # Detect dynamic imports like __import__("...") or importlib.import_module("...")
        if isinstance(node.func, ast.Name) and node.func.id == "__import__":
            if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                dyn_mod = node.args[0].value.split(".")[0]
                self.observed_modules.add(dyn_mod)
                self.usages.append(ASTUsageLocation(
                    file_path=self.rel_path,
                    line_number=node.lineno,
                    imported_module=dyn_mod,
                    call_expression=call_expr_str,
                    enclosing_scope=self._get_enclosing_scope(),
                    code_snippet=self._get_bounded_snippet(node.lineno),
                    is_uncertain=True,
                    uncertainty_reason="Dynamic __import__() invocation"
                ))
        elif isinstance(node.func, ast.Attribute) and node.func.attr == "import_module":
            if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                dyn_mod = node.args[0].value.split(".")[0]
                self.observed_modules.add(dyn_mod)
                self.usages.append(ASTUsageLocation(
                    file_path=self.rel_path,
                    line_number=node.lineno,
                    imported_module=dyn_mod,
                    call_expression=call_expr_str,
                    enclosing_scope=self._get_enclosing_scope(),
                    code_snippet=self._get_bounded_snippet(node.lineno),
                    is_uncertain=True,
                    uncertainty_reason="Dynamic importlib.import_module() invocation"
                ))

        self.generic_visit(node)

def get_local_project_modules(repo_path: Path) -> Set[str]:
    """Detect local Python modules and packages in the repository to filter them out from third-party deps."""
    local_modules: Set[str] = set()
    roots = [repo_path]
    src_dir = repo_path / "src"
    if src_dir.is_dir():
        roots.append(src_dir)

    for base in roots:
        for item in base.iterdir():
            if item.name.startswith(".") or item.name in ["venv", ".venv", "node_modules", "build", "dist", "src"]:
                continue
            if item.is_file() and item.suffix == ".py":
                local_modules.add(item.stem)
            elif item.is_dir() and ((item / "__init__.py").exists() or any(item.glob("*.py"))):
                local_modules.add(item.name)
    return local_modules

def analyze_repository_ast(repo_path: Path | str) -> Tuple[Dict[str, List[ASTUsageLocation]], Set[str], List[str]]:
    """
    Walk all .py files in repo_path, parse AST, track scopes and usages.
    Returns:
    - usages_by_package: Dict[package_name, List[ASTUsageLocation]]
    - all_observed_packages: Set[package_name]
    - syntax_errors: List[str] describing unparseable files
    """
    repo = Path(repo_path).resolve()
    local_mods = get_local_project_modules(repo)
    usages_by_pkg: Dict[str, List[ASTUsageLocation]] = {}
    all_observed_packages: Set[str] = set()
    syntax_errors: List[str] = []

    excluded_dirs = {".git", ".venv", "venv", "node_modules", "build", "dist", "__pycache__", ".pytest_cache", ".eggs"}

    for root, dirs, files in os.walk(repo):
        dirs[:] = [d for d in dirs if d not in excluded_dirs and not d.startswith(".")]
        for file in files:
            if not file.endswith(".py"):
                continue
            file_path = Path(root) / file
            try:
                rel_path = str(file_path.relative_to(repo))
            except ValueError:
                rel_path = file_path.name

            try:
                content = file_path.read_text(encoding="utf-8", errors="replace")
                lines = content.splitlines()
                tree = ast.parse(content, filename=str(file_path))
                visitor = ScopeVisitor(rel_path, lines)
                visitor.visit(tree)

                for usage in visitor.usages:
                    top_mod = usage.imported_module
                    # Filter out stdlib and local project modules
                    if is_stdlib_module(top_mod) or top_mod in local_mods:
                        continue
                    pkg_name = map_import_to_package(top_mod)
                    if pkg_name:
                        usages_by_pkg.setdefault(pkg_name, []).append(usage)
                        all_observed_packages.add(pkg_name)

            except SyntaxError as se:
                syntax_errors.append(f"SyntaxError in {rel_path}:L{se.lineno} - {se.msg}")
            except Exception as e:
                syntax_errors.append(f"Error parsing {rel_path}: {str(e)}")

    return usages_by_pkg, all_observed_packages, syntax_errors
