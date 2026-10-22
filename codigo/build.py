#!/usr/bin/env python3
"""Build index.html (the page published as the Focus Tasks artifact) from src/.

src/page.html holds the markup with two placeholder lines, @@CSS@@ and @@JS@@.
Every src/css/*.css and src/js/*.js file is pasted in, in file-name order, so the
number prefix decides the order. The JS runs inside one (function(){ ... })()
written in page.html, and 990-init.js must stay last.

  python3 build.py           write index.html (and check the JS syntax with node)
  python3 build.py --check   exit 1 if index.html does not match src/ (nothing written)
"""
import pathlib, re, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
OUT = ROOT / 'index.html'


def parts(kind):
    files = sorted((SRC / kind).glob('*.' + kind))
    out = []
    for f in files:
        text = f.read_text(encoding='utf-8')
        if text and not text.endswith('\n'):
            text += '\n'
        out.append((f, text))
    return out


def build():
    page = (SRC / 'page.html').read_text(encoding='utf-8')
    css, js = parts('css'), parts('js')
    for mark, chunks in (('@@CSS@@\n', css), ('@@JS@@\n', js)):
        if page.count(mark) != 1:
            sys.exit(f'build: src/page.html needs exactly one {mark.strip()} line')
        page = page.replace(mark, ''.join(t for _, t in chunks))
    return page, js


def node_check(node, code):
    """node --check on code wrapped like page.html wraps it; returns (ok, message, line in code)."""
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as tmp:
        tmp.write('(function(){\n' + code + '})();\n')
    r = subprocess.run([node, '--check', tmp.name], capture_output=True, text=True)
    pathlib.Path(tmp.name).unlink()
    m = re.search(re.escape(tmp.name) + r':(\d+)', r.stderr)
    err = next((l for l in r.stderr.splitlines() if 'Error' in l), r.stderr.strip())
    return r.returncode == 0, err, (int(m.group(1)) - 1 if m else None)


def check_js(js):
    """Syntax-check the script; on an error, name the src/js file and line it comes from."""
    node = shutil.which('node')
    if not node:
        print('build: node not found, JS syntax not checked')
        return True
    if node_check(node, ''.join(t for _, t in js))[0]:
        return True
    # every file ends at a top-level statement, so each one also parses on its own
    for f, t in js:
        ok, err, line = node_check(node, t)
        if not ok:
            print(f'src/js/{f.name}' + (f':{line}' if line else '') + f': {err}')
    return False


def main():
    page, js = build()
    if '--check' in sys.argv:
        same = OUT.exists() and OUT.read_text(encoding='utf-8') == page
        print('index.html matches src/' if same else 'index.html differs from src/: run python3 build.py')
        sys.exit(0 if same else 1)
    if not check_js(js):
        sys.exit('build: JS syntax error, index.html not written')
    old = OUT.read_text(encoding='utf-8') if OUT.exists() else None
    if old == page:
        print(f'index.html already up to date ({len(page.encode())} bytes)')
    else:
        OUT.write_text(page, encoding='utf-8')
        print(f'wrote index.html ({len(page.encode())} bytes)')
    # a copy that opens on its own (double-click, any web host): the artifact adds these lines itself, a plain file needs them
    (ROOT / 'focus-tasks.html').write_text('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n</head><body>\n' + page + '\n</body></html>\n', encoding='utf-8')


if __name__ == '__main__':
    main()
