// Тема 07 «Оптова Лавка»: меню, модалка заказа, галерея, сортировка таблицы,
// подбор коробки по размерам Д×Ш×В и калькулятор тиража
(function () {
  'use strict';

  // ---------- Утилиты ----------
  // Число из строки вида «120 мм», «від 1 500 шт.», «-10%»; 0, если числа нет
  function num(s) {
    if (s == null) return 0;
    var m = String(s).replace(/\s/g, '').replace(',', '.').match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  }
  // 12345.5 -> «12 346» (узкий неразрывный пробел между тысячами)
  function fmt(v, dec) {
    var n = dec ? v.toFixed(dec) : String(Math.round(v));
    var parts = n.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join(',');
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---------- Бургер-меню ----------
  var burger = qs('#burger'), nav = qs('#nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.classList.toggle('is-open', open);
    });
  }

  // ---------- Модальное окно заказа ----------
  var modal = qs('#order-modal'), omProduct = qs('#om-product'), omQty = qs('#om-qty'), omMail = qs('#om-mail');
  function openModal(name, sku, qty, total) {
    if (!modal) return;
    var label = name + (sku ? ' (арт. ' + sku + ')' : '');
    omProduct.textContent = label;
    var qtyLine = '';
    if (qty) {
      qtyLine = 'Кількість: ' + fmt(qty) + ' шт.' + (total ? ' · орієнтовно ' + fmt(total) + ' грн' : '');
      omQty.textContent = qtyLine; omQty.hidden = false;
    } else { omQty.hidden = true; }
    if (omMail) {
      var base = omMail.getAttribute('href').split('?')[0];
      var body = 'Доброго дня! Цікавить партія: ' + label + '\nКількість: ' + (qty ? fmt(qty) + ' шт.' : '') + '\nМісто доставки: \nТелефон для зв\'язку: ';
      omMail.setAttribute('href', base + '?subject=' + encodeURIComponent('Замовлення коробок: ' + label) + '&body=' + encodeURIComponent(body));
    }
    modal.hidden = false; document.body.classList.add('no-scroll');
  }
  function closeModal() { if (modal) { modal.hidden = true; document.body.classList.remove('no-scroll'); } }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.js-order');
    if (b) { e.preventDefault(); openModal(b.dataset.name, b.dataset.sku, parseInt(b.dataset.qty || '0', 10), parseFloat(b.dataset.total || '0')); }
    if (e.target === modal || e.target.id === 'om-close') closeModal();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  // ---------- Галерея товара ----------
  var galMain = qs('#gal-main');
  qsa('.gallery__thumb').forEach(function (t) {
    t.addEventListener('click', function () {
      galMain.src = t.dataset.src;
      qsa('.gallery__thumb').forEach(function (x) { x.classList.remove('is-active'); });
      t.classList.add('is-active');
    });
  });

  // ---------- Данные о коробках на странице (строки таблицы и карточки) ----------
  var grid = qs('#grid');
  var boxes = grid ? qsa('.js-box', grid) : [];
  boxes.forEach(function (el, i) {
    el.dataset.i = i;
    var l = num(el.dataset.l), w = num(el.dataset.w), h = num(el.dataset.h);
    el.dataset.ln = l; el.dataset.wn = w; el.dataset.hn = h;
    el.dataset.vol = (l && w && h) ? l * w * h : 0;
    el.dataset.pricen = num(el.dataset.price);
    el.dataset.minn = num(el.dataset.min);
  });
  function reorder(list) { list.forEach(function (el) { grid.appendChild(el); }); }

  // ---------- Сортировка: select на странице категории ----------
  var sortSel = qs('#sort');
  if (sortSel && grid) {
    sortSel.addEventListener('change', function () {
      var v = sortSel.value, list = boxes.slice();
      list.sort(function (a, b) {
        if (v === 'price-asc') return a.dataset.pricen - b.dataset.pricen;
        if (v === 'price-desc') return b.dataset.pricen - a.dataset.pricen;
        if (v === 'vol-asc') return a.dataset.vol - b.dataset.vol;
        if (v === 'vol-desc') return b.dataset.vol - a.dataset.vol;
        return a.dataset.i - b.dataset.i;
      });
      reorder(list);
    });
  }

  // ---------- Сортировка таблицы каталога по столбцам ----------
  var table = qs('#boxtable');
  if (table && grid) {
    var sortBtns = qsa('.sort', table);
    sortBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.dataset.sort;
        var dir = btn.classList.contains('is-asc') ? 'desc' : 'asc';
        sortBtns.forEach(function (b) { b.classList.remove('is-asc', 'is-desc'); });
        btn.classList.add(dir === 'asc' ? 'is-asc' : 'is-desc');
        var list = boxes.slice();
        list.sort(function (a, b) {
          var r;
          if (key === 'vol') r = a.dataset.vol - b.dataset.vol;
          else if (key === 'price') r = a.dataset.pricen - b.dataset.pricen;
          else if (key === 'min') r = a.dataset.minn - b.dataset.minn;
          else r = String(a.dataset[key] || '').localeCompare(String(b.dataset[key] || ''), 'uk');
          if (r === 0) r = a.dataset.i - b.dataset.i;
          return dir === 'asc' ? r : -r;
        });
        reorder(list);
      });
    });
  }

  // ---------- Фильтр по типу (чипсы на странице каталога) ----------
  var chips = qs('#type-chips'), curType = '';
  if (chips && grid) {
    chips.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      qsa('.chip', chips).forEach(function (x) { x.classList.remove('is-active'); });
      c.classList.add('is-active');
      curType = c.dataset.type || '';
      applyFilters();
    });
  }

  // ---------- Подбор коробки по размерам Д×Ш×В ----------
  var picker = qs('#picker'), note = qs('#filter-note'), resetBtn = qs('#picker-reset'), countEl = qs('#shown-count');
  var TOL = 0.15; // допуск ±15% на каждый размер
  function req() {
    if (!picker) return null;
    var r = { l: num(picker.l.value), w: num(picker.w.value), h: num(picker.h.value) };
    r.any = r.l || r.w || r.h;
    return r;
  }
  function within(box, want) { return Math.abs(box - want) <= Math.max(want * TOL, 10); }
  // Оценка близости: 0 — точное совпадение; null — размеров у коробки нет
  function score(el, r) {
    var L = +el.dataset.ln, W = +el.dataset.wn, H = +el.dataset.hn;
    if (r.l && r.w && r.h) {
      if (!(L && W && H)) return null;
      var a = [L, W, H].sort(function (x, y) { return y - x; }), b = [r.l, r.w, r.h].sort(function (x, y) { return y - x; });
      var s = 0, ok = true;
      for (var i = 0; i < 3; i++) { s += Math.abs(a[i] - b[i]) / b[i]; if (!within(a[i], b[i])) ok = false; }
      return { s: s, ok: ok };
    }
    var pairs = [[r.l, L], [r.w, W], [r.h, H]], s2 = 0, ok2 = true, n = 0;
    pairs.forEach(function (p) {
      if (!p[0]) return;
      n++;
      if (!p[1]) { ok2 = false; s2 += 1; return; }
      s2 += Math.abs(p[1] - p[0]) / p[0];
      if (!within(p[1], p[0])) ok2 = false;
    });
    return n ? { s: s2, ok: ok2 } : null;
  }
  function applyFilters() {
    if (!grid) return;
    var r = req(), shown = 0, list = boxes.slice();
    var typed = function (el) { return !curType || el.dataset.type === curType; };
    boxes.forEach(function (el) { el.classList.remove('is-match', 'is-exact', 'is-hidden'); });
    if (r && r.any) {
      var matches = [], near = [];
      boxes.forEach(function (el) {
        var sc = score(el, r);
        el._sc = sc ? sc.s : 99;
        if (typed(el) && sc && sc.ok) matches.push(el); else if (typed(el) && sc) near.push(el);
      });
      var dimsText = [r.l || '—', r.w || '—', r.h || '—'].join(' × ') + ' мм';
      if (matches.length) {
        matches.sort(function (a, b) { return a._sc - b._sc; });
        matches.forEach(function (el) { el.classList.add(el._sc < 0.12 ? 'is-exact' : 'is-match'); });
        boxes.forEach(function (el) { if (matches.indexOf(el) < 0) el.classList.add('is-hidden'); });
        reorder(matches.concat(boxes.filter(function (el) { return matches.indexOf(el) < 0; })));
        shown = matches.length;
        setNote('Під розмір <b class="mono">' + dimsText + '</b> підходить ' + shown + ' ' + plural(shown, ['коробка', 'коробки', 'коробок']) + ' (допуск ±15%). Точні збіги виділено.');
      } else {
        near.sort(function (a, b) { return a._sc - b._sc; });
        var top = near.slice(0, 8);
        top.forEach(function (el) { el.classList.add('is-match'); });
        boxes.forEach(function (el) { if (top.indexOf(el) < 0) el.classList.add('is-hidden'); });
        reorder(top.concat(boxes.filter(function (el) { return top.indexOf(el) < 0; })));
        shown = top.length;
        setNote('Точних збігів під <b class="mono">' + dimsText + '</b> немає — показуємо ' + shown + ' найближчих за розміром. Під тираж виготовимо коробку за вашими розмірами.');
      }
      if (resetBtn) resetBtn.hidden = false;
    } else {
      boxes.forEach(function (el) { if (!typed(el)) el.classList.add('is-hidden'); else shown++; });
      if (curType) setNote('Показано тип: ' + shown + ' ' + plural(shown, ['позиція', 'позиції', 'позицій']) + '.'); else setNote('');
      if (resetBtn) resetBtn.hidden = true;
    }
    if (countEl) countEl.textContent = shown + ' поз.';
  }
  function plural(n, f) { var m = n % 10, mm = n % 100; if (m === 1 && mm !== 11) return f[0]; if (m >= 2 && m <= 4 && (mm < 10 || mm >= 20)) return f[1]; return f[2]; }
  function setNote(html) {
    if (!note) return;
    if (!html) { note.hidden = true; note.innerHTML = ''; return; }
    note.innerHTML = '<span>' + html + '</span>' + (resetBtn ? '<button type="button" class="link" id="note-reset">Скинути фільтр</button>' : '');
    note.hidden = false;
  }
  function resetPicker() {
    if (!picker) return;
    picker.l.value = ''; picker.w.value = ''; picker.h.value = '';
    if (history.replaceState) history.replaceState(null, '', location.pathname);
    applyFilters();
  }
  if (picker && grid) {
    // Параметры из адреса /catalog/?l=..&w=..&h=..
    var params = new URLSearchParams(location.search);
    ['l', 'w', 'h'].forEach(function (k) { if (params.get(k)) picker[k].value = num(params.get(k)) || ''; });
    picker.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = req(), p = new URLSearchParams();
      ['l', 'w', 'h'].forEach(function (k) { if (r[k]) p.set(k, r[k]); });
      if (history.replaceState) history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p.toString() : ''));
      applyFilters();
      var first = qs('.is-match, .is-exact', grid);
      if (first && first.getBoundingClientRect().top > window.innerHeight * 0.8) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    picker.addEventListener('input', function () { applyFilters(); });
    if (resetBtn) resetBtn.addEventListener('click', resetPicker);
    document.addEventListener('click', function (e) { if (e.target.id === 'note-reset') resetPicker(); });
    if (req().any) applyFilters();
  }

  // ---------- Калькулятор тиража на карточке товара ----------
  var calc = qs('#calc');
  if (calc) {
    var price = num(calc.dataset.price);
    var tiers = [];
    try {
      JSON.parse(calc.dataset.tiers || '[]').forEach(function (t) {
        var q = num(t[0]), pct = num(t[1]);
        if (q && pct) tiers.push({ qty: q, pct: pct, label: t[0] + ' ' + t[1] });
      });
    } catch (err) { tiers = []; }
    tiers.sort(function (a, b) { return a.qty - b.qty; });
    var minQty = num(calc.dataset.min) || 1;
    var qtyIn = qs('#calc-qty'), unitEl = qs('#calc-unit'), discEl = qs('#calc-disc'), tierEl = qs('#calc-tier'), totalEl = qs('#calc-total'), hintEl = qs('#calc-hint'), presets = qs('#calc-presets'), orderBtn = qs('#order-btn');
    qtyIn.min = 1; qtyIn.value = minQty;
    qtyIn.step = minQty >= 100 ? 50 : (minQty >= 10 ? 10 : 1);
    // Быстрые значения: минимальная партия, пороги скидок и удвоенный верхний порог
    var presetVals = [minQty];
    tiers.forEach(function (t) { if (presetVals.indexOf(t.qty) < 0) presetVals.push(t.qty); });
    if (tiers.length) { var dbl = tiers[tiers.length - 1].qty * 2; if (presetVals.indexOf(dbl) < 0) presetVals.push(dbl); }
    presetVals.sort(function (a, b) { return a - b; });
    presetVals.forEach(function (v) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = fmt(v); b.dataset.v = v;
      b.addEventListener('click', function () { qtyIn.value = v; recalc(); });
      presets.appendChild(b);
    });
    function recalc() {
      var q = Math.max(0, Math.floor(num(qtyIn.value)));
      var tier = null;
      tiers.forEach(function (t) { if (q >= t.qty) tier = t; });
      var unit = tier ? price * (100 - tier.pct) / 100 : price;
      var total = unit * q;
      unitEl.textContent = fmt(unit, unit % 1 ? 2 : 0);
      if (tier) { discEl.textContent = '−' + tier.pct + '% (було ' + fmt(price, price % 1 ? 2 : 0) + ')'; discEl.hidden = false; tierEl.textContent = tier.label; }
      else { discEl.hidden = true; tierEl.textContent = 'немає'; }
      totalEl.textContent = fmt(total);
      qsa('button', presets).forEach(function (b) { b.classList.toggle('is-active', +b.dataset.v === q); });
      var next = null;
      tiers.forEach(function (t) { if (!next && q < t.qty) next = t; });
      hintEl.classList.remove('is-good');
      if (q < minQty) hintEl.textContent = 'Мінімальна партія — ' + fmt(minQty) + ' шт.';
      else if (next) hintEl.textContent = 'Додайте ще ' + fmt(next.qty - q) + ' шт. — і ціна за штуку буде ' + fmt(price * (100 - next.pct) / 100, 2) + ' грн (' + next.label + ').';
      else { hintEl.textContent = 'Максимальна знижка застосована. Для більших тиражів зателефонуйте — порахуємо індивідуально.'; hintEl.classList.add('is-good'); }
      if (orderBtn) { orderBtn.dataset.qty = q; orderBtn.dataset.total = Math.round(total); }
    }
    qtyIn.addEventListener('input', recalc);
    recalc();
  }
})();
