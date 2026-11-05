/* Pagina principală */
var Pages = window.Pages || (window.Pages = {});

Pages.home = () => {
  const sug = Store.suggestNext();
  const workoutsCount = Store.workouts().length;

  const suggestion = h('section', { class: 'card suggest' },
    h('p', { class: 'eyebrow' }, 'Sugestie pentru azi'),
    h('p', { class: 'suggest-name' }, sug.name),
    h('p', { class: 'muted' },
      sug.lastName
        ? 'Ultimul a fost ' + sug.lastName + ', pe ' + UI.fmtDate(sug.lastDate, { year: false }) + '.'
        : 'Încă nu ai antrenamente salvate, așa că începi cu primul din program.'),
    sug.template
      ? h('button', { class: 'btn btn-soft', onclick: () => Pages.startFromTemplate(sug.template.id) },
          'Începe ' + sug.name)
      : h('p', { class: 'muted small' }, 'Nu am găsit template-ul „' + sug.name + '”.'),
  );

  const nav = [
    ['history', 'Istoric', workoutsCount ? workoutsCount + (workoutsCount === 1 ? ' antrenament' : ' antrenamente') : 'Niciun antrenament încă'],
    ['templates', 'Template-uri', Store.templates().length + ' salvate'],
    ['exercises', 'Exerciții', Store.exercises().length + ' în listă'],
    ['records', 'Recorduri', 'Cea mai mare greutate la fiecare exercițiu'],
    ['backup', 'Backup', 'Salvează sau restaurează datele'],
  ];

  return UI.page({ title: 'Jurnal de sală' },
    h('button', { class: 'btn btn-primary btn-xl', onclick: () => UI.go('new') }, UI.icon('plus'), 'Antrenament nou'),
    suggestion,
    h('nav', { class: 'list' },
      nav.map(([route, label, sub]) =>
        h('button', { class: 'list-row', onclick: () => UI.go(route) },
          h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, label), h('span', { class: 'row-sub' }, sub)),
          UI.icon('chev'))),
    ),
  );
};

/* Până la Etapa 2, pornirea unui antrenament duce la o pagină de așteptare. */
Pages.startFromTemplate = Pages.startFromTemplate || (() => UI.go('new'));

/* Pagină temporară pentru părțile care vin în etapele următoare. */
Pages.soon = (title, stage) => UI.page({ title, back: '' },
  h('div', { class: 'card empty-card' },
    h('p', { class: 'suggest-name' }, 'În lucru'),
    h('p', { class: 'muted' }, 'Pagina asta apare în Etapa ' + stage + '.'),
  ),
);
