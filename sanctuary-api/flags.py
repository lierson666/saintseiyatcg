"""Chaves do servidor (Identity & Payment Forge V1.0, autor 11/11/2026). Todas começam desligadas.

Cada chave liga com a variável de ambiente SANCTUARY_<NOME>=1 no servidor. O navegador só lê o estado
(GET /api/flags); quem decide é sempre o servidor, a cada pedido.
"""
import os

FLAGS = ('AGE_GATE_REQUIRED', 'IDENTITY_VERIFICATION_ENABLED', 'PAYMENTS_ENABLED',
         'MERCADO_PAGO_ENABLED', 'GOOGLE_PLAY_BILLING_ENABLED', 'RANDOM_BOOSTERS_PURCHASABLE')


def on(name):
    assert name in FLAGS, name
    return os.environ.get(f'SANCTUARY_{name}') == '1'


def snapshot():
    return {name: on(name) for name in FLAGS}
