"""IDENTITY & COMPLIANCE FORGE do STAR HILL (Identity & Payment Forge V1.0, autor 11/11/2026).

Lê e age no painel de conformidade do servidor do jogo (/api/admin/compliance). Usa a mesma ponte e a mesma sessão do
Nexus (nexus_proxy): destino fixo (produção ou localhost), senha não guardada, cookie só em memória. As permissões ficam
no servidor (só admin). Toda ação que muda algo exige `confirmar` igual ao host do destino e fica no admin_audit do servidor.
O servidor nunca devolve CPF completo (nem o guarda); este módulo só repassa.
"""
import re

NAME = re.compile(r'^[A-Za-z0-9_]{3,20}$')
ORDER = re.compile(r'^ord_[0-9a-f]{24}$')


def get(nexus, handler, path):
    if path == '/api/star-hill/compliance':
        return nexus.answer(handler, lambda: nexus.ok(*nexus.call('GET', '/api/admin/compliance', logged=True)))
    return handler.reply(404, {'erro': 'Rota de conformidade desconhecida.'})


def post(nexus, handler, path, body):
    def work():
        with nexus.lock:
            alvo = nexus.state['alvo']
        if body.get('confirmar') != nexus.host(alvo):
            raise ValueError(f'Confirme no botão a ação em {nexus.host(alvo)}.')
        action = path.rsplit('/', 1)[1]
        if action == 'identidade':
            user = str(body.get('usuario') or '')
            if not NAME.match(user) or body.get('acao') not in ('review', 'reject', 'release', 'approve'):
                raise ValueError('Jogador ou ação inválidos.')
            return nexus.ok(*nexus.call('POST', f'/api/admin/identity/{user}', {'action': body['acao'], 'evidence': body.get('evidencia')}, logged=True))
        if action == 'reembolso':
            order = str(body.get('pedido') or '')
            if not ORDER.match(order):
                raise ValueError('Pedido inválido.')
            return nexus.ok(*nexus.call('POST', f'/api/admin/payments/{order}/refund', {}, logged=True))
        if action == 'conciliar':
            return nexus.ok(*nexus.call('POST', '/api/admin/payments/reconcile', {}, logged=True))
        if action == 'liberar':
            user = str(body.get('usuario') or '')
            if not NAME.match(user):
                raise ValueError('Jogador inválido.')
            return nexus.ok(*nexus.call('DELETE', f'/api/admin/payments/holds/{user}', None, logged=True))
        raise KeyError('Rota de conformidade desconhecida.')
    return nexus.answer(handler, work)
