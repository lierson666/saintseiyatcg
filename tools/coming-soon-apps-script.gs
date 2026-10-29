// Cadastro da home Coming Soon (saintseiyatcg.com, autor, 29/10/2026).
// Uso: numa planilha Google nova, Extensões > Apps Script, cole este arquivo e salve.
// Implantar > Nova implantação > Tipo "App da Web"; Executar como: Eu; Quem pode acessar: Qualquer pessoa.
// Copie a URL /exec e cole em SIGNUP_URL no index.html da raiz.
// A planilha fica só na sua conta Google; a aba "Cadastros" é criada no primeiro envio.

function doPost(e) {
  const p = (e && e.parameter) || {};
  const name = String(p.name || '').trim().slice(0, 80);
  const email = String(p.email || '').trim().toLowerCase().slice(0, 120);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ok: false, erro: 'dados inválidos'});
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName('Cadastros') || book.insertSheet('Cadastros');
    if (sheet.getLastRow() === 0) sheet.appendRow(['Data', 'Nome', 'Email', 'Origem', 'Consentimento']);
    // Mesmo email não entra duas vezes.
    const emails = sheet.getLastRow() > 1 ? sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues().flat() : [];
    if (!emails.includes(email)) sheet.appendRow([new Date(), name, email, String(p.source || '').slice(0, 60), 'sim']);
  } finally {
    lock.releaseLock();
  }
  return reply({ok: true});
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
