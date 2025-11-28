#!/usr/bin/env python3
import os
import sys
import subprocess
import chardet
from pathlib import Path

def check_encoding(file_path):
    with open(file_path, 'rb') as f:
        raw = f.read()
        result = chardet.detect(raw)
        return result['encoding'], result['confidence']

def find_non_utf8_files(root_dir):
    non_utf8 = []
    for path in Path(root_dir).rglob('*.py'):
        try:
            encoding, conf = check_encoding(str(path))
            if encoding and encoding.lower() != 'utf-8':
                non_utf8.append((str(path), encoding, conf))
        except Exception as e:
            non_utf8.append((str(path), 'error', 0))
    return non_utf8

def find_hidden_chars(file_path):
    with open(file_path, 'rb') as f:
        raw = f.read()
    # Look for BOM, non-breaking space, etc.
    issues = []
    if raw.startswith(b'\xef\xbb\xbf'):
        issues.append('BOM')
    if b'\xa0' in raw:
        issues.append('NBSP')
    if b'\r' in raw:
        issues.append('CR')
    return issues

def check_all_files(root_dir):
    print('--- Encoding Check ---')
    non_utf8 = find_non_utf8_files(root_dir)
    for path, enc, conf in non_utf8:
        print(f'Non-UTF8: {path} ({enc}, confidence={conf})')
    print('--- Hidden Char Check ---')
    for path in Path(root_dir).rglob('*.py'):
        issues = find_hidden_chars(str(path))
        if issues:
            print(f'Hidden chars in {path}: {issues}')

def check_python_packages():
    print('--- Package Check ---')
    try:
        import duckdb, chardet, pytest
        print('duckdb, chardet, pytest: OK')
    except ImportError as e:
        print(f'Missing package: {e}')

def check_line_endings(root_dir):
    print('--- Line Ending Check ---')
    for path in Path(root_dir).rglob('*.py'):
        with open(path, 'rb') as f:
            raw = f.read()
            if b'\r\n' in raw:
                print(f'CRLF line endings in {path}')

def main():
    root = os.path.dirname(os.path.abspath(__file__))
    check_all_files(root)
    check_python_packages()
    check_line_endings(root)
    print('--- Done ---')

if __name__ == '__main__':
    main()
