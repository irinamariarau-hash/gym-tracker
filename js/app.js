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

  function render() {
    const route = decodeURIComponent(location.hash.slice(1));
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
    render();
  }

  return { render, start };
})();

App.start();
