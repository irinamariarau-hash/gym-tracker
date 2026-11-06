/* App — pornește aplicația și alege ce pagină să arate, după adresa din bara de sus (#exercises etc.). */
const App = (() => {
  const routes = [
    [/^(home)?$/, () => Pages.home()],
    [/^exercises$/, () => Pages.exercises()],
    [/^exercise-(\w+)$/, (id) => Pages.exercise(id)],
    [/^templates$/, () => Pages.templates()],
    [/^template-(\w+)$/, (id) => Pages.template(id)],
    [/^new$/, () => (Pages.newWorkout ? Pages.newWorkout() : Pages.soon('Antrenament nou', 2))],
    [/^workout-(\w+)$/, (id) => (Pages.workout ? Pages.workout(id) : Pages.soon('Antrenament', 2))],
    [/^history$/, () => (Pages.history ? Pages.history() : Pages.soon('Istoric', 3))],
    [/^records$/, () => (Pages.records ? Pages.records() : Pages.soon('Recorduri', 3))],
    [/^backup$/, () => (Pages.backup ? Pages.backup() : Pages.soon('Backup', 4))],
  ];

  let current = null;
  let previous = null;

  /** Unde duce butonul „Înapoi” dintr-un antrenament: în Istoric dacă de acolo ai venit, altfel acasă. */
  function backFor() {
    return previous && /^(history|exercise-\w+)$/.test(previous) ? previous : '';
  }

  /** Un antrenament în care n-ai scris nimic nu rămâne salvat când îl părăsești. */
  function dropIfEmpty(route) {
    const m = route && route.match(/^workout-(\w+)$/);
    if (!m) return;
    const w = Store.workout(m[1]);
    if (w && !Store.workoutHasData(w)) {
      Store.deleteWorkout(w.id);
      UI.toast('Antrenamentul gol nu a fost păstrat');
    }
  }

  function render() {
    Store.flush();
    const route = decodeURIComponent(location.hash.slice(1));
    if (route !== current) {
      dropIfEmpty(current);
      if (!/^workout-/.test(route) || !/^workout-/.test(current || '')) previous = current;
      current = route;
    }
    let view = null;
    for (const [re, fn] of routes) {
      const m = route.match(re);
      if (m) { view = fn(m[1]); break; }
    }
    if (!view) view = Pages.home();
    document.querySelectorAll('.sheet-overlay').forEach((o) => o.remove());
    document.getElementById('app').replaceChildren(view);
    if (Store.saveFailed) UI.toast('Atenție: nu am putut salva datele în telefon.');
  }

  function start() {
    Store.load();
    window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
    // Salvează imediat dacă închizi aplicația sau treci la altă aplicație.
    window.addEventListener('pagehide', Store.flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) Store.flush(); });
    render();
  }

  return { render, start, backFor };
})();

App.start();
