/*
 * Chart — grafic simplu desenat în SVG (fără biblioteci).
 * Fiecare antrenament e un punct, la distanțe egale; atingi graficul ca să vezi valoarea.
 *   Chart.draw({ points: [{ y, date, label }], kind: 'line' | 'bar', unit: 'kg' })
 */
const Chart = (() => {
  const W = 340, H = 200, L = 40, R = 14, T = 22, B = 28;
  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    return e;
  }
  const fmt = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');

  function niceTicks(min, max, count = 4) {
    if (min === max) { min -= 1; max += 1; }
    const raw = (max - min) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const step = (n >= 7.5 ? 10 : n >= 3.5 ? 5 : n >= 1.5 ? 2 : 1) * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { lo, hi, ticks };
  }

  function draw({ points, kind = 'line', unit = '' }) {
    const n = points.length;
    const ys = points.map((p) => p.y);
    const { lo, hi, ticks } = niceTicks(kind === 'bar' ? 0 : Math.min(...ys), Math.max(...ys));
    const plotW = W - L - R, plotH = H - T - B;
    const band = plotW / n;
    const x = (i) => (kind === 'bar' || n === 1 ? L + band * (i + 0.5) : L + (plotW * i) / (n - 1));
    const y = (v) => T + plotH - ((v - lo) / (hi - lo)) * plotH;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img' });

    // Grilă și axa Y
    for (const t of ticks) {
      svg.append(el('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), class: 'chart-grid' }));
      svg.append(el('text', { x: L - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'chart-axis' }, fmt(t)));
    }
    // Axa X: prima și ultima dată (și una la mijloc dacă e loc)
    const xIdx = n === 1 ? [0] : n < 5 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
    xIdx.forEach((i, k) => {
      const anchor = n === 1 || kind === 'bar' ? 'middle' : k === 0 ? 'start' : k === xIdx.length - 1 ? 'end' : 'middle';
      svg.append(el('text', { x: x(i), y: H - 8, 'text-anchor': anchor, class: 'chart-axis' }, UI.fmtDate(points[i].date, { year: false })));
    });

    if (kind === 'bar') {
      const bw = Math.max(3, Math.min(18, band - 4));
      points.forEach((p, i) => {
        const x0 = x(i) - bw / 2, y0 = y(p.y), y1 = y(0), r = Math.min(4, bw / 2, y1 - y0);
        const d = y1 - y0 < 0.5 ? '' : `M${x0},${y1}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${y1}Z`;
        if (d) svg.append(el('path', { d, class: 'chart-bar', 'data-i': i }));
      });
    } else {
      if (n > 1) svg.append(el('path', { d: points.map((p, i) => (i ? 'L' : 'M') + x(i) + ',' + y(p.y)).join(''), class: 'chart-line' }));
      points.forEach((p, i) => {
        if (n <= 30 || i === n - 1) svg.append(el('circle', { cx: x(i), cy: y(p.y), r: 4, class: 'chart-dot', 'data-i': i }));
      });
    }
    // Valoarea ultimului punct, scrisă direct pe grafic
    const lastI = n - 1;
    svg.append(el('text', {
      x: Math.min(x(lastI), W - R), y: y(points[lastI].y) - 10, 'text-anchor': n === 1 || kind === 'bar' ? 'middle' : 'end', class: 'chart-value',
    }, fmt(points[lastI].y) + (unit ? ' ' + unit : '')));

    // Atingere: linie verticală + bulă cu valoarea
    const cross = el('line', { y1: T, y2: T + plotH, class: 'chart-cross', visibility: 'hidden' });
    svg.append(cross);
    const tip = h('div', { class: 'chart-tip', hidden: true });
    const wrap = h('div', { class: 'chart' }, svg, tip);

    const show = (ev) => {
      const box = svg.getBoundingClientRect();
      const sx = ((ev.clientX - box.left) / box.width) * W;
      let best = 0;
      for (let i = 1; i < n; i++) if (Math.abs(x(i) - sx) < Math.abs(x(best) - sx)) best = i;
      const p = points[best];
      cross.setAttribute('x1', x(best)); cross.setAttribute('x2', x(best)); cross.setAttribute('visibility', 'visible');
      svg.querySelectorAll('.is-active').forEach((m) => m.classList.remove('is-active'));
      const mark = svg.querySelector(`[data-i="${best}"]`);
      mark && mark.classList.add('is-active');
      tip.replaceChildren(h('b', null, fmt(p.y) + (unit ? ' ' + unit : '')), h('span', null, UI.fmtDate(p.date)), p.label ? h('span', null, p.label) : null);
      tip.hidden = false;
      const left = (x(best) / W) * 100;
      tip.style.left = left + '%';
      tip.style.transform = `translateX(${left < 25 ? '0' : left > 75 ? '-100%' : '-50%'})`;
    };
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) show(e); });
    svg.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); }
    });
    return wrap;
  }

  return { draw };
})();
