// Identidade do ambiente (docs/platform-4.0.md): mostra Playtest, versão e commit do build; não aparece dentro da partida.
const build = await fetch('/playtest/build.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : null)).catch(() => null);
const badge = document.createElement('div');
badge.id = 'env-badge';
badge.textContent = build ? `${build.environment} ${build.version} · ${build.commit.slice(0, 8)}` : 'playtest · build unknown';
badge.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:4px;white-space:nowrap;z-index:50;padding:2px 8px;border:1px solid #e6c36a55;border-radius:999px;background:#05060ccc;color:#e6c36a;font:600 10px/1.6 system-ui;letter-spacing:.06em;text-transform:uppercase;pointer-events:none';
document.body.append(badge);
