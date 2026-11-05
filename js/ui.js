/* UI — mici unelte refolosite de toate paginile. */
const UI = (() => {
  const PROPS = new Set(['value', 'checked', 'disabled', 'textContent', 'htmlFor', 'selected']);

  /** h('div', { class: 'x', onclick: fn }, 'text', copil, [copii]) → element HTML */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (PROPS.has(k)) el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    append(el, kids);
    return el;
  }
  function append(el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }

  /* ---------- Navigare ---------- */
  function go(route) {
    const target = route ? '#' + route : '#home';
    if (location.hash === target) App.render();
    else location.hash = target;
  }
  /** Redesenează pagina curentă, păstrând poziția de scroll. */
  function refresh() {
    const y = window.scrollY;
    App.render();
    window.scrollTo(0, y);
  }

  /** Scheletul unei pagini: bară de sus cu „Înapoi” + titlu, apoi conținutul. */
  function page({ title, back, wide }, ...content) {
    const header = h('header', { class: 'app-header' },
      back != null
        ? h('button', { class: 'back-btn', 'aria-label': 'Înapoi', onclick: () => go(back) }, icon('back'))
        : null,
      h('h1', { class: 'app-title' + (back == null ? ' app-title-home' : '') }, title),
    );
    return h('div', { class: 'page' + (wide ? ' page-wide' : '') }, header, h('main', { class: 'content' }, content));
  }

  /* ---------- Iconițe (SVG simple, fără fișiere externe) ---------- */
  const ICONS = {
    back: 'M15 5l-7 7 7 7',
    chev: 'M9 5l7 7-7 7',
    up: 'M6 15l6-6 6 6',
    down: 'M6 9l6 6 6-6',
    close: 'M6 6l12 12M18 6L6 18',
    plus: 'M12 5v14M5 12h14',
    search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-4-4',
    swap: 'M7 7h11l-3-3M17 17H6l3 3',
    trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', ICONS[name]);
    svg.append(p);
    return svg;
  }

  /* ---------- Mesaj scurt jos pe ecran ---------- */
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = h('div', { class: 'toast', role: 'status' }); document.body.append(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ---------- Fereastră care urcă de jos (sheet) ---------- */
  function sheet(build, { onClose } = {}) {
    const overlay = h('div', { class: 'sheet-overlay' });
    const box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' });
    overlay.append(box);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 180);
      document.removeEventListener('keydown', onKey);
      onClose && onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    append(box, [build(close)]);
    document.body.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    return close;
  }

  /** Confirmare (Da/Nu). Returnează Promise<true|false>. */
  function confirm(message, { ok = 'Da', danger = false, detail = '' } = {}) {
    return new Promise((resolve) => {
      let answer = false;
      sheet((close) => h('div', { class: 'stack' },
        h('p', { class: 'sheet-msg' }, message),
        detail ? h('p', { class: 'muted' }, detail) : null,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-ghost', onclick: close }, 'Renunță'),
          h('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), onclick: () => { answer = true; close(); } }, ok),
        ),
      ), { onClose: () => resolve(answer) });
    });
  }

  /**
   * Alegerea unui exercițiu din listă, cu căutare. Poți scrie și unul nou.
   * Returnează Promise<id exercițiu | null>.
   */
  function pickExercise({ title = 'Alege exercițiul', exclude = [] } = {}) {
    return new Promise((resolve) => {
      let picked = null;
      sheet((close) => {
        const input = h('input', {
          class: 'input', id: 'exercise-search', type: 'search', placeholder: 'Caută sau scrie un exercițiu nou',
          autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done',
        });
        const list = h('div', { class: 'pick-list' });
        const choose = (id) => { picked = id; close(); };
        const draw = () => {
          const q = Store.norm(input.value);
          const ql = q.toLowerCase();
          const items = Store.exercises().filter((e) => !exclude.includes(e.id) && e.name.toLowerCase().includes(ql));
          const exact = Store.exercises().some((e) => e.name.toLowerCase() === ql);
          list.replaceChildren(...[
            items.map((e) => h('button', { class: 'pick-item', onclick: () => choose(e.id) }, e.name)),
            q && !exact
              ? h('button', { class: 'pick-item pick-new', onclick: () => choose(Store.addExercise(q).id) },
                  icon('plus'), h('span', null, 'Adaugă exercițiu nou: ', h('b', null, q)))
              : null,
            !q && items.length === 0
              ? h('p', { class: 'empty' }, 'Lista e goală. Scrie numele primului exercițiu mai sus.')
              : null,
          ].flat().filter(Boolean));
        };
        input.addEventListener('input', draw);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { const first = list.querySelector('.pick-item'); first && first.click(); }
        });
        draw();
        setTimeout(() => input.focus(), 50);
        return h('div', { class: 'stack pick' },
          h('div', { class: 'sheet-head' }, h('h2', null, title),
            h('button', { class: 'icon-btn', 'aria-label': 'Închide', onclick: close }, icon('close'))),
          input, list);
      }, { onClose: () => resolve(picked) });
    });
  }

  /* ---------- Date calendaristice ---------- */
  const MONTHS = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'];
  const DAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  /** „5 nov. 2026” */
  function fmtDate(s, { weekday = false, year = true } = {}) {
    if (!s) return '';
    const d = parseDate(s);
    return (weekday ? DAYS[d.getDay()] + ', ' : '') + d.getDate() + ' ' + MONTHS[d.getMonth()] + (year ? ' ' + d.getFullYear() : '');
  }

  return { h, go, refresh, page, icon, toast, sheet, confirm, pickExercise, today, parseDate, fmtDate };
})();
const h = UI.h;
