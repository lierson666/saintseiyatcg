// Status online (docs/contas-amigos-chat.md, etapa 2): bate no sanctuary-api a cada 20 s com a aba visível.
// Lobby manda 'online'; a arena manda 'match'. Sem conta ou sem API (dev), falha em silêncio.
export function startPresence(status = 'online') {
  const beat = () => {
    if (document.hidden) return;
    fetch('/api/presence', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status})}).catch(() => {});
  };
  beat();
  setInterval(beat, 20000);
  document.addEventListener('visibilitychange', beat);
}
