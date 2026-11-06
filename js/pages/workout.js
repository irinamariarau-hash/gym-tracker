/* Antrenament nou + tabelul antrenamentului */
var Pages = window.Pages || (window.Pages = {});

/* ---------- Alegerea antrenamentului ---------- */
Pages.startFromTemplate = (templateId) => {
  const t = Store.template(templateId);
  if (!t) return;
  const w = Store.createWorkout({ templateId: t.id, name: t.name, exerciseIds: t.exerciseIds });
  UI.go('workout-' + w.id);
};

Pages.newWorkout = () => {
  const sug = Store.suggestNext();
  const items = Store.templates();
  const startEmpty = () => { const w = Store.createWorkout({ name: 'Antrenament' }); UI.go('workout-' + w.id); };

  return UI.page({ title: 'Antrenament nou', back: '' },
    h('div', { class: 'section-title' }, 'Din template'),
    h('div', { class: 'list' },
      items.length
        ? items.map((t) => h('button', { class: 'list-row', onclick: () => Pages.startFromTemplate(t.id) },
            h('span', { class: 'row-main' },
              h('span', { class: 'row-title' }, t.name || '(fără nume)',
                sug.template && sug.template.id === t.id ? h('span', { class: 'chip' }, 'Sugerat') : null),
              h('span', { class: 'row-sub' }, t.exerciseIds.length
                ? t.exerciseIds.map(Store.exerciseName).join(' · ')
                : 'Gol: adaugi exercițiile în timpul antrenamentului')),
            UI.icon('chev')))
        : h('p', { class: 'empty' }, 'Nu ai niciun template.'),
    ),
    h('div', { class: 'section-title' }, 'Sau'),
    h('button', { class: 'btn btn-ghost btn-block', onclick: startEmpty }, UI.icon('plus'), 'Antrenament gol'),
  );
};

/* ---------- Tabelul antrenamentului ---------- */
const MAX_SETS = 10;
const isNumber = (s) => /^\s*\d+([.,]\d+)?\s*$/.test(String(s));

/** „10 · 8 · 8 — 40 kg” */
function describeEntry(en) {
  const hasSets = en.sets.some((s) => String(s).trim());
  const sets = hasSets ? en.sets.map((s) => String(s).trim() || '–').join(' · ') : '';
  const kg = String(en.kg).trim();
  const kgText = kg ? kg + (isNumber(kg) ? ' kg' : '') : '';
  const notes = String(en.notes || '').trim();
  return [[sets, kgText].filter(Boolean).join(' — '), notes ? '„' + notes + '”' : ''].filter(Boolean).join(' · ');
}

