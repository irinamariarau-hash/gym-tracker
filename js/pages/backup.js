/* Backup: export și import într-un fișier JSON */
var Pages = window.Pages || (window.Pages = {});

const BACKUP_DAYS = 14;
/** „1 antrenament”, „5 antrenamente”, „20 de antrenamente” */
function plural(n, one, many) {
  if (n === 1) return '1 ' + one;
  const r = n % 100;
  return n + (n >= 20 && (r === 0 || r >= 20) ? ' de ' : ' ') + many;
}

/** Câte zile au trecut de la ultimul backup (sau de la primul antrenament, dacă n-ai făcut niciunul). */
Pages.backupDue = () => {
  const data = Store.raw;
  if (!data.workouts.length) return null;
  const firstWorkout = Math.min(...data.workouts.map((w) => w.createdAt || Date.now()));
  const since = data.lastBackupAt || firstWorkout;
  const days = Math.floor((Date.now() - since) / 86400000);
  return days >= BACKUP_DAYS ? { days, never: !data.lastBackupAt } : null;
};

function backupFile() {
  const json = JSON.stringify({ app: 'gym-tracker', exportedAt: new Date().toISOString(), data: Store.raw }, null, 1);
  const name = 'gym-tracker-backup-' + UI.today() + '.json';
  return { name, json };
}

Pages.backup = () => {
  const data = Store.raw;
  const last = data.lastBackupAt;

  const markDone = () => { data.lastBackupAt = Date.now(); Store.save(); };

  const exportFile = () => {
    const { name, json } = backupFile();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    markDone();
    UI.toast('Am descărcat ' + name);
    UI.refresh();
  };

  // Pe Android poți trimite fișierul direct în Google Drive, pe mail etc.
  const canShareFiles = (() => {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] })); } catch (e) { return false; }
  })();
  const shareFile = async () => {
    const { name, json } = backupFile();
    const file = new File([json], name, { type: 'application/json' });
    try {
      await navigator.share({ files: [file], title: 'Backup jurnal de sală' });
      markDone();
      UI.toast('Backup trimis');
      UI.refresh();
    } catch (e) {
      if (e && e.name !== 'AbortError') UI.toast('Nu am putut trimite fișierul. Folosește „Exportă”.');
    }
  };

  const fileInput = h('input', { type: 'file', id: 'import-file', accept: '.json,application/json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch (e) {
      UI.toast('Fișierul nu e un backup valid.');
      return;
    }
    const incoming = parsed && parsed.data ? parsed.data : parsed;
    if (!incoming || !Array.isArray(incoming.exercises) || !Array.isArray(incoming.templates) || !Array.isArray(incoming.workouts)) {
      UI.toast('Fișierul nu e un backup al acestei aplicații.');
      return;
    }
    const ok = await UI.confirm('Înlocuiești datele de acum cu cele din backup?', {
      ok: 'Importă', danger: true,
      detail: 'Backup-ul are ' + plural(incoming.workouts.length, 'antrenament', 'antrenamente') + ', '
        + plural(incoming.templates.length, 'template', 'template-uri') + ' și '
        + plural(incoming.exercises.filter((e) => !e.deleted).length, 'exercițiu', 'exerciții')
        + (parsed.exportedAt ? ', făcut pe ' + UI.fmtDate(parsed.exportedAt.slice(0, 10)) : '')
        + '. Ce ai acum în aplicație (' + plural(data.workouts.length, 'antrenament', 'antrenamente') + ') se înlocuiește.',
    });
    if (!ok) return;
    Store.replaceAll(incoming);
    UI.toast('Datele au fost restaurate');
    UI.go('');
  });

  return UI.page({ title: 'Backup', back: '' },
    h('section', { class: 'card stack' },
      h('p', { class: 'eyebrow' }, 'Ultimul backup'),
      h('p', { class: 'suggest-name' }, last ? UI.fmtDate(new Date(last).toISOString().slice(0, 10)) : 'Niciodată'),
      h('p', { class: 'muted' }, 'Datele stau doar în acest telefon, în browser. Dacă ștergi datele browserului sau schimbi telefonul, backup-ul e singura copie.'),
    ),
    h('div', { class: 'section-title' }, 'Salvează'),
    h('button', { class: 'btn btn-primary btn-block', onclick: exportFile }, 'Exportă'),
    h('p', { class: 'muted small' }, 'Descarcă un fișier .json în folderul Descărcări al telefonului.'),
    canShareFiles ? h('button', { class: 'btn btn-ghost btn-block', onclick: shareFile }, 'Trimite în Drive sau pe mail') : null,
    canShareFiles ? h('p', { class: 'muted small' }, 'Așa backup-ul ajunge și în afara telefonului. E mai sigur.') : null,
    h('div', { class: 'section-title' }, 'Restaurează'),
    fileInput,
    h('button', { class: 'btn btn-ghost btn-block', onclick: () => fileInput.click() }, 'Importă'),
    h('p', { class: 'muted small' }, 'Alegi un fișier de backup și aplicația revine la datele din el.'),
  );
};
