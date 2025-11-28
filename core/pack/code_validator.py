"""
from __future__ import annotations

AI 생성 코드 보안 검증 시스템

LLM이 생성한 코드의 안전성을 검증하여 악의적 코드 실행을 방지합니다.
"""
import ast
from typing import Tuple, List
from pathlib import Path


class CodeSecurityError(ValueError):
    """코드 보안 위반 예외"""
    pass


class CodeValidator:
    """
    생성된 코드의 안전성을 검증하는 클래스

    위험한 import, 함수 호출, 파일 접근 등을 차단합니다.
    """

    # 위험한 import 패턴
    DANGEROUS_IMPORTS = [
        "os.system",
        "os.popen",
        "os.exec",
        "subprocess",
        "subprocess.call",
        "subprocess.run",
        "subprocess.Popen",
        "eval",
        "exec",
        "__import__",
        "compile",
        "builtins.eval",
        "builtins.exec",
        "builtins.__import__",
        "builtins.compile"
    ]

    # 위험한 함수 호출
    DANGEROUS_FUNCTIONS = [
        "eval",
        "exec",
        "compile",
        "__import__",
        "open",  # 파일 쓰기 제한 (읽기는 허용)
        "input",  # 사용자 입력 금지
        "raw_input",  # Python 2 호환
        "system",
        "popen",
        "call",
        "run"
    ]

    # 위험한 파일 경로 패턴
    DANGEROUS_PATHS = [
        "/etc/",
        "/usr/bin/",
        "/bin/",
        "/sbin/",
        "/sys/",
        "/proc/",
        "C:\\Windows\\",
        "C:\\System32\\"
    ]

    @classmethod
    def validate_code(cls, code: str) -> Tuple[bool, str]:
        """
        코드 안전성 검증

        Args:
            code: 검증할 코드 문자열

        Returns:
            (is_safe, error_message) 튜플
        """
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return False, f"Syntax error: {e}"

        errors = []

        # AST 노드 순회
        for node in ast.walk(tree):
            # Import 체크
            if isinstance(node, ast.Import):
                for alias in node.names:
                    import_name = alias.name
                    if any(dangerous in import_name for dangerous in cls.DANGEROUS_IMPORTS):
                        errors.append(f"Dangerous import: {import_name}")

            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    module_name = node.module
                    if any(dangerous in module_name for dangerous in cls.DANGEROUS_IMPORTS):
                        errors.append(f"Dangerous import from: {module_name}")

            # 함수 호출 체크
            elif isinstance(node, ast.Call):
                func_name = cls._get_function_name(node.func)
                if func_name in cls.DANGEROUS_FUNCTIONS:
                    errors.append(f"Dangerous function call: {func_name}")

            # 파일 경로 체크 (문자열 리터럴)
            elif isinstance(node, ast.Str):
                path_value = node.s
                if any(dangerous in path_value for dangerous in cls.DANGEROUS_PATHS):
                    errors.append(f"Dangerous file path: {path_value}")

            # f-string 체크
            elif isinstance(node, ast.JoinedStr):
                # f-string 내부의 표현식 체크는 복잡하므로 경고만
                pass

        if errors:
            return False, "; ".join(errors)

        return True, ""

    @classmethod
    def _get_function_name(cls, node: ast.AST) -> str:
        """
        함수 호출 노드에서 함수 이름 추출

        Args:
            node: AST 노드

        Returns:
            함수 이름
        """
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return node.attr
        elif isinstance(node, ast.Call):
            return cls._get_function_name(node.func)
        else:
            return ""

    @classmethod
    def validate_and_save(
        cls,
        code: str,
        file_path: Path,
        allow_overwrite: bool = False
    ) -> None:
        """
        코드 검증 후 안전한 경우에만 저장

        Args:
            code: 저장할 코드
            file_path: 저장 경로
            allow_overwrite: 기존 파일 덮어쓰기 허용 여부

        Raises:
            CodeSecurityError: 코드가 안전하지 않은 경우
            FileExistsError: 파일이 이미 존재하는 경우
        """
        # 파일 존재 체크
        if file_path.exists() and not allow_overwrite:
            raise FileExistsError(f"File already exists: {file_path}")

        # 코드 검증
        is_safe, error_message = cls.validate_code(code)

        if not is_safe:
            raise CodeSecurityError(
                f"Unsafe code detected:\n{error_message}\n\n"
                f"Code preview:\n{code[:500]}..."
            )

        # 안전한 코드만 저장
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(code)

    @classmethod
    def validate_file(cls, file_path: Path) -> Tuple[bool, str]:
        """
        파일의 코드 검증

        Args:
            file_path: 검증할 파일 경로

        Returns:
            (is_safe, error_message) 튜플
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
            return cls.validate_code(code)
        except Exception as e:
            return False, f"Failed to read file: {e}"



