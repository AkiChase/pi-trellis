"""Validate bootstrap Markdown, context references and preserved non-Trellis files."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.trellis/tasks/00-bootstrap-guidelines'
SPEC = ROOT / '.trellis/spec'
errors = []
files = sorted(SPEC.rglob('*.md'))
for file in files:
    text = file.read_text()
    for line_no, line in enumerate(text.splitlines(), 1):
        if line.rstrip() != line:
            errors.append(f'{file.relative_to(ROOT)}:{line_no}: trailing whitespace')
        if re.search(r'To be filled|TODO:\s*fill|\|\s*To fill\s*\||^\s*>?\s*To fill\s*$', line, re.I):
            errors.append(f'{file.relative_to(ROOT)}:{line_no}: unfilled template')
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', text):
        if target.startswith(('https:', 'http:', '#', 'mailto:')):
            continue
        path = target.split('#', 1)[0]
        if path and not (file.parent / path).exists():
            errors.append(f'{file.relative_to(ROOT)}: broken link {target}')
    # Verify backtick-quoted repository evidence, allowing directory/glob notation.
    for target in re.findall(r'`((?:lib|extensions|tests|scripts|docs|agents|licenses)/[^`\s]+)`', text):
        path = target.split('#', 1)[0].split(':', 1)[0]
        if any(c in path for c in '*{}<>'):
            continue
        if not (ROOT / path).exists():
            errors.append(f'{file.relative_to(ROOT)}: missing evidence path {target}')
for layer in ('extension', 'scripts', 'guides'):
    index = SPEC / layer / 'index.md'
    if not index.exists():
        errors.append(f'Missing {layer} index')
    else:
        text = index.read_text()
        for section in ('Pre-Development Checklist', 'Quality Check'):
            if section not in text:
                errors.append(f'{layer}/index.md missing {section}')
if (SPEC / 'frontend').exists():
    errors.append('Obsolete frontend layer remains')
for manifest in (ROOT / '.trellis/tasks').rglob('*.jsonl'):
    for line in manifest.read_text().splitlines():
        if not line.strip():
            continue
        entry = json.loads(line)
        if entry.get('file') and not (ROOT / entry['file']).exists():
            errors.append(f'{manifest.relative_to(ROOT)}: missing {entry["file"]}')
baseline = json.loads((TASK / 'research/outside-scope-baseline.json').read_text())
current = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
           for p in ROOT.rglob('*') if p.is_file()
           and '.git' not in p.relative_to(ROOT).parts
           and '.trellis' not in p.relative_to(ROOT).parts}
if baseline != current:
    for path in sorted(set(baseline) | set(current)):
        if baseline.get(path) != current.get(path):
            errors.append(f'Outside-scope change: {path}')
protected = json.loads((TASK / 'research/trellis-protected-baseline.json').read_text())
for path, digest in protected.items():
    file = ROOT / path
    if not file.exists() or hashlib.sha256(file.read_bytes()).hexdigest() != digest:
        errors.append(f'Protected Trellis file changed: {path}')
print(f'Checked {len(files)} spec documents, Markdown links, evidence paths, indexes, task manifests, {len(baseline)} non-Trellis and {len(protected)} protected Trellis file hashes.')
if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
print('PASS')
