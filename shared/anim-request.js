// Gerador de animação, no molde do gerador de arte (card-forge/art-prompt.js): o autor escolhe os parâmetros e gera aqui mesmo,
// pelo Claude deste Mac (card-forge/vfx_generate.py), com o preview na mesma tela. O efeito vai para o banco; carta e momento são opcionais.
import {presentationRules} from './card-text.js';

const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export const FACTION_COLOR = {Athena: '#e0bb62', Poseidon: '#68bad1', Hades: '#a064ff', Ares: '#dd5a4c', Artemis: '#a9c9b3', Neutral: '#bcb7ac'};

// [campo, rótulo, [[valor, texto]...]]. O primeiro valor é o padrão. Valor vazio: fica a critério do editor e não entra no pedido.
export const SECTIONS = [
  ['Como toca', [
    ['momento', 'Uso sugerido', [['', 'Qualquer momento'], ['golpe', 'Golpe do Strike'], ['impacto', 'Impacto em Devotee'], ['impacto_deus', 'Impacto no Deus'], ['carga', 'Carga do golpe'], ['declarar', 'Ao declarar ataque'], ['strike', 'Ao receber Strike'], ['dano', 'Dano em Devotee'], ['entrada', 'Entrada no campo'], ['cast', 'Ao conjurar'], ['retorno', 'Volta do Tartarus'], ['morte', 'Ao morrer'], ['habilidade', 'Habilidade'], ['ultimate', 'Ultimate'], ['arte', 'Na arte da carta (viva)']]],
    ['trajeto', 'Posição', [['alvo', 'No alvo'], ['origem', 'Sai do atacante'], ['viagem', 'Viaja do atacante até o alvo'], ['ambos', 'Sai do atacante e explode no alvo'], ['mesa', 'Ocupa a mesa inteira']]],
    ['escala', 'Tamanho na mesa', [['carta', 'Do tamanho da carta'], ['menor', 'Menor que a carta'], ['maior', 'Passa da carta'], ['duas', 'Cobre as duas cartas'], ['mesa', 'Mesa inteira']]],
  ]],
  ['Efeito', [
    ['tipo', 'Tipo', [['golpe', 'Golpe físico'], ['impacto', 'Impacto'], ['explosao', 'Explosão'], ['projetil', 'Projétil'], ['fogo', 'Fogo'], ['gelo', 'Gelo'], ['raio', 'Raio'], ['veneno', 'Veneno'], ['luz', 'Luz'], ['trevas', 'Trevas'], ['cura', 'Cura'], ['aura', 'Aura'], ['escudo', 'Escudo'], ['energia', 'Energia'], ['magia', 'Magia'], ['clima', 'Água e vento'], ['outro', 'Outro']]],
    ['forma', 'Forma', [['', 'A critério do editor'], ['corte em crescente', 'Corte em crescente'], ['cortes cruzados', 'Cortes cruzados'], ['rajada de muitos pontos', 'Rajada de muitos pontos'], ['raio reto', 'Raio reto'], ['anel que se abre', 'Anel que se abre'], ['onda', 'Onda'], ['espiral', 'Espiral'], ['pilar vertical', 'Pilar vertical'], ['chuva de cima', 'Chuva de cima'], ['constelação que se liga', 'Constelação que se liga'], ['círculo mágico', 'Círculo mágico'], ['punho de energia', 'Punho de energia']]],
    ['estilo', 'Estilo', [['Sprite Fusion', 'Sprite Fusion'], ['PixelFX', 'PixelFX'], ['o melhor dos dois', 'O melhor dos dois']]],
  ]],
  ['Tempo', [
    ['duracao', 'Duração', [['0,8 s', 'Normal, 0,8 s'], ['0,4 s', 'Rápida, 0,4 s'], ['1,5 s', 'Longa, 1,5 s'], ['2,5 s', 'Ultimate, 2,5 s']]],
    ['ritmo', 'Ritmo', [['entra rápido e sai devagar', 'Rápido e some devagar'], ['carrega devagar e solta de uma vez', 'Carrega e solta'], ['golpes em sequência', 'Golpes em sequência'], ['constante, em loop', 'Constante, em loop']]],
    ['pausa', 'Congelar no impacto', [['', 'Não'], ['curta, 0,08 s', 'Curto'], ['longa, 0,2 s', 'Longo']]],
  ]],
  ['Cor e detalhe', [
    ['brilho', 'Brilho', [['médio', 'Médio'], ['discreto', 'Discreto'], ['forte', 'Forte']]],
    ['particulas', 'Partículas', [['médias', 'Médias'], ['poucas', 'Poucas'], ['muitas', 'Muitas']]],
    ['restos', 'O que sobra', [['', 'Nada'], ['faíscas', 'Faíscas'], ['fumaça', 'Fumaça'], ['penas', 'Penas'], ['cristais', 'Cristais'], ['gotas', 'Gotas'], ['pétalas', 'Pétalas'], ['estrelas', 'Estrelas'], ['cinzas', 'Cinzas']]],
    ['tremor', 'Tremor na mesa', [['', 'Não'], ['leve', 'Leve'], ['forte', 'Forte']]],
  ]],
];
const FIELDS = SECTIONS.flatMap(([, list]) => list);
const label = (name, value) => FIELDS.find(f => f[0] === name)[2].find(o => o[0] === value)?.[1] || value;

