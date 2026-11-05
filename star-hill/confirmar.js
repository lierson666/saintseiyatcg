// Confirmação dentro da página. O app do macOS não implementa window.confirm: ele devolve false sem mostrar nada, e o botão parece morto.
export function confirmar(texto, rotulo = 'Confirmar') {
  return new Promise(resolve => {
    const box = document.createElement('dialog');
    box.className = 'sh-confirm';
    const p = document.createElement('p'), row = document.createElement('div'), no = document.createElement('button'), yes = document.createElement('button');
    p.textContent = texto;
    no.type = yes.type = 'button';
    no.textContent = 'Cancelar';
    yes.textContent = rotulo;
    yes.className = 'sh-confirm__ok';
    row.append(no, yes);
    box.append(p, row);
    document.body.append(box);
    box.addEventListener('close', () => { box.remove(); resolve(box.returnValue === 'sim'); });
    no.addEventListener('click', () => box.close());
    yes.addEventListener('click', () => box.close('sim'));
    box.showModal();
    no.focus();
  });
}
