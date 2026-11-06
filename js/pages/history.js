/* Istoric, pagina fiecărui exercițiu (istoric + grafic) și Recorduri */
var Pages = window.Pages || (window.Pages = {});

/* ---------- Istoric, grupat pe săptămâni (de luni până duminică) ---------- */
function mondayOf(dateStr) {
  const d = UI.parseDate(dateStr);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
const isoOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function weekLabel(mondayIso) {
  const thisWeek = isoOf(mondayOf(UI.today()));
  const prev = mondayOf(UI.today()); prev.setDate(prev.getDate() - 7);
  if (mondayIso === thisWeek) return 'Săptămâna aceasta';
  if (mondayIso === isoOf(prev)) return 'Săptămâna trecută';
  const start = UI.parseDate(mondayIso);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const sameYear = start.getFullYear() === new Date().getFullYear();
  const sameMonth = start.getMonth() === end.getMonth();
  return (sameMonth ? start.getDate() : UI.fmtDate(mondayIso, { year: false })) + ' – ' + UI.fmtDate(isoOf(end), { year: !sameYear });
}

Pages.history = () => {
  const all = Store.workouts();
  const groups = [];
  for (const w of all) {
    const key = isoOf(mondayOf(w.date));
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, items: [] }; groups.push(g); }
    g.items.push(w);
  }
  return UI.page({ title: 'Istoric', back: '' },
    all.length
      ? groups.map((g) => h('section', { class: 'stack week' },
          h('div', { class: 'section-title' }, weekLabel(g.key),
            h('span', { class: 'count' }, g.items.length + (g.items.length === 1 ? ' antrenament' : ' antrenamente'))),
          h('div', { class: 'list' },
            g.items.map((w) => h('button', { class: 'list-row', onclick: () => UI.go('workout-' + w.id) },
              h('span', { class: 'row-date' },
                h('span', { class: 'row-day' }, UI.parseDate(w.date).getDate()),
                h('span', { class: 'row-month' }, UI.fmtDate(w.date, { weekday: true, year: false }).split(',')[0].slice(0, 3))),
              h('span', { class: 'row-main' },
                h('span', { class: 'row-title' }, w.name || 'Antrenament'),
                h('span', { class: 'row-sub' }, w.entries.map((en) => Store.exerciseName(en.exerciseId)).join(' · ') || 'Fără exerciții')),
              UI.icon('chev')))),
        ))
      : h('div', { class: 'card empty-card stack' },
          h('p', { class: 'muted' }, 'Încă nu ai niciun antrenament salvat.'),
          h('button', { class: 'btn btn-primary', onclick: () => UI.go('new') }, 'Începe primul antrenament')),
    all.length ? h('p', { class: 'muted small center' }, 'Apasă pe un antrenament ca să-l vezi, să-l modifici sau să-l ștergi.') : null,
  );
};

/* ---------- Pagina exercițiului: Istoric | Grafic ---------- */
let exerciseTab = 'list';