export const abilitiesOf = card => {
  try { return presentationRules(card).map(t => String(t.text ?? t).split(/\s[—-]\s|[.:]/)[0].trim()).filter(t => t && t.length <= 60); } catch { return []; }
};
export const defaultRequest = card => ({
  ...Object.fromEntries(FIELDS.map(([name, , options]) => [name, options[0][0]])),
  nome: '', habilidade: '', cor: FACTION_COLOR[card?.faccao] || FACTION_COLOR.Athena, cor2: '#ffffff', referencias: '', notas: '', versoes: '1',
});

// O texto que vai para a conversa. Só o que o autor escolheu; o caminho final é sempre rascunho, nunca a carta direto.
export function buildRequest(card, p) {
  const line = (title, value) => (value ? `- ${title}: ${value}\n` : '');
  const cardBlock = card ? `\nCARTA DE INSPIRAÇÃO (não ligar a ela)
${line('Nome', card.nome_exibicao_pt || card.nome_exibicao_en || card.id)}${line('Id', card.id)}${line('Facção', card.faccao)}${line('Tipo', [card.tipo, ...(card.subtipos || [])].filter(Boolean).join(', '))}${line('Arte', card.ilustracao && `card-forge/art-web/ (${card.ilustracao})`)}${line('Habilidade', p.habilidade)}` : '';
  return `Crie uma animação para o banco de efeitos do Saint Seiya TCG, com a skill pixelfx.
${cardBlock}
ANIMAÇÃO
${line('Nome', p.nome)}${line('Uso sugerido', p.momento && label('momento', p.momento))}- Posição: ${label('trajeto', p.trajeto)}
- Tamanho na mesa: ${label('escala', p.escala)}
- Tipo: ${label('tipo', p.tipo)}
${line('Forma', p.forma)}- Estilo: ${p.estilo}
- Duração: ${p.duracao}
- Ritmo: ${p.ritmo}
${line('Congelar no impacto', p.pausa)}- Cor principal: ${p.cor}
- Cor secundária: ${p.cor2}
- Brilho: ${p.brilho}
- Partículas: ${p.particulas}
${line('O que sobra', p.restos)}${line('Tremor na mesa', p.tremor)}- Versões para comparar: ${p.versoes}
${p.referencias ? `\nREFERÊNCIAS\n${p.referencias}\n` : ''}${p.notas ? `\nOBSERVAÇÕES\n${p.notas}\n` : ''}
COMO ENTREGAR
- Visão do jogador: minha carta embaixo e a do oponente em cima. Na mesa de 1280×720, a carta em campo tem cerca de 115×100 px.
- Use efeito pronto parecido da biblioteca, se houver. Só crie do zero se não houver. Renderize, olhe e ajuste até parecer feito à mão.
- Não copie personagem, logo ou sprite de outro jogo: use a referência para movimento, cor e ritmo.
- Entregue com tools/vfx-criar.mjs. O efeito fica no banco, sem ligar a nenhuma carta ou momento.
`;
}

const storeKey = id => `anim-pedido:${id || 'banco'}`;
const recall = (card) => { try { return JSON.parse(localStorage.getItem(storeKey(card?.id))) || {}; } catch { return {}; } };
const remember = (card, p) => { try { localStorage.setItem(storeKey(card?.id), JSON.stringify(p)); } catch { /* sem armazenamento: só não lembra as escolhas */ } };

