// App de desktop do Saint Seiya TCG (decisão do autor, 31/10/2026): casca Electron online-only.
// Abre o site oficial; login, decks, rank e duelos online seguem no sanctuary-api/arena-server.
// Nenhuma arte vai no instalador: o jogo atualiza junto com cada deploy do site.
const {app, BrowserWindow, Menu, shell, session} = require('electron');
const path = require('path');

// SSTCG_URL troca o alvo para testar contra o servidor local (ex.: http://localhost:8040/playtest/).
const START = process.env.SSTCG_URL || 'https://saintseiyatcg.com/playtest/';
const ORIGIN = new URL(START).origin;

if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 600,
    backgroundColor: '#05070c', title: 'Saint Seiya TCG', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, spellcheck: false},
  });
  win.once('ready-to-show', () => win.show());

  // Só o site oficial roda dentro do app; o resto abre no navegador padrão.
  const inside = url => { try { return new URL(url).origin === ORIGIN; } catch { return false; } };
  win.webContents.setWindowOpenHandler(({url}) => {
    if (inside(url)) win.loadURL(url); else if (/^https?:/.test(url)) shell.openExternal(url);
    return {action: 'deny'};
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (inside(url) || url.startsWith('file:')) return;
    e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url);
  });

  // Sem rede (ou site fora do ar): tela local com "Try again" em vez de página em branco.
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (!isMain || code === -3) return; // -3 = navegação abortada por outra
    win.loadFile(path.join(__dirname, 'offline.html'), {query: {to: url || START}});
  });

  win.loadURL(START);
}

// Câmera, microfone etc. nunca são pedidos pelo jogo: nega tudo exceto tela cheia e áudio.
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((wc, permission, done) => done(['fullscreen', 'clipboard-sanitized-write'].includes(permission)));
  const isMac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{role: 'appMenu'}] : []),
    {role: 'editMenu'},
    {label: 'View', submenu: [
      {label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => win?.reload()},
      {label: 'Back to lobby', accelerator: 'CmdOrCtrl+L', click: () => win?.loadURL(START)},
      {type: 'separator'}, {role: 'resetZoom'}, {role: 'zoomIn'}, {role: 'zoomOut'},
      {type: 'separator'}, {role: 'togglefullscreen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11'},
    ]},
    {role: 'windowMenu'},
    {role: 'help', submenu: [{label: 'saintseiyatcg.com', click: () => shell.openExternal('https://saintseiyatcg.com/download/')}]},
  ]));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
