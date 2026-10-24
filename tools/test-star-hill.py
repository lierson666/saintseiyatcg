"""Contratos do backend STAR HILL; todas as gravações usam uma pasta temporária."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import wave
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('hill_test', ROOT / 'card-forge/star_hill.py')
hill = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hill)


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def wav():
    output = io.BytesIO()
    with wave.open(output, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(8000)
        w.writeframes(b'\0\0' * 80)
    return output.getvalue()


class Backend(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for path in [hill.CONFIG, hill.RULES, 'docs/CHANGELOG-regras.md', 'data/cards.json', 'data/presentation-schema.json']:
            write(self.root / path, (ROOT / path).read_bytes())
        config = json.loads((self.root / hill.CONFIG).read_text())
        # A biblioteca temporária inclui também os FX escolhidos pelo autor.
        for path in {config['audio']['menu'], config['audio']['inicio_batalha'], *config['audio']['playlist'],
                     *(p for p in config['audio']['efeitos'].values() if p)}:
            write(self.root / path, wav() if path.lower().endswith('.wav') else b'ID3' + b'\0' * 10)

    def tearDown(self):
        self.temp.cleanup()

    def propose(self):
        doc = hill.read_document('config', self.root)
        doc['conteudo']['visual']['hud'] = 110
        result = hill.preview({'tipo': 'config', 'revisao': doc['revisao'], 'conteudo': doc['conteudo']}, self.root)
        return result

    def test_preview_nao_grava(self):
        before = (self.root / hill.CONFIG).read_bytes()
        proposal = self.propose()
        self.assertIn('+    "hud": 110', proposal['diff'])
        self.assertEqual(before, (self.root / hill.CONFIG).read_bytes())

    def test_aprovacao_e_proposta_sao_obrigatorias(self):
        result = self.propose()
        with self.assertRaises(ValueError):
            hill.apply({'proposta': result['proposta']}, write, self.root)
        with self.assertRaises(ValueError):
            hill.apply({'confirmar': True, 'proposta': 'inexistente'}, write, self.root)

    def test_grava_somente_diff_aprovado_e_preserva_historico(self):
        proposal = self.propose()
        hill.apply({'confirmar': True, 'proposta': proposal['proposta'], 'conteudo': {'ignorar': True}}, write, self.root)
        self.assertEqual(hill.read_document('config', self.root)['conteudo']['visual']['hud'], 110)
        history = list((self.root / 'star-hill/historico').glob('*.json'))
        self.assertEqual(len(history), 1)
        self.assertEqual(json.loads(json.loads(history[0].read_text())['anterior_texto'])['visual']['hud'], 100)
        with self.assertRaises(ValueError):
            hill.apply({'confirmar': True, 'proposta': proposal['proposta']}, write, self.root)

    def test_concorrencia_nao_sobrescreve_mudanca_posterior(self):
        proposal = self.propose()
        path = self.root / hill.CONFIG
        path.write_text(path.read_text() + ' ')
        with self.assertRaises(ValueError):
            hill.apply({'confirmar': True, 'proposta': proposal['proposta']}, write, self.root)

    def test_documento_arbitrario_e_url_externa_sao_recusados(self):
        with self.assertRaises(ValueError):
            hill.read_document('../../data/cards.json', self.root)
        config = hill.read_document('config', self.root)['conteudo']
        config['audio']['menu'] = 'https://example.com/track.mp3'
        with self.assertRaises(ValueError):
            hill.validate_config(config, self.root)

    def test_campos_volumes_e_parametros_invalidos_sao_recusados(self):
        valid = hill.read_document('config', self.root)['conteudo']
        for path, value in [('volume_musica', 1.1), ('volume_fx', True), ('playlist', [])]:
            config = copy.deepcopy(valid)
            config['audio'][path] = value
            with self.assertRaises(ValueError):
                hill.validate_config(config, self.root)

    def test_upload_rejeita_conteudo_e_origem_invalidos(self):
        with self.assertRaises(ValueError):
            hill.upload(b'<html>arquivo falso</html>', 'fx.wav', 'autor', write, self.root)
        with self.assertRaises(ValueError):
            hill.upload(wav(), 'fx.wav', '../../fora', write, self.root)

    def test_zip_nao_escapa_da_pasta_e_importacao_repetida_nao_duplica(self):
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w') as z:
            z.writestr('../../fx.wav', wav())
            z.writestr('executar.py', 'nao executar')
        result = hill.upload(output.getvalue(), 'fx.zip', 'autor', write, self.root)
        hill.upload(output.getvalue(), 'fx.zip', 'autor', write, self.root)
        self.assertEqual(len(list((self.root / 'MUSIC/fx/autor').glob('*'))), 1)
        self.assertTrue(result['arquivos'][0].startswith('MUSIC/fx/autor/'))
        self.assertFalse((self.root / 'fx.wav').exists())

    def test_zip_invalido_nao_importa_parcialmente(self):
        before = {p.relative_to(self.root): p.read_bytes() for p in (self.root / 'MUSIC').rglob('*') if p.is_file()}
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w') as z:
            z.writestr('valido.wav', wav())
            z.writestr('falso.mp3', '<script>sem áudio</script>')
        with self.assertRaises(ValueError):
            hill.upload(output.getvalue(), 'fx.zip', 'autor', write, self.root)
        after = {p.relative_to(self.root): p.read_bytes() for p in (self.root / 'MUSIC').rglob('*') if p.is_file()}
        self.assertEqual(before, after)

    def test_regras_exigem_motivo_e_geram_changelog(self):
        doc = hill.read_document('regras', self.root)
        body = {'tipo': 'regras', 'revisao': doc['revisao'], 'conteudo': doc['conteudo'] + '\nNota de teste temporária.\n'}
        with self.assertRaises(ValueError):
            hill.preview(body, self.root)
        result = hill.preview({**body, 'motivo': 'Cenário isolado de teste.'}, self.root)
        hill.apply({'proposta': result['proposta'], 'confirmar': True}, write, self.root)
        self.assertIn('Cenário isolado de teste.', (self.root / 'docs/CHANGELOG-regras.md').read_text())

    def test_post_fora_da_origem_local_e_recusado(self):
        class Handler:
            headers = {'Origin': 'https://example.com', 'Host': '127.0.0.1:8765'}
            def reply(self, status, data):
                self.status = status
        handler = Handler()
        hill.post(handler, '/api/star-hill/apply', b'{}', write)
        self.assertEqual(handler.status, 403)

    def test_baralho_valido_e_limites_de_copias(self):
        config = hill.read_document('config', self.root)['conteudo']
        deck = {'id': 'rulebook2-athena', 'nome': 'Athena teste', 'faccao': 'Athena', 'god_id': 'athena-001', 'domain_id': 'athena-051', 'main_deck': [{'card_id': f'sst-01-{n:03}', 'quantity': 4} for n in range(1,16)]}
        config['baralhos'] = [deck]
        hill.validate_config(config, self.root)
        deck['main_deck'][0]['quantity'] = 5
        with self.assertRaises(ValueError):
            hill.validate_config(config, self.root)

    def test_falha_de_gravacao_nao_deixa_changelog_de_regra_nao_aplicada(self):
        doc = hill.read_document('regras', self.root)
        result = hill.preview({'tipo': 'regras', 'revisao': doc['revisao'], 'conteudo': doc['conteudo']+'\nTeste.\n', 'motivo': 'Teste de falha de disco.'}, self.root)
        before = (self.root / 'docs/CHANGELOG-regras.md').read_bytes()
        def fail(path, content):
            if path == self.root / hill.RULES:
                raise OSError('Falha simulada')
            write(path, content)
        with self.assertRaises(OSError):
            hill.apply({'proposta': result['proposta'], 'confirmar': True}, fail, self.root)
        self.assertEqual(before, (self.root / 'docs/CHANGELOG-regras.md').read_bytes())
        self.assertEqual(doc['conteudo'], (self.root / hill.RULES).read_text())

    def test_apresentacao_recusa_css_arbitrario_texto_dinamico_e_midias_externas(self):
        original = hill.read_document('config', self.root)['conteudo']
        invalid = [
            ('hud', {'desktop': {'desconhecido': {}}, 'mobile': {}}),
            ('hud', {'desktop': {'vantagem': {'texto': 'A sempre ganha'}}, 'mobile': {}}),
            ('hud', {'desktop': {'vantagem': {'escala': 20}}, 'mobile': {}}),
            ('hud', {'desktop': {'vantagem': {'fundo': 'url(javascript:alert(1))'}}, 'mobile': {}}),
            ('interacoes', {'efeito:dano': {'som': 'https://example.com/fx.mp3'}}),
            ('interacoes', {'efeito:dano': {'animacao': 'codigo'}}),
            ('pares', {'inexistente>sst-01-001': {'efeito:dano': {}}}),
        ]
        for key, value in invalid:
            config = copy.deepcopy(original)
            config['apresentacao'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                hill.validate_config(config, self.root)

    def test_layout_e_interacao_persistem_com_revisao_e_perfis_independentes(self):
        doc = hill.read_document('config', self.root)
        p = doc['conteudo']['apresentacao']
        p['hud']['desktop']['vantagem'] = {'posicionado': True, 'x': 15, 'y': 7, 'escala': 1.3}
        p['telas']['title'] = {'desktop': {'subtitulo': {'texto': 'Burn your Cosmo'}}}
        p['interacoes']['efeito:dano'] = {'animacao': 'shake', 'duracao': 900}
        p['pares']['sst-01-001>sst-01-002'] = {'efeito:dano': {'som': None}}
        proposal = hill.preview({'tipo': 'config', 'revisao': doc['revisao'], 'conteudo': doc['conteudo']}, self.root)
        hill.apply({'confirmar': True, 'proposta': proposal['proposta']}, write, self.root)
        saved = hill.read_document('config', self.root)['conteudo']['apresentacao']
        self.assertEqual(saved, p)
        self.assertEqual(saved['hud']['mobile'], {})

    def test_upload_visual_nao_aceita_svg_html_ou_falsa_assinatura(self):
        for content, name in [(b'<svg></svg>', 'fx.svg'), (b'<html></html>', 'fx.png')]:
            with self.assertRaises(ValueError):
                hill.upload(content, name, 'autor', write, self.root)
        data = b'GIF89a' + bytes(40)
        result = hill.upload(data, '../../cosmo.gif', 'autor', write, self.root)
        self.assertTrue(result['arquivo'].startswith('star-hill/assets/'))
        self.assertEqual((self.root / result['arquivo']).read_bytes(), data)
        self.assertTrue(any(a['grupo'] == 'visual' for a in hill.catalog(self.root)))
        config = hill.read_document('config', self.root)['conteudo']
        config['apresentacao']['hud']['desktop']['fundo'] = {'imagem': result['arquivo']}
        hill.validate_config(config, self.root)
        config['apresentacao']['hud']['desktop']['fundo']['imagem'] = 'https://example.com/fundo.png'
        with self.assertRaises(ValueError):
            hill.validate_config(config, self.root)

    def test_abertura_nao_pode_voltar_na_playlist_aleatoria(self):
        config = hill.read_document('config', self.root)['conteudo']
        config['audio']['playlist'].append(config['audio']['inicio_batalha'])
        with self.assertRaises(ValueError):
            hill.validate_config(config, self.root)


if __name__ == '__main__':
    unittest.main()
