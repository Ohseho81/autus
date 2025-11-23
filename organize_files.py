#!/usr/bin/env python3
from pathlib import Path
import shutil

# 디렉토리 생성
dirs_to_create = [
    'docs/architecture',
    'docs/reports',
    'docs/planning',
    'docs/archive'
]

for d in dirs_to_create:
    Path(d).mkdir(parents=True, exist_ok=True)
    print(f"✅ Created: {d}/")

# 파일 이동 규칙
move_rules = {
    'docs/architecture/': ['ARCHITECTURE', 'ARMP'],
    'docs/reports/': ['STATUS', 'REPORT', 'CHECK', 'SUMMARY', 'FINAL'],
    'docs/planning/': ['ROADMAP', 'MILESTONE', 'NEXT', 'TASKS', 'IDEAL'],
    'docs/archive/': ['FOLDER_S', 'IMPLEMEN', 'FIXES', 'COMPLET']
}

# 유지할 파일
keep_in_root = ['README.md', 'CONSTITUTION.md']

# 파일 이동
md_files = list(Path('.').glob('*.md'))
moved_count = 0

for md_file in md_files:
    if md_file.name in keep_in_root:
        print(f"⭐ Keep: {md_file.name}")
        continue
    
    moved = False
    for target_dir, keywords in move_rules.items():
        if any(kw in md_file.name.upper() for kw in keywords):
            dest = Path(target_dir) / md_file.name
            shutil.move(str(md_file), str(dest))
            print(f"📦 Moved: {md_file.name} → {target_dir}")
            moved_count += 1
            moved = True
            break
    
    if not moved:
        dest = Path('docs/archive/') / md_file.name
        shutil.move(str(md_file), str(dest))
        print(f"📦 Moved: {md_file.name} → docs/archive/")
        moved_count += 1

print(f"\n✅ 총 {moved_count}개 파일 정리 완료!")