Pages.workout = (id) => {
  const w = Store.workout(id);
  if (!w) return Pages.notFound('Antrenamentul nu mai există.', 'history');

  const change = () => { Store.saveSoon(w); status.textContent = 'Se salvează…'; clearTimeout(change.t); change.t = setTimeout(() => { status.textContent = 'Salvat automat'; }, 500); };
  const structural = () => { Store.saveSoon(w); Store.flush(); UI.refresh(); };

  /* Sus: data și numele */
  const dateInput = h('input', { class: 'input', id: 'workout-date', type: 'date', value: w.date, max: '2100-12-31' });
  dateInput.addEventListener('change', () => { if (dateInput.value) { w.date = dateInput.value; structural(); } });
  const nameInput = h('input', { class: 'input', id: 'workout-name', value: w.name, autocomplete: 'off', enterkeyhint: 'done' });
  nameInput.addEventListener('input', () => { w.name = nameInput.value; change(); });
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });
  const status = h('span', { class: 'save-status' }, 'Salvat automat');

  /* Trecerea la căsuța următoare cu butonul „Înainte” de pe tastatură */
  const focusNext = (input) => {
    const all = [...document.querySelectorAll('.cell-input')];
    const next = all[all.indexOf(input) + 1];
    if (next) { next.focus(); next.select && next.select(); } else input.blur();
  };

  const cards = w.entries.map((en, i) => exerciseCard(en, i));

  function exerciseCard(en, i) {
    const last = Store.lastPerformance(en.exerciseId, w);
    const lastSets = last ? last.entry.sets : [];
    const kgIsText = en.kgText || (String(en.kg).trim() !== '' && !isNumber(en.kg));

    const cell = (label, input) => h('label', { class: 'cell' }, h('span', { class: 'cell-label' }, label), input);
    const setInputs = en.sets.map((val, s) => {
      const input = h('input', {
        class: 'cell-input', id: 'w-' + i + '-set-' + s, value: val, inputmode: 'numeric', pattern: '[0-9]*',
        autocomplete: 'off', enterkeyhint: 'next', placeholder: lastSets[s] ? String(lastSets[s]) : '',
        'aria-label': Store.exerciseName(en.exerciseId) + ', setul ' + (s + 1),
      });
      input.addEventListener('input', () => { en.sets[s] = input.value.trim(); change(); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); focusNext(input); } });
      return cell('Set ' + (s + 1), input);
    });
    const kgInput = h('input', {
      class: 'cell-input cell-kg', id: 'w-' + i + '-kg', value: en.kg, inputmode: kgIsText ? 'text' : 'decimal',
      autocomplete: 'off', enterkeyhint: 'next', placeholder: last && last.entry.kg ? String(last.entry.kg) : '',
      'aria-label': Store.exerciseName(en.exerciseId) + ', kg',
    });
    kgInput.addEventListener('input', () => { en.kg = kgInput.value.trim(); change(); });
    kgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); focusNext(kgInput); } });

    const notes = h('textarea', { class: 'input notes', id: 'w-' + i + '-notes', rows: 1, placeholder: 'Notițe', value: en.notes || '' });
    const grow = () => { notes.style.height = 'auto'; notes.style.height = notes.scrollHeight + 2 + 'px'; };
    notes.addEventListener('input', () => { en.notes = notes.value; change(); grow(); });
    requestAnimationFrame(grow);

    const addSet = () => { if (en.sets.length < MAX_SETS) { en.sets.push(''); structural(); } };
    const removeSet = async () => {
      if (en.sets.length <= 1) return;
      const lastVal = en.sets[en.sets.length - 1];
      if (lastVal && !(await UI.confirm('Scoți setul ' + en.sets.length + '?', { ok: 'Scoate', danger: true, detail: 'Are scris ' + lastVal + ' repetări.' }))) return;
      en.sets.pop();
      structural();
    };

    return h('section', { class: 'wk-card' },
      h('div', { class: 'wk-head' },
        h('span', { class: 'order-num' }, i + 1),
        h('h2', { class: 'wk-name' }, Store.exerciseName(en.exerciseId)),
        h('button', { class: 'icon-btn', 'aria-label': 'Opțiuni exercițiu', onclick: () => exerciseMenu(en, i) }, UI.icon('more')),
      ),
      h('div', { class: 'wk-grid' },
        h('div', { class: 'wk-sets' }, setInputs),
        cell(kgIsText ? 'Kg / text' : 'Kg', kgInput),
      ),
      h('p', { class: 'last-time' }, last
        ? ['Ultima dată, ', UI.fmtDate(last.workout.date, { year: last.workout.date.slice(0, 4) !== w.date.slice(0, 4) }), ': ', h('b', null, describeEntry(last.entry))]
        : 'Prima dată la acest exercițiu'),
      notes,
      h('div', { class: 'wk-foot' },
        h('span', { class: 'muted small' }, en.sets.length + (en.sets.length === 1 ? ' set' : ' seturi')),
        h('button', { class: 'chip-btn', disabled: en.sets.length <= 1, onclick: removeSet }, '− set'),
        h('button', { class: 'chip-btn', disabled: en.sets.length >= MAX_SETS, onclick: addSet }, '+ set'),
      ),
    );
  }

  function exerciseMenu(en, i) {
    const name = Store.exerciseName(en.exerciseId);
    const n = w.entries.length;
    const act = (fn) => async () => { close(); await fn(); };
    const item = (label, iconName, fn, opts = {}) =>
      h('button', { class: 'menu-item' + (opts.danger ? ' menu-danger' : ''), disabled: opts.disabled, onclick: act(fn) }, UI.icon(iconName), label);
    const move = (d) => { const e = w.entries; [e[i], e[i + d]] = [e[i + d], e[i]]; structural(); };
    const close = UI.sheet((close) => h('div', { class: 'stack' },
      h('div', { class: 'sheet-head' }, h('h2', null, name),
        h('button', { class: 'icon-btn', 'aria-label': 'Închide', onclick: close }, UI.icon('close'))),
      h('div', { class: 'menu' },
        item('Mută mai sus', 'up', () => move(-1), { disabled: i === 0 }),
        item('Mută mai jos', 'down', () => move(1), { disabled: i === n - 1 }),
        item('Înlocuiește cu alt exercițiu', 'swap', async () => {
          const exId = await UI.pickExercise({ title: 'Înlocuiește ' + name, exclude: w.entries.map((x) => x.exerciseId) });
          if (exId) { en.exerciseId = exId; structural(); }
        }),
        item(en.kgText ? 'Kg: tastatură cu cifre' : 'Kg: tastatură cu litere (ex. 30s)', 'keyboard', () => { en.kgText = !en.kgText; structural(); }),
        item('Șterge din antrenament', 'trash', async () => {
          if (Store.entryHasData(en) && !(await UI.confirm('Ștergi „' + name + '” din antrenament?', { ok: 'Șterge', danger: true, detail: 'Se pierde ce ai scris la el azi.' }))) return;
          w.entries.splice(i, 1);
          structural();
        }, { danger: true }),
      ),
    ));
  }

  const addExercise = async () => {
    const exId = await UI.pickExercise({ title: 'Adaugă exercițiu', exclude: w.entries.map((x) => x.exerciseId) });
    if (exId) { w.entries.push(Store.newEntry(exId)); structural(); }
  };

  /* Jos: actualizare template, salvare ca template, ștergere */
  const t = w.templateId && Store.template(w.templateId);
  const updateTemplate = async () => {
    const ok = await UI.confirm('Actualizezi template-ul „' + t.name + '”?', {
      ok: 'Actualizează',
      detail: 'Template-ul va avea exact exercițiile de azi, în aceeași ordine: ' + w.entries.map((x) => Store.exerciseName(x.exerciseId)).join(', ') + '.',
    });
    if (!ok) return;
    Store.updateTemplate(t.id, { exerciseIds: w.entries.map((x) => x.exerciseId) });
    UI.toast('Template actualizat');
    UI.refresh();
  };
  const saveAsTemplate = async () => {
    const tNew = Store.createTemplate(w.name || 'Template nou', w.entries.map((x) => x.exerciseId));
    UI.toast('Am salvat template-ul „' + tNew.name + '”');
  };
  const remove = async () => {
    const ok = await UI.confirm('Ștergi antrenamentul?', { ok: 'Șterge', danger: true, detail: (w.name || 'Antrenament') + ', ' + UI.fmtDate(w.date) + '. Nu se poate anula.' });
    if (!ok) return;
    Store.deleteWorkout(w.id);
    UI.toast('Antrenament șters');
    UI.go(App.backFor('workout'));
  };

  return UI.page({ title: w.name || 'Antrenament', back: App.backFor('workout') },
    h('div', { class: 'wk-top' },
      h('div', { class: 'field' }, h('label', { for: 'workout-date' }, 'Data'), dateInput),
      h('div', { class: 'field' }, h('label', { for: 'workout-name' }, 'Nume'), nameInput),
    ),
    t ? h('p', { class: 'muted small' }, 'După template-ul ', h('b', null, t.name), '. Ce schimbi aici rămâne doar în acest antrenament.') : null,
    cards.length ? cards : h('p', { class: 'empty' }, 'Niciun exercițiu încă. Adaugă primul mai jos.'),
    h('button', { class: 'btn btn-ghost btn-block', onclick: addExercise }, UI.icon('plus'), 'Adaugă exercițiu'),
    t && Store.differsFromTemplate(w)
      ? h('div', { class: 'card stack' },
          h('p', { class: 'muted' }, 'Ai schimbat exercițiile față de template-ul „' + t.name + '”.'),
          h('button', { class: 'btn btn-soft', onclick: updateTemplate }, 'Actualizează și template-ul'))
      : null,
    h('button', { class: 'btn btn-primary btn-block', onclick: () => { Store.flush(); UI.go(App.backFor('workout')); } }, 'Gata'),
    h('div', { class: 'wk-bottom' },
      status,
      h('button', { class: 'link-btn', onclick: saveAsTemplate, disabled: !w.entries.length }, 'Salvează ca template nou'),
      h('button', { class: 'link-btn link-danger', onclick: remove }, 'Șterge antrenamentul'),
    ),
  );
};
