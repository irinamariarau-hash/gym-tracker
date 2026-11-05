/* Template-uri: listă și editare */
var Pages = window.Pages || (window.Pages = {});

Pages.templates = () => {
  const create = () => {
    const t = Store.createTemplate('Template nou');
    UI.go('template-' + t.id);
  };
  const items = Store.templates();
  return UI.page({ title: 'Template-uri', back: '' },
    h('p', { class: 'muted' }, 'Un template e o listă de exerciții, în ordinea în care le faci. Reps și kg le scrii în antrenament.'),
    h('div', { class: 'list' },
      items.length
        ? items.map((t) => h('button', { class: 'list-row', onclick: () => UI.go('template-' + t.id) },
            h('span', { class: 'row-main' },
              h('span', { class: 'row-title' }, t.name || '(fără nume)'),
              h('span', { class: 'row-sub' }, t.exerciseIds.length
                ? t.exerciseIds.map(Store.exerciseName).join(' · ')
                : 'Niciun exercițiu încă')),
            UI.icon('chev')))
        : h('p', { class: 'empty' }, 'Nu ai niciun template.'),
    ),
    h('button', { class: 'btn btn-ghost btn-block', onclick: create }, UI.icon('plus'), 'Template nou'),
  );
};

Pages.template = (id) => {
  const t = Store.template(id);
  if (!t) return Pages.notFound('Template-ul nu mai există.', 'templates');

  const nameInput = h('input', { class: 'input', id: 'template-name', value: t.name, autocomplete: 'off', enterkeyhint: 'done' });
  nameInput.addEventListener('input', () => Store.updateTemplate(id, { name: nameInput.value }));
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });
  // Template nou: selectăm numele ca să-l poți rescrie direct.
  if (t.name === 'Template nou' && !t.exerciseIds.length) setTimeout(() => { nameInput.focus(); nameInput.select(); }, 60);

  const ids = t.exerciseIds;
  const setIds = (next) => { Store.updateTemplate(id, { exerciseIds: next }); UI.refresh(); };
  const move = (i, d) => { const next = ids.slice(); [next[i], next[i + d]] = [next[i + d], next[i]]; setIds(next); };

  const add = async () => {
    const exId = await UI.pickExercise({ title: 'Adaugă în ' + (t.name || 'template'), exclude: ids });
    if (exId) setIds([...ids, exId]);
  };

  const remove = async () => {
    const ok = await UI.confirm('Ștergi template-ul „' + (t.name || 'fără nume') + '”?', {
      ok: 'Șterge', danger: true, detail: 'Antrenamentele făcute deja după el rămân neschimbate.',
    });
    if (!ok) return;
    Store.deleteTemplate(id);
    UI.toast('Template șters');
    UI.go('templates');
  };

  return UI.page({ title: t.name || 'Template', back: 'templates' },
    h('div', { class: 'field' }, h('label', { for: 'template-name' }, 'Nume'), nameInput),
    h('div', { class: 'section-title' }, 'Exerciții', h('span', { class: 'count' }, ids.length || '')),
    ids.length
      ? h('ol', { class: 'order-list' },
          ids.map((exId, i) => h('li', { class: 'order-row' },
            h('span', { class: 'order-num' }, i + 1),
            h('span', { class: 'order-name' }, Store.exerciseName(exId)),
            h('span', { class: 'order-actions' },
              h('button', { class: 'icon-btn', 'aria-label': 'Mută mai sus', disabled: i === 0, onclick: () => move(i, -1) }, UI.icon('up')),
              h('button', { class: 'icon-btn', 'aria-label': 'Mută mai jos', disabled: i === ids.length - 1, onclick: () => move(i, 1) }, UI.icon('down')),
              h('button', { class: 'icon-btn icon-danger', 'aria-label': 'Scoate din template', onclick: () => setIds(ids.filter((_, j) => j !== i)) }, UI.icon('close')),
            ))))
      : h('p', { class: 'empty' }, 'Template-ul e gol. Adaugă exercițiile în ordinea în care le faci.'),
    h('button', { class: 'btn btn-ghost btn-block', onclick: add }, UI.icon('plus'), 'Adaugă exercițiu'),
    h('p', { class: 'muted small' }, 'Se salvează automat.'),
    h('button', { class: 'btn btn-danger-ghost btn-block spaced', onclick: remove }, UI.icon('trash'), 'Șterge template-ul'),
  );
};
