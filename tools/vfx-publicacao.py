#!/usr/bin/env python3
"""Confere a versão publicada das animações. Roda pelos testes, portanto trava o deploy se houver referência quebrada.

Uso: python3 tools/vfx-publicacao.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'card-forge'))
import star_hill  # noqa: E402
import vfx_publish  # noqa: E402

found = vfx_publish.check(builtin=star_hill.ANIM_EFFECTS)
if found:
    sys.exit('\n'.join(found))
print('ok')