Pages.exerciseDetails = (id) => {
  const hist = Store.exerciseHistory(id);
  if (!hist.length) {
    return h('div', { class: 'card empty-card' }, h('p', { class: 'muted' }, 'Nu ai făcut încă acest exercițiu. După primul antrenament cu el, aici apar istoricul și graficul.'));
  }

  const tabs = [['list', 'Istoric'], ['chart', 'Grafic']];
  const tabBar = h('div', { class: 'tabs', role: 'tablist' },
    tabs.map(([key, label]) => h('button', {
      class: 'tab' + (exerciseTab === key ? ' is-on' : ''), role: 'tab', 'aria-selected': String(exerciseTab === key),
      onclick: () => { exerciseTab = key; UI.refresh(); },
    }, label)));

  const rec = Store.records().find((r) => r.exerciseId === id);
  const summary = h('div', { class: 'ex-summary' },
    h('div', null, h('span', { class: 'stat-label' }, 'Făcut'), h('span', { class: 'stat-value' }, hist.length + (hist.length === 1 ? ' dată' : ' ori'))),
    h('div', null, h('span', { class: 'stat-label' }, 'Record'), h('span', { class: 'stat-value' }, rec ? fmtKg(rec.kg) : '–')),
    h('div', null, h('span', { class: 'stat-label' }, 'Ultima dată'), h('span', { class: 'stat-value' }, UI.fmtDate(hist[0].workout.date, { year: false }))),
  );

  let body;
  if (exerciseTab === 'list') {
    body = h('div', { class: 'list' },
      hist.map(({ workout: w, entry: en }) => h('button', { class: 'list-row hist-row', onclick: () => UI.go('workout-' + w.id) },
        h('span', { class: 'row-main' },
          h('span', { class: 'row-sub' }, UI.fmtDate(w.date, { weekday: true }) + ' · ' + (w.name || 'Antrenament')),
          h('span', { class: 'hist-sets' },
            en.sets.map((s, i) => h('span', { class: 'set-pill', title: 'Set ' + (i + 1) }, String(s).trim() || '–')),
            String(en.kg).trim() ? h('span', { class: 'kg-pill' }, Store.kgNumber(en.kg) != null ? fmtKg(Store.kgNumber(en.kg)) : en.kg) : null),
          en.notes && en.notes.trim() ? h('span', { class: 'hist-notes' }, en.notes.trim()) : null),
        UI.icon('chev'))));
  } else {
    const chron = hist.slice().reverse();
    const kgPoints = chron.filter((x) => Store.kgNumber(x.entry.kg) != null)
      .map((x) => ({ y: Store.kgNumber(x.entry.kg), date: x.workout.date, label: x.entry.sets.filter((s) => String(s).trim()).join(' · ') + ' reps' }));
    const repPoints = chron.filter((x) => Store.totalReps(x.entry) > 0)
      .map((x) => ({ y: Store.totalReps(x.entry), date: x.workout.date, label: x.entry.kg ? 'la ' + x.entry.kg + (Store.kgNumber(x.entry.kg) != null ? ' kg' : '') : '' }));
    const block = (title, sub, pts, opts) => h('section', { class: 'card stack chart-card' },
      h('div', null, h('h2', { class: 'chart-title' }, title), h('p', { class: 'muted small' }, sub)),
      pts.length ? Chart.draw({ points: pts, ...opts }) : h('p', { class: 'empty' }, 'Nu există încă valori cu numere.'),
      pts.length === 1 ? h('p', { class: 'muted small' }, 'Linia apare după al doilea antrenament.') : null);
    body = h('div', { class: 'stack' },
      block('Greutate (kg)', 'Kg folosite la fiecare antrenament. Atinge graficul ca să vezi detaliile.', kgPoints, { kind: 'line', unit: 'kg' }),
      block('Total repetări', 'Suma repetărilor din toate seturile, la fiecare antrenament.', repPoints, { kind: 'bar', unit: 'reps' }),
    );
  }
  return h('div', { class: 'stack' }, summary, tabBar, body);
};

function fmtKg(n) { return String(Math.round(n * 100) / 100).replace('.', ',') + ' kg'; }

/* ---------- Recorduri ---------- */
Pages.records = () => {
  const recs = Store.records();
  return UI.page({ title: 'Recorduri', back: '' },
    h('p', { class: 'muted' }, 'Cea mai mare greutate folosită la fiecare exercițiu. Valorile care nu sunt numere (ex. „30s”) nu intră aici.'),
    recs.length
      ? h('div', { class: 'list' },
          recs.map((r) => h('button', { class: 'list-row', onclick: () => UI.go('exercise-' + r.exerciseId) },
            h('span', { class: 'row-main' },
              h('span', { class: 'row-title' }, Store.exerciseName(r.exerciseId)),
              h('span', { class: 'row-sub' }, UI.fmtDate(r.workout.date) + (r.entry.sets.some((s) => String(s).trim()) ? ' · ' + r.entry.sets.filter((s) => String(s).trim()).join(' · ') + ' reps' : ''))),
            h('span', { class: 'record-kg' }, fmtKg(r.kg)),
            UI.icon('chev'))))
      : h('p', { class: 'empty' }, 'Încă nu ai recorduri. Apar după primul antrenament în care scrii kg.'),
  );
};
