/* Lista de exerciții și pagina fiecărui exercițiu */
var Pages = window.Pages || (window.Pages = {});

Pages.exercises = () => {
  const addInput = h('input', {
    class: 'input', id: 'new-exercise', placeholder: 'ex. Bench Press', autocomplete: 'off',
    autocapitalize: 'words', enterkeyhint: 'done',
  });
  const list = h('div', { class: 'list' });
  const search = h('input', { class: 'input', id: 'exercise-filter', type: 'search', placeholder: 'Caută în listă', autocomplete: 'off' });

  const add = () => {
    const name = Store.norm(addInput.value);
    if (!name) { addInput.focus(); return; }
    const existed = Store.findExercise(name);
    Store.addExercise(name);
    UI.toast(existed && !existed.deleted ? '„' + existed.name + '” e deja în listă' : 'Am adăugat „' + name + '”');
    addInput.value = '';
    draw();
  };
  addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const all = Store.exercises();
    const items = all.filter((e) => e.name.toLowerCase().includes(q));
    list.replaceChildren(
      ...items.map((e) => {
        const n = Store.exerciseUseCount(e.id);
        return h('button', { class: 'list-row', onclick: () => UI.go('exercise-' + e.id) },
          h('span', { class: 'row-main' },
            h('span', { class: 'row-title' }, e.name),
            h('span', { class: 'row-sub' }, n ? 'Făcut de ' + n + (n === 1 ? ' dată' : ' ori') : 'Nefăcut încă')),
          UI.icon('chev'));
      }),
    );
    if (!all.length) list.replaceChildren(h('p', { class: 'empty' }, 'Nu ai încă exerciții. Adaugă primul mai sus. Le poți adăuga și direct din template-uri sau din antrenament.'));
    else if (!items.length) list.replaceChildren(h('p', { class: 'empty' }, 'Niciun exercițiu nu se potrivește căutării.'));
  };
  search.addEventListener('input', draw);
  draw();

  return UI.page({ title: 'Exerciții', back: '' },
    h('div', { class: 'field' },
      h('label', { for: 'new-exercise' }, 'Exercițiu nou'),
      h('div', { class: 'inline' }, addInput, h('button', { class: 'btn btn-primary', onclick: add }, 'Adaugă'))),
    Store.exercises().length > 6 ? search : null,
    list,
  );
};

Pages.exercise = (id) => {
  const ex = Store.exercise(id);
  if (!ex || ex.deleted) return Pages.notFound('Exercițiul nu mai există.', 'exercises');

  const nameInput = h('input', { class: 'input', id: 'exercise-name', value: ex.name, autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done' });
  const error = h('p', { class: 'error', hidden: true });
  const saveName = () => {
    if (Store.norm(nameInput.value) === ex.name) return;
    const err = Store.renameExercise(id, nameInput.value);
    error.hidden = !err;
    error.textContent = err || '';
    if (!err) { UI.toast('Nume salvat'); UI.refresh(); }
  };
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });
  nameInput.addEventListener('change', saveName);

  const remove = async () => {
    const n = Store.exerciseUseCount(id);
    const ok = await UI.confirm('Ștergi „' + ex.name + '” din listă?', {
      ok: 'Șterge', danger: true,
      detail: n
        ? 'Dispare din listă și din template-uri. Antrenamentele vechi în care apare rămân neschimbate.'
        : 'Dispare din listă și din template-uri.',
    });
    if (!ok) return;
    Store.deleteExercise(id);
    UI.toast('Exercițiu șters');
    UI.go('exercises');
  };

  const body = Pages.exerciseDetails
    ? Pages.exerciseDetails(id)
    : h('div', { class: 'card empty-card' }, h('p', { class: 'muted' }, 'Istoricul și graficul acestui exercițiu apar în Etapa 3.'));

  return UI.page({ title: ex.name, back: 'exercises' },
    body,
    h('details', { class: 'card manage' },
      h('summary', null, 'Redenumește sau șterge'),
      h('div', { class: 'stack' },
        h('div', { class: 'field' },
          h('label', { for: 'exercise-name' }, 'Nume'),
          h('div', { class: 'inline' }, nameInput, h('button', { class: 'btn btn-primary', onclick: saveName }, 'Salvează'))),
        error,
        h('p', { class: 'muted small' }, 'Noul nume apare peste tot, inclusiv în antrenamentele vechi.'),
        h('button', { class: 'btn btn-danger-ghost', onclick: remove }, UI.icon('trash'), 'Șterge exercițiul'),
      ),
    ),
  );
};

Pages.notFound = (msg, back) => UI.page({ title: 'Nu am găsit', back },
  h('p', { class: 'empty' }, msg));