const post = async (path, body = {}) => {
  const r = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.erro || `Falha ${r.status}`);
  return data;
};
const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
// Toca a folha em loop sobre a carta, na proporção da mesa: o maior lado do efeito tem 1,35 vez a altura da carta (sheetFx em pixel-vfx.js).
function playSheet(canvas, e) {
  const g = canvas.getContext('2d'), img = new Image(), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cardH = canvas.height * .62, k = cardH * 1.35 / Math.max(e.w, e.h), dw = e.w * k, dh = e.h * k;
  const paint = n => { g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingEnabled = false; g.drawImage(img, (n % e.cols) * e.w, Math.floor(n / e.cols) * e.h, e.w, e.h, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh); };
  img.onload = () => {
    if (still) return paint(Math.floor(e.quadros / 2));
    const from = performance.now();
    const step = at => { if (!canvas.isConnected) return; paint(Math.floor((at - from) / 1000 * e.fps) % e.quadros); requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  img.src = `/playtest/divine/vfx/${e.arquivo.split('/').pop()}`;
}

// `card` é opcional: sem carta, o efeito é só para o banco. `cards`: cartas que o formulário oferece. `onTest(id)`: testar na mesa; `onChange()`: o banco mudou.
export function openAnimRequest({card = null, cards = card ? [card] : [], onTest = null, onChange = null}) {
  if (!document.querySelector('link[data-anim-request]')) {
    const css = Object.assign(document.createElement('link'), {rel: 'stylesheet', href: '/shared/anim-request.css'});
    css.dataset.animRequest = '1';
    document.head.append(css);
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'ar-dialog';
  document.body.append(dialog);
  let current = card, params = {...defaultRequest(current), ...recall(current)};

  const select = (name, title, options) => `<label>${title}<select name="${name}">${options.map(([v, t]) => `<option value="${esc(v)}"${v === params[name] ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  function draw() {
    const abilities = abilitiesOf(current);
    dialog.innerHTML = `<form method="dialog" class="ar"><h2>Gerar animação para o banco de efeitos</h2>
      <section class="ar-result" hidden></section>
      <div class="ar-grid"><div class="ar-fields">
        <div class="ar-wide"><label>Nome do efeito<input name="nome" value="${esc(params.nome)}" placeholder="Ex.: Meteoro de Pégaso"></label></div>
        <div class="ar-wide">${select('carta', 'Carta de inspiração (opcional)', [['', 'Nenhuma: só para o banco de efeitos'], ...cards.map(c => [c.id, `${c.nome_exibicao_pt || c.nome_exibicao_en || c.id} · ${c.id}`])])}</div>
        ${SECTIONS.map(([title, list]) => `<h3 class="ar-section">${esc(title)}</h3>${list.map(f => select(...f)).join('')}`).join('')}
        ${abilities.length ? select('habilidade', 'Habilidade', [['', 'Nenhuma'], ...abilities.map(a => [a, a])]) : ''}
        <label>Cor principal<input type="color" name="cor" value="${esc(params.cor)}"></label>
        <label>Cor secundária<input type="color" name="cor2" value="${esc(params.cor2)}"></label>
        ${select('versoes', 'Versões', [['1', '1'], ['3', '3'], ['5', '5']])}
        <div class="ar-wide"><label>Referências visuais<input name="referencias" value="${esc(params.referencias)}" placeholder="Links ou o que olhar nas imagens que você anexar"></label></div>
        <div class="ar-wide"><label>Observações<input name="notas" value="${esc(params.notas)}" placeholder="Algo mais para a animação"></label></div>
      </div><label class="ar-out">Pedido (pode editar)<textarea name="pedido" rows="22" spellcheck="false" translate="no"></textarea></label></div>
      <p class="ar-hint">O Claude deste Mac gera aqui mesmo, usando sua conta. Pode levar alguns minutos. Nada liga a uma carta: o resultado fica como rascunho até você guardar.</p>
      <div class="ar-row"><button type="button" class="ar-go" data-ar="gerar">Gerar animação</button><button type="button" data-ar="copy">Copiar pedido</button><button type="button" data-ar="close">Fechar</button><output aria-live="polite"></output></div></form>`;
    dialog.querySelector('[name=carta]').value = current?.id || '';
    refresh();
  }
  const refresh = () => { dialog.querySelector('[name=pedido]').value = buildRequest(current, params); };
  const say = text => { dialog.querySelector('output').textContent = text; };
  // Volta a mostrar a geração em andamento ou a última, mesmo com o formulário reaberto.
  let timer = 0, shown = '';
  async function poll() {
    clearTimeout(timer);
    if (!dialog.isConnected) return;
    const job = await fetch('/api/star-hill/vfx-gerar', {cache: 'no-store'}).then(r => r.json()).catch(() => null);
    const area = dialog.querySelector('.ar-result'), go = dialog.querySelector('[data-ar=gerar]');
    if (!job || job.estado === 'livre') return;
    go.disabled = job.estado === 'rodando';
    if (job.estado === 'rodando') {
      area.hidden = false; shown = '';
      area.innerHTML = `<div class="ar-progress"><b>${esc(job.etapa)}…</b><span>${clock(job.segundos)}</span><button type="button" data-ar="cancelar">Cancelar</button></div>`;
      timer = setTimeout(poll, 1500);
      return;
    }
    if (shown !== job.id) { shown = job.id; await showResult(job); }
  }
  async function showResult(job) {
    const area = dialog.querySelector('.ar-result');
    const catalog = await fetch('/data/vfx-catalog.json', {cache: 'no-store'}).then(r => r.json()).catch(() => ({efeitos: []}));
    const list = job.efeitos.map(id => catalog.efeitos.find(e => e.id === id)).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    const note = job.mensagem.replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();
    area.hidden = false;
    const art = current ? `style="background-image:url('/card-forge/art-web/${esc(current.id)}.jpg')"` : '';
    area.innerHTML = `${note ? `<p class="ar-note${job.estado === 'pronto' ? '' : ' is-error'}">${esc(note)}</p>` : ''}<div class="ar-previews">${list.map(e => `<article data-fx="${esc(e.id)}"><div class="ar-stage"><i class="ar-card" ${art}></i><canvas width="360" height="300"></canvas></div>
      <b>${esc(e.nome)}</b><small>${e.quadros} quadros · ${e.fps} fps · ${(e.quadros / e.fps).toFixed(2).replace('.', ',')} s · ${e.w}×${e.h} · ${e.rascunho ? (e.estado === 'teste' ? 'testado' : 'rascunho') : 'no banco'}</small>
      <div class="ar-row">${onTest ? '<button type="button" data-ar="testar">Testar na mesa</button>' : ''}<button type="button" data-ar="guardar"${e.estado === 'teste' ? '' : ` disabled title="${e.rascunho ? 'Teste na mesa antes' : 'Já está no banco'}"`}>Guardar no banco</button><button type="button" data-ar="descartar"${e.rascunho ? '' : ' disabled'}>Descartar</button></div></article>`).join('')}</div>`;
    list.forEach(e => playSheet(area.querySelector(`[data-fx="${CSS.escape(e.id)}"] canvas`), e));
    if (list.length) onChange?.();
    area.scrollIntoView({block: 'nearest'});
  }
  dialog.addEventListener('input', e => {
    const {name, value} = e.target;
    if (name === 'pedido') return;
    if (name === 'carta') {
      current = cards.find(c => c.id === value) || null;
      params = {...defaultRequest(current), ...recall(current)};
      draw();
      shown = '';
      return poll();
    }
    params[name] = value;
    remember(current, params);
    refresh();
  });
  dialog.addEventListener('click', async e => {
    const action = e.target.closest('[data-ar]')?.dataset.ar;
    if (action === 'close') return dialog.close();
    const id = e.target.closest('[data-fx]')?.dataset.fx;
    try {
      if (action === 'gerar') { say(''); shown = ''; await post('/api/star-hill/vfx-gerar', {pedido: dialog.querySelector('[name=pedido]').value}); await poll(); return dialog.querySelector('.ar-result').scrollIntoView({block: 'nearest'}); }
      if (action === 'cancelar') { await post('/api/star-hill/vfx-gerar/cancelar'); return poll(); }
      if (action === 'testar') { dialog.close(); return onTest(id); }
      if (action === 'guardar') { await post('/api/star-hill/vfx-meta', {id, aprovar: true}); const card = e.target.closest('article'); card.querySelector('[data-ar=guardar]').disabled = card.querySelector('[data-ar=descartar]').disabled = true; card.querySelector('small').textContent = card.querySelector('small').textContent.replace('testado', 'no banco'); onChange?.(); return say('Guardado no banco de efeitos.'); }
      if (action === 'descartar') { await post('/api/star-hill/vfx-meta', {id, descartar: true}); e.target.closest('article').remove(); onChange?.(); return say('Rascunho descartado.'); }
    } catch (error) { return say(error.message); }
    if (action !== 'copy') return;
    const text = dialog.querySelector('[name=pedido]');
    let copied = true;
    try { await navigator.clipboard.writeText(text.value); } catch { text.select(); copied = document.execCommand('copy'); }
    dialog.querySelector('output').textContent = copied ? 'Pedido copiado. Cole na conversa com o Claude.' : 'Não consegui copiar: selecione o texto e copie.';
  });
  dialog.addEventListener('close', () => dialog.remove());
  draw();
  dialog.showModal();
  poll();
}
