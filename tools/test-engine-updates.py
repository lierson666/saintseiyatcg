"""Contratos do atualizador; geração simulada, gravações somente em projeto temporário."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import threading
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('updates_test', ROOT / 'card-forge/engine_updates.py')
updates = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updates)


class Updates(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='test-engine-update-')
        self.root = Path(self.temporary.name)
        self.backend = updates.EngineUpdates(self.root, generator=self.proposal, validator=lambda job: [{'nome': 'Cenário de teste', 'ok': True, 'log': 'ok'}])
        real = updates.EngineUpdates(ROOT)
        for path, text in real.snapshot().items():
            target = self.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text)
        self.rules = (self.root / updates.RULES).read_text()
        self.cards = (self.root / 'data/cards.json').read_bytes()

    def tearDown(self):
        self.temporary.cleanup()

    def proposal(self, job):
        return {'resumo': 'Proposta de teste, sem geração externa.', 'cobertura': ['Inicialização preserva as mãos e o catálogo.'], 'pendencias': [], 'alteracoes': [
            {'arquivo': 'playtest/engine-v2.js', 'antes': '// Motor 2.1 independente do DOM.', 'depois': '// Motor independente do DOM, validado na cópia.'},
            {'arquivo': updates.EXTRA_TEST, 'antes': '', 'depois': "import test from 'node:test';import assert from 'node:assert/strict';import {createGame} from '../playtest/engine-v2.js';test('API do motor disponível',()=>assert.equal(typeof createGame,'function'));\n"}]}

    def start(self):
        result = self.backend.start({'revisao': updates.digest(self.rules), 'conteudo': self.rules})
        return self.wait(result['id'])

    def wait(self, job_id):
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            result = self.backend.status(job_id)
            if result['estado'] not in updates.RUNNING:
                return result
            time.sleep(.01)
        self.fail('Trabalho não concluiu dentro do prazo de teste.')

    def test_proposta_e_validacao_nao_gravam_o_motor(self):
        before = (self.root / 'playtest/engine-v2.js').read_text()
        result = self.start()
        self.assertEqual(result['estado'], 'proposta')
        self.assertIn('engine-v2.js', result['diff'])
        self.assertNotIn('snapshot', result)
        self.backend.validate(result['id'])
        self.assertEqual(self.wait(result['id'])['estado'], 'validado')
        self.assertEqual((self.root / 'playtest/engine-v2.js').read_text(), before)

    def test_aplica_so_proposta_testada_e_explicitamente_aprovada(self):
        job = self.start()
        with self.assertRaises(ValueError):
            self.backend.apply(job['id'], True)
        self.backend.validate(job['id']); self.wait(job['id'])
        with self.assertRaises(ValueError):
            self.backend.apply(job['id'], False)
        result = self.backend.apply(job['id'], True)
        self.assertEqual(result['estado'], 'aplicado')
        self.assertNotIn('originais', result)
        self.assertTrue(self.backend.info()['aplicado']['sincronizado'])
        self.assertEqual((self.root / 'data/cards.json').read_bytes(), self.cards)
        self.assertEqual((self.root / updates.RULES).read_text(), self.rules)
        self.assertIn('Motor atualizado pelo STAR HILL', (self.root / updates.CHANGELOG).read_text())

    def test_rejeita_livro_ainda_nao_aprovado(self):
        with self.assertRaisesRegex(ValueError, 'grave o texto'):
            self.backend.start({'revisao': updates.digest(self.rules), 'conteudo': self.rules + '\nRascunho'})

    def test_rejeita_caminhos_fora_da_lista_e_catalogo(self):
        source = {'snapshot': self.backend.snapshot()}
        for path in ['../fora.js', 'data/cards.json', updates.RULES, 'CARDS/teste.png', 'card-forge/serve.py']:
            proposal = self.proposal(source)
            proposal['alteracoes'][0]['arquivo'] = path
            with self.assertRaisesRegex(ValueError, 'não autorizado'):
                self.backend.prepare(source, proposal)

    def test_rejeita_ancoras_ambiguas_e_motor_sem_testes(self):
        source = {'snapshot': self.backend.snapshot()}
        proposal = self.proposal(source); proposal['alteracoes'][0]['antes'] = 'return'
        with self.assertRaisesRegex(ValueError, 'ambíguo'):
            self.backend.prepare(source, proposal)
        proposal = self.proposal(source); proposal['alteracoes'] = proposal['alteracoes'][:1]
        with self.assertRaisesRegex(ValueError, 'sem incluir testes'):
            self.backend.prepare(source, proposal)

    def test_falha_de_testes_e_pendencia_impedem_aplicacao(self):
        self.backend.validator = lambda job: [{'nome': 'Regressão', 'ok': False, 'log': 'Falhou'}]
        job = self.start(); self.backend.validate(job['id'])
        self.assertEqual(self.wait(job['id'])['estado'], 'testes_falharam')
        with self.assertRaises(ValueError):
            self.backend.apply(job['id'], True)
        self.backend.generator = lambda job: {**self.proposal(job), 'pendencias': [{'descricao': 'Decisão do autor necessária', 'bloqueante': True}]}
        self.backend.validator = lambda job: [{'nome': 'ok', 'ok': True, 'log': ''}]
        job = self.start(); self.backend.validate(job['id'])
        self.assertEqual(self.wait(job['id'])['estado'], 'bloqueado')
        with self.assertRaises(ValueError):
            self.backend.apply(job['id'], True)

    def test_edicao_concorrente_bloqueia_sobrescrita(self):
        job = self.start(); self.backend.validate(job['id']); self.wait(job['id'])
        path = self.root / 'playtest/engine-v2.js'
        path.write_text(path.read_text() + '\n// Edição posterior do autor.\n')
        with self.assertRaisesRegex(ValueError, 'projeto mudou'):
            self.backend.apply(job['id'], True)
        self.assertTrue(path.read_text().endswith('// Edição posterior do autor.\n'))

    def test_falha_na_gravacao_restaura_os_arquivos_anteriores(self):
        job = self.start(); self.backend.validate(job['id']); self.wait(job['id'])
        before = (self.root / 'playtest/engine-v2.js').read_text()
        def writer(path, data):
            if str(path).endswith(updates.EXTRA_TEST):
                raise OSError('Falha simulada')
            updates.write_file(path, data)
        self.backend.writer = writer
        with self.assertRaises(OSError):
            self.backend.apply(job['id'], True)
        self.assertEqual((self.root / 'playtest/engine-v2.js').read_text(), before)
        self.assertFalse((self.root / updates.EXTRA_TEST).exists())

    def test_falha_ao_salvar_recibo_restaura_codigo_e_selo(self):
        job = self.start(); self.backend.validate(job['id']); self.wait(job['id'])
        before = (self.root / 'playtest/engine-v2.js').read_bytes()
        stamp = self.backend.folder / 'aplicado.json'
        updates.write_file(stamp, b'{"anterior":true}')
        def writer(path, data):
            if path.name == job['id'] + '.json' and json.loads(data)['estado'] == 'aplicado':
                raise OSError('Falha no recibo final')
            updates.write_file(path, data)
        self.backend.writer = writer
        with self.assertRaises(OSError):
            self.backend.apply(job['id'], True)
        self.assertEqual((self.root / 'playtest/engine-v2.js').read_bytes(), before)
        self.assertEqual(stamp.read_bytes(), b'{"anterior":true}')
        self.assertEqual(self.backend.status(job['id'])['estado'], 'validado')

    def test_cancelamento_e_reinicio_nao_aplicam_trabalho(self):
        released = threading.Event()
        self.backend.generator = lambda job: (released.wait(2), self.proposal(job))[1]
        job = self.backend.start({'revisao': updates.digest(self.rules), 'conteudo': self.rules})
        self.backend.cancel(job['id']); released.set(); time.sleep(.05)
        self.assertEqual(self.backend.status(job['id'])['estado'], 'cancelado')
        self.assertFalse((self.root / updates.EXTRA_TEST).exists())
        path = self.backend.folder / (job['id'] + '.json')
        saved = json.loads(path.read_text()); saved['estado'] = 'gerando'; path.write_text(json.dumps(saved))
        other = updates.EngineUpdates(self.root)
        self.assertEqual(other.status(job['id'])['estado'], 'interrompido')

    @unittest.skipUnless(Path('/usr/bin/sandbox-exec').is_file() and updates.executable('node'), 'Requer sandbox do macOS e Node')
    def test_validacao_real_isola_arquivos_e_executa_cenarios(self):
        job = self.start()
        internal = self.backend.jobs[job['id']]
        canary = self.root / 'canario.txt'; canary.write_text('preservado')
        internal['candidatos'][updates.EXTRA_TEST] += "import fs from 'node:fs';test('Projeto original protegido',()=>{assert.throws(()=>fs.readFileSync(" + json.dumps(str(canary.resolve())) + "),{code:'EPERM'});assert.throws(()=>fs.writeFileSync(" + json.dumps(str(canary.resolve())) + ",'alterado'),{code:'EPERM'});});\n"
        results = self.backend.isolated_tests(internal)
        self.assertTrue(all(r['ok'] for r in results), results[-1]['log'])
        self.assertEqual(canary.read_text(), 'preservado')


if __name__ == '__main__':
    unittest.main()
