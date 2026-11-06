/*
 * Store — toate datele aplicației, salvate în localStorage (memoria browserului).
 *
 * Structura datelor:
 *   exercises: [{ id, name, deleted? }]
 *   templates: [{ id, name, exerciseIds: [id, ...] }]
 *   workouts:  [{ id, date: "AAAA-LL-ZZ", name, templateId, entries: [
 *                 { exerciseId, sets: ["10", "8", ""], kg: "40", notes: "" } ],
 *                createdAt, updatedAt }]
 *   lastBackupAt: timestamp sau null
 */
const Store = (() => {
  const KEY = 'gym-tracker-data-v1';
  const CYCLE = ['Upper 1', 'Lower 1', 'Upper 2', 'Lower 2'];
  let data = null;
  let saveFailed = false;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ');
  const key = (s) => norm(s).toLowerCase();

  function emptyData() {
    return { version: 1, exercises: [], templates: [], workouts: [], lastBackupAt: null, createdAt: Date.now() };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      data = null;
    }
    if (!data || typeof data !== 'object') {
      data = emptyData();
      CYCLE.forEach((name) => data.templates.push({ id: uid(), name, exerciseIds: [] }));
      save();
    }
    data.exercises ||= [];
    data.templates ||= [];
    data.workouts ||= [];
    // Cere browserului să nu șteargă datele când rămâne fără spațiu (Android/Chrome).
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  }

  /** Înlocuiește toate datele (folosit la importul unui backup). */
  function replaceAll(incoming) {
    data = Object.assign(emptyData(), incoming);
    data.exercises ||= [];
    data.templates ||= [];
    data.workouts ||= [];
    save();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      saveFailed = false;
      return true;
    } catch (e) {
      saveFailed = true;
      return false;
    }
  }

  const byName = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

  /* ---------- Exerciții ---------- */
  function exercises() {
    return data.exercises.filter((e) => !e.deleted).sort(byName);
  }
  function exercise(id) {
    return data.exercises.find((e) => e.id === id) || null;
  }
  function exerciseName(id) {
    const ex = exercise(id);
    return ex ? ex.name : '(exercițiu necunoscut)';
  }
  function findExercise(name) {
    const k = key(name);
    return data.exercises.find((e) => key(e.name) === k) || null;
  }
  /** Adaugă un exercițiu (sau îl returnează pe cel existent cu același nume). */
  function addExercise(name) {
    name = norm(name);
    if (!name) return null;
    const existing = findExercise(name);
    if (existing) {
      if (existing.deleted) { delete existing.deleted; save(); }
      return existing;
    }
    const ex = { id: uid(), name };
    data.exercises.push(ex);
    save();
    return ex;
  }
  /** Returnează un mesaj de eroare sau null dacă a reușit. */
  function renameExercise(id, name) {
    name = norm(name);
    if (!name) return 'Numele nu poate fi gol.';
    const other = findExercise(name);
    if (other && other.id !== id) {
      return other.deleted
        ? 'Există deja un exercițiu șters cu acest nume.'
        : 'Există deja un exercițiu cu acest nume.';
    }
    const ex = exercise(id);
    if (!ex) return 'Exercițiul nu mai există.';
    ex.name = name;
    save();
    return null;
  }
  function exerciseUseCount(id) {
    return data.workouts.filter((w) => w.entries.some((en) => en.exerciseId === id)).length;
  }
  /**
   * Șterge exercițiul din listă și din template-uri.
   * Dacă apare în antrenamente vechi, îl păstrăm ascuns, ca istoricul să-și păstreze numele.
   */
  function deleteExercise(id) {
    data.templates.forEach((t) => { t.exerciseIds = t.exerciseIds.filter((x) => x !== id); });
    if (exerciseUseCount(id) > 0) {
      const ex = exercise(id);
      if (ex) ex.deleted = true;
    } else {
      data.exercises = data.exercises.filter((e) => e.id !== id);
    }
    save();
  }

  /* ---------- Template-uri ---------- */
  function templates() {
    const order = (t) => { const i = CYCLE.indexOf(t.name); return i === -1 ? 99 : i; };
    return data.templates.slice().sort((a, b) => order(a) - order(b) || byName(a, b));
  }
  function template(id) {
    return data.templates.find((t) => t.id === id) || null;
  }
  function createTemplate(name, exerciseIds = []) {
    const t = { id: uid(), name: norm(name) || 'Template nou', exerciseIds: exerciseIds.slice() };
    data.templates.push(t);
    save();
    return t;
  }
  function updateTemplate(id, changes) {
    const t = template(id);
    if (!t) return;
    if ('name' in changes) t.name = norm(changes.name);
    if ('exerciseIds' in changes) t.exerciseIds = changes.exerciseIds.slice();
    save();
  }
  function deleteTemplate(id) {
    data.templates = data.templates.filter((t) => t.id !== id);
    save();
  }

  /* ---------- Antrenamente ---------- */
  const newestFirst = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0);
  function workouts() {
    return data.workouts.slice().sort(newestFirst);
  }
  function workout(id) {
    return data.workouts.find((w) => w.id === id) || null;
  }

  const newEntry = (exerciseId) => ({ exerciseId, sets: ['', '', ''], kg: '', notes: '' });
  const entryHasData = (en) => en.sets.some((s) => String(s).trim()) || String(en.kg).trim() !== '' || String(en.notes).trim() !== '';
  const workoutHasData = (w) => w.entries.some(entryHasData);

  function createWorkout({ templateId = null, name = 'Antrenament', exerciseIds = [] } = {}) {
    const now = Date.now();
    const w = {
      id: uid(), date: UI.today(), name: norm(name) || 'Antrenament', templateId,
      entries: exerciseIds.map(newEntry), createdAt: now, updatedAt: now,
    };
    data.workouts.push(w);
    save();
    return w;
  }

  /* Salvare cu mică întârziere, ca să nu salvăm la fiecare literă. */
  let saveTimer = null;
  function saveSoon(w) {
    if (w) w.updatedAt = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 300);
  }
  function flush() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; save(); }
  }
  function deleteWorkout(id) {
    data.workouts = data.workouts.filter((w) => w.id !== id);
    save();
  }

  /** Ce ai făcut ultima dată la un exercițiu, într-un antrenament de dinaintea celui dat. */
  const order = (w) => (w.date || '') + '|' + String(w.createdAt || 0).padStart(15, '0');
  function lastPerformance(exerciseId, current) {
    const cur = current ? order(current) : '￿';
    let best = null;
    for (const w of data.workouts) {
      if (current && w.id === current.id) continue;
      const o = order(w);
      if (o >= cur || (best && o <= order(best.workout))) continue;
      const entry = w.entries.find((en) => en.exerciseId === exerciseId && entryHasData(en));
      if (entry) best = { workout: w, entry };
    }
    return best;
  }

  /** Kg ca număr („40”, „42,5”, „40 kg”), sau null pentru text (ex. „30s”). */
  function kgNumber(v) {
    const m = String(v || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(kg)?$/i);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }
  /** Totalul de repetări dintr-un exercițiu (doar seturile cu numere). */
  function totalReps(en) {
    return en.sets.reduce((sum, s) => sum + (/^\d+$/.test(String(s).trim()) ? parseInt(s, 10) : 0), 0);
  }
  /** Toate dățile când ai făcut exercițiul, cele mai noi primele. */
  function exerciseHistory(exerciseId) {
    const out = [];
    for (const w of workouts()) {
      for (const entry of w.entries) {
        if (entry.exerciseId === exerciseId && entryHasData(entry)) out.push({ workout: w, entry });
      }
    }
    return out;
  }
  /** Recordul (cea mai mare greutate) la fiecare exercițiu, cu data primei dăți când ai atins-o. */
  function records() {
    const best = new Map();
    for (const w of workouts().reverse()) {
      for (const entry of w.entries) {
        const kg = kgNumber(entry.kg);
        if (kg == null) continue;
        const cur = best.get(entry.exerciseId);
        if (!cur || kg > cur.kg) best.set(entry.exerciseId, { exerciseId: entry.exerciseId, kg, workout: w, entry });
      }
    }
    return [...best.values()]
      .filter((r) => exercise(r.exerciseId) && !exercise(r.exerciseId).deleted)
      .sort((a, b) => exerciseName(a.exerciseId).localeCompare(exerciseName(b.exerciseId), 'en', { sensitivity: 'base' }));
  }

  /** Lista de exerciții din antrenament diferă de cea din template? */
  function differsFromTemplate(w) {
    const t = w.templateId && template(w.templateId);
    if (!t) return false;
    const a = w.entries.map((en) => en.exerciseId);
    return a.length !== t.exerciseIds.length || a.some((x, i) => x !== t.exerciseIds[i]);
  }

  /** Sugestia pentru antrenamentul următor, după programul Upper 1 → Lower 1 → Upper 2 → Lower 2. */
  function suggestNext() {
    const last = workouts().find((w) => w.templateId && template(w.templateId));
    let nextName = CYCLE[0];
    let lastName = null;
    if (last) {
      lastName = template(last.templateId).name;
      const i = CYCLE.indexOf(lastName);
      if (i !== -1) nextName = CYCLE[(i + 1) % CYCLE.length];
    }
    const t = data.templates.find((x) => x.name === nextName) || null;
    return { template: t, name: nextName, lastName, lastDate: last ? last.date : null };
  }

  return {
    load, save, uid, norm, replaceAll,
    get saveFailed() { return saveFailed; },
    get raw() { return data; },
    exercises, exercise, exerciseName, findExercise, addExercise, renameExercise, exerciseUseCount, deleteExercise,
    templates, template, createTemplate, updateTemplate, deleteTemplate,
    workouts, workout, suggestNext,
    createWorkout, saveSoon, flush, deleteWorkout, newEntry, entryHasData, workoutHasData, lastPerformance, differsFromTemplate,
    kgNumber, totalReps, exerciseHistory, records,
  };
})();
