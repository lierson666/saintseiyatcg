// Guia de primeiro acesso da home (autor, 10/11/2026; menu de quatro acessos em 11/11/2026): Marin mostra as áreas reais do jogo, com foco em cada uma.
// Salvo por conta neste aparelho: a API ainda não guarda preferências de onboarding.
const VERSION = 1;
const key = user => `sstcg.onboarding.home.${user}`;
const read = user => { try { return JSON.parse(localStorage.getItem(key(user))); } catch { return null; } };
const save = (user, patch) => { try { localStorage.setItem(key(user), JSON.stringify({onboarding_home_seen: true, onboarding_home_completed: false, onboarding_home_version: VERSION, onboarding_home_last_step: 0, ...read(user), ...patch})); } catch { /* sem armazenamento */ } };
const FORCED = new URLSearchParams(location.search).get('novice') === '1'; // QA: rever como conta nova

export const STEPS = [
  {pose: '02_saudacao', text: "Welcome to the Sanctuary! I'm Marin, and I'll show you around."},
  {target: '[data-guide="tutorial"]', pose: '03_apontar_direita', text: 'Never played? Start here. I teach you to fight, step by step.'},
  {target: '[data-guide="story"]', pose: '05_explicando', text: "Live Seiya's story, battle by battle. You pick up where you left off."},
  {target: '[data-guide="casual"]', pose: '06_confianca', text: 'Practice against the computer or duel a friend. Your first 5 online wins of the day pay Cosmo Coins.'},
  {target: '.ec-coins', fallback: '.lb-tab[data-screen="store"]', pose: '07_dica', text: 'Spend Cosmo Coins on boosters in the Store. Extra copies of a card also turn into coins.'},
  {target: '.lb-tab[data-screen="store"]', pose: '05_explicando', text: 'Boosters bring new cards. Your account starts with 3 to open.'},
  {target: '.lb-tab[data-screen="decks"]', pose: '05_explicando', text: 'Build around a God and a Domain. A Domain from another faction unlocks up to 15 of its cards.'},
  {target: '[data-guide="ranked"]', pose: '06_confianca', text: 'Ready to compete? Online duels move your rank each season.'},
  {pose: '09_aprovacao', text: "That's the path. Now the Sanctuary is yours!", chain: ['Learn', 'Fight', 'Earn coins', 'Open boosters', 'Collect', 'Build decks', 'Compete']},
];

// Passo em que o guia deve abrir sozinho, ou null.
export function guideStart(user, {signedIn, isNew}) {
  if (FORCED) { try { localStorage.removeItem(key(user)); } catch { /* idem */ } return 0; }
  if (!signedIn) return null;
  const s = read(user);
  if (s) return s.onboarding_home_completed || s.onboarding_home_skipped ? null : s.onboarding_home_last_step;
  return isNew ? 0 : null;
}

let open = false;
export function openGuide(user, start = 0) {
  if (open) return;
  open = true;
  const dlg = document.createElement('dialog');
  dlg.className = 'hg';
  dlg.setAttribute('aria-label', 'Introduction');
  dlg.innerHTML = `<div class="hg-hole" aria-hidden="true"></div>
    <div class="hg-panel"><img class="hg-marin" alt="Marin"><div class="hg-box">
      <p class="hg-count"></p><p class="hg-text" aria-live="polite"></p><ol class="hg-chain"></ol>
      <div class="hg-actions"><button class="kv-ghost hg-skip">Skip</button><button class="kv-ghost hg-back">Back</button><button class="kv-button hg-next">Next</button></div>
    </div></div>`;
  document.body.append(dlg);
  const $ = c => dlg.querySelector(c), hole = $('.hg-hole'), panel = $('.hg-panel');
  let at = Math.min(Math.max(start, 0), STEPS.length - 1);
  const visible = sel => { const el = sel && document.querySelector(sel); return el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' ? el : null; };
  const target = () => visible(STEPS[at].target) || visible(STEPS[at].fallback);

  // Painel ao lado do alvo, no primeiro espaço onde cabe inteiro; assim Marin nunca cobre o que está mostrando.
  function place() {
    const W = innerWidth, H = innerHeight, m = 12, el = target();
    const w = panel.offsetWidth, h = panel.offsetHeight, clampX = x => Math.min(Math.max(x, m), W - w - m), clampY = y => Math.min(Math.max(y, m), H - h - m);
    dlg.classList.toggle('is-free', !el);
    if (!el) { panel.style.left = `${(W - w) / 2}px`; panel.style.top = `${(H - h) / 2}px`; return; }
    const r = el.getBoundingClientRect(), p = 6, box = {l: Math.max(r.left - p, 2), t: Math.max(r.top - p, 2), r: Math.min(r.right + p, W - 2), b: Math.min(r.bottom + p, H - 2)};
    Object.assign(hole.style, {left: `${box.l}px`, top: `${box.t}px`, width: `${box.r - box.l}px`, height: `${box.b - box.t}px`});
    const g = 14, midY = clampY((box.t + box.b - h) / 2), midX = clampX((box.l + box.r - w) / 2);
    const spots = [[box.l - w - g >= m, box.l - w - g, midY], [box.r + w + g <= W - m, box.r + g, midY], [box.b + h + g <= H - m, midX, box.b + g], [box.t - h - g >= m, midX, box.t - h - g]];
    const [, x, y] = spots.find(s => s[0]) || [0, midX, box.t > H - box.b ? m : H - h - m];
    panel.style.left = `${x}px`; panel.style.top = `${y}px`;
  }
  function show() {
    const s = STEPS[at];
    save(user, {onboarding_home_last_step: at});
    $('.hg-marin').src = `./divine/assets/marin/${s.pose}.webp`;
    $('.hg-count').textContent = `Step ${at + 1} of ${STEPS.length}`;
    $('.hg-text').textContent = s.text;
    $('.hg-chain').hidden = !s.chain;
    $('.hg-chain').innerHTML = (s.chain || []).map(c => `<li>${c}</li>`).join('');
    $('.hg-back').hidden = at === 0;
    $('.hg-skip').hidden = at === STEPS.length - 1;
    $('.hg-next').textContent = at === STEPS.length - 1 ? 'Finish' : 'Next';
    target()?.scrollIntoView({block: 'center'});
    place();
    $('.hg-next').focus();
  }
  const go = d => { const n = at + d; if (n >= 0 && n < STEPS.length) { at = n; show(); } };
  let queued = false;
  const replace = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; place(); }); };
  const mo = new MutationObserver(replace); // o lobby redesenha quando a conta carrega: o alvo muda de nó e de lugar
  mo.observe(document.getElementById('lobby'), {childList: true, subtree: true});
  addEventListener('resize', replace);
  $('.hg-marin').addEventListener('load', replace);
  function close(patch) { save(user, patch); mo.disconnect(); removeEventListener('resize', replace); open = false; dlg.close(); dlg.remove(); }
  $('.hg-next').onclick = () => at === STEPS.length - 1 ? close({onboarding_home_completed: true, onboarding_home_skipped: false}) : go(1);
  $('.hg-back').onclick = () => go(-1);
  $('.hg-skip').onclick = () => close({onboarding_home_skipped: true});
  dlg.addEventListener('cancel', e => { e.preventDefault(); close({onboarding_home_skipped: true}); }); // Esc
  dlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  dlg.showModal();
  show();
}
