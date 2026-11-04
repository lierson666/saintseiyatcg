#!/usr/bin/env python3
"""A trava do registro: animação nova, de qualquer tipo, não passa sem controle ou motivo escrito."""
import importlib.util
import tempfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('inventario', Path(__file__).with_name('vfx-inventario.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)

with tempfile.TemporaryDirectory() as folder:
    inv.ROOT = Path(folder)
    inv.adapter_sheets = dict
    samples = {
        'a.css': '@keyframes giro { to { rotate: 1turn } }', 'b.css': '.x { transition: opacity .2s }', 'c.js': "el.style.transition = 'all 1s'; el.style.animation = 'x 1s';",
        'd.js': 'requestAnimationFrame(tick);', 'e.js': 'el.animate([], 100);', 'f.js': "c.getContext('2d');", 'g.html': '<svg><animateTransform attributeName="transform"/></svg>',
        'h.svg': '<svg><animate attributeName="r"/></svg>', 'i.js': 'document.startViewTransition(go);', 'j.js': 'gsap.to(el, {x: 1});', 'k.js': 'new THREE.Mesh();', 'quieto.js': 'const a = 1;',
    }
    for name, text in samples.items():
        (inv.ROOT / name).write_text(text)
    rows, _ = inv.source(sorted(samples))
    found = {r['arquivos'][0] for r in rows}
    assert found == set(samples) - {'quieto.js'}, found
    assert all(r['estado'] == 'legado' and not r['migrada'] for r in rows)

    # Refazer o registro não aceita: só a dívida antiga e os outros estados passam.
    old, new = rows[0]['id'], rows[1]['id']
    assert inv.undecided(rows[:2], [old]) == [new]
    assert inv.undecided(rows[:2], [old, new]) == []
    assert inv.undecided([{'id': 'x', 'estado': 'excecao'}, {'id': 'y', 'estado': 'parcial'}], []) == []

    # Todos os critérios, menos aparecer no Forge, não é migrada.
    assert not inv.row('r', 'n', 'c', 't', ['a.css'], ok=inv.ALL)['migrada']
    assert inv.row('r', 'n', 'c', 't', ['a.css'], aba='efeitos', ok=inv.ALL)['migrada']
print('ok')
