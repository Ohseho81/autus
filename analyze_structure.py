#!/usr/bin/env python3
from pathlib import Path
from collections import defaultdict

exclude = {'.git', '__pycache__', '.venv311', 'node_modules'}
root = Path('.')
structure = defaultdict(list)

for item in root.rglob('*'):
    if any(exc in item.parts for exc in exclude):
        continue
    if item.is_file():
        ext = item.suffix or 'no_ext'
        structure[ext].append(item)

print("📊 AUTUS 파일 분석")
print("=" * 60)
for ext in sorted(structure.keys()):
    files = structure[ext]
    total_size = sum(f.stat().st_size for f in files)
    print(f"\n{ext}: {len(files)} files ({total_size:,} bytes)")
    for f in sorted(files)[:10]:
        size = f.stat().st_size
        print(f"  {f} ({size} bytes)")
    if len(files) > 10:
        print(f"  ... and {len(files) - 10} more")
