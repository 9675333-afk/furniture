(() => {
  'use strict';

  const P = window.PROJECT;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');

  const BADGES = {
    ok: 'Согласовано',
    calc: 'Рассчитано',
    wait: 'Требует выбора',
    var: 'Есть варианты',
    info: 'В работе',
    none: 'Без отметки',
  };

  const MAT_KIND = {
    materials: 'Материал',
    fittings: 'Фурнитура',
    features: 'Особенность',
  };

  const plural = (n, one, few, many) => {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rich = (s) => esc(s).replace(/&lt;(\/?b)&gt;/g, '<$1>');

  const siteRoomBySpec = new Map(P.rooms.map((r) => [r.specNum, r]));

  /* ---------- reveal ---------- */

  const revealObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealObserver.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.03 });

  $$('.reveal').forEach((el) => revealObserver.observe(el));

  /* ---------- scroll spy ---------- */

  const rooms = $$('.room');
  const railEl = $('.room-rail');
  const railLinks = new Map($$('.rail-link[data-spy]').map((a) => [a.dataset.spy, a]));
  let spyTick = 0;

  function centerRailLink(link) {
    if (!railEl) return;
    const left = link.offsetLeft - (railEl.clientWidth - link.offsetWidth) / 2;
    railEl.scrollLeft = Math.max(0, Math.min(left, railEl.scrollWidth - railEl.clientWidth));
  }

  function updateSpy() {
    spyTick = 0;
    const probe = 150;
    let current = null;
    for (const room of rooms) {
      const top = room.getBoundingClientRect().top;
      if (top <= probe) current = room;
      else break;
    }
    railLinks.forEach((link, id) => {
      const on = current && current.id === id;
      link.classList.toggle('is-active', Boolean(on));
      if (on) centerRailLink(link);
    });
  }

  window.addEventListener('scroll', () => {
    if (!spyTick) spyTick = requestAnimationFrame(updateSpy);
  }, { passive: true });
  updateSpy();

  /* ---------- lightbox ---------- */

  const lb = $('#lightbox');
  const lbImg = $('#lb-img');
  const lbStage = $('#lb-stage');
  const lbRoom = $('#lb-room');
  const lbTitle = $('#lb-title');
  const lbCounter = $('#lb-counter');
  const lbThumbs = $('#lb-thumbs');
  const lbOpen = $('#lb-open');
  const lbZoom = $('#lb-zoom');
  const lbPrev = $('#lb-prev');
  const lbNext = $('#lb-next');
  const lbClose = $('#lb-close');

  const items = $$('[data-lightbox]').map((el) => ({
    el,
    src: el.dataset.src,
    room: el.dataset.room,
    roomId: el.closest('.room')?.id ?? '',
    kind: el.dataset.kind,
    n: Number(el.dataset.n),
    w: Number(el.dataset.w),
    h: Number(el.dataset.h),
  }));

  let lbIndex = -1;
  let lbTrigger = null;
  let zoomed = false;

  function sameRoom(i) {
    const room = items[lbIndex]?.roomId;
    return items.map((it, idx) => ({ it, idx })).filter(({ it }) => it.roomId === room);
  }

  function setZoom(on) {
    zoomed = on;
    lbStage.classList.toggle('is-zoomed', on);
    lbZoom.classList.toggle('is-on', on);
    lbZoom.textContent = on ? 'Вписать' : 'Увеличить';
  }

  function renderThumbs() {
    const roomItems = sameRoom();
    lbThumbs.innerHTML = roomItems.map(({ it, idx }) => `
      <button type="button" class="lb-thumb${idx === lbIndex ? ' is-active' : ''}" data-index="${idx}" aria-label="${esc(it.kind)} ${it.n}">
        <img src="${it.src}" alt="" loading="lazy">
      </button>`).join('');
    const active = $('.lb-thumb.is-active', lbThumbs);
    active?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function show(i) {
    if (!items.length) return;
    const total = items.length;
    lbIndex = (i + total) % total;
    const it = items[lbIndex];
    lbImg.src = it.src;
    lbImg.alt = `${it.room} — ${it.kind.toLowerCase()} ${it.n}`;
    lbImg.width = it.w;
    lbImg.height = it.h;
    lbRoom.textContent = it.room;
    lbTitle.textContent = `${it.kind} ${pad(it.n)}`;
    lbCounter.textContent = `${lbIndex + 1} / ${total}`;
    lbOpen.href = it.src;
    lbOpen.setAttribute('download', it.src.split('/').pop());
    lbOpen.textContent = 'Скачать';
    setZoom(false);
    lbStage.scrollTop = 0;
    lbStage.scrollLeft = 0;
    renderThumbs();
    const next = items[(lbIndex + 1) % total];
    if (next) { const img = new Image(); img.src = next.src; }
  }

  function openLightbox(index, trigger) {
    lbTrigger = trigger ?? document.activeElement;
    lb.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => lb.classList.add('is-open'));
    show(index);
    lbClose.focus({ preventScroll: true });
  }

  function closeLightbox() {
    lb.classList.remove('is-open');
    lb.hidden = true;
    document.documentElement.style.overflow = '';
    lbTrigger?.focus?.({ preventScroll: true });
    lbTrigger = null;
    lbIndex = -1;
  }

  items.forEach((it, idx) => {
    it.el.addEventListener('click', () => openLightbox(idx, it.el));
  });

  lbPrev.addEventListener('click', () => show(lbIndex - 1));
  lbNext.addEventListener('click', () => show(lbIndex + 1));
  lbClose.addEventListener('click', closeLightbox);
  lbZoom.addEventListener('click', () => setZoom(!zoomed));
  lbImg.addEventListener('click', () => { if (zoomed) setZoom(false); });
  lbStage.addEventListener('click', (e) => { if (e.target === lbStage && zoomed) setZoom(false); });
  lbThumbs.addEventListener('click', (e) => {
    const btn = e.target.closest('.lb-thumb');
    if (!btn) return;
    show(Number(btn.dataset.index));
  });

  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(lbIndex - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(lbIndex + 1); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(true); }
    else if (e.key === '-') { e.preventDefault(); setZoom(false); }
    else if (e.key === 'Tab') {
      const focusables = $$('button, a[href]', lb).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- materials versions ---------- */

  const state = {
    versions: P.versions.map((v) => JSON.parse(JSON.stringify(v))),
    activeId: (P.versions.find((v) => v.current) ?? P.versions[0]).id,
  };

  const listEl = $('#materials-list');
  const chipEl = $('#version-chip');
  const labelEl = $('#version-label');
  const noteEl = $('#version-note');
  const bannerEl = $('#import-banner');

  const activeVersion = () => state.versions.find((v) => v.id === state.activeId) ?? state.versions[0];

  function roomStatus(versionRoom) {
    const site = siteRoomBySpec.get(versionRoom.num);
    if (site) return site.status;
    const badges = (versionRoom.items || []).map((i) => i.badge);
    if (badges.includes('wait')) return { key: 'wait', label: 'Требует выбора' };
    if (badges.includes('var')) return { key: 'var', label: 'Есть варианты' };
    if (badges.length && badges.every((b) => b === 'ok')) return { key: 'ok', label: 'Согласовано' };
    return { key: 'info', label: 'В работе' };
  }

  function materialsMarkup(version) {
    return version.rooms.map((r) => {
      const site = siteRoomBySpec.get(r.num);
      const st = roomStatus(r);
      const items = (r.items || []).map((it) => {
        const kind = MAT_KIND[it.group] ?? '';
        return `
          <li class="mat-item">
            <div class="mi-head"><span class="mi-title">${esc(it.title)}</span>${kind ? `<span class="mi-kind mi-kind--${it.group}">${kind}</span>` : ''}</div>
            <p class="mi-text">${rich(it.text)}</p>
          </li>`;
      }).join('');
      return `
      <details class="mat-room" id="mat-${site?.num ?? esc(r.num)}">
        <summary>
          <span class="mat-num">${site ? pad(site.num) : '—'}</span>
          <span class="mat-name">${esc(site?.title ?? r.title ?? r.num)}</span>
          <span class="mat-count">${(r.items || []).length} ${plural((r.items || []).length, 'позиция', 'позиции', 'позиций')}</span>
          <span class="status status--${st.key}">${esc(st.label)}</span>
          <span class="mat-plus" aria-hidden="true"></span>
        </summary>
        <ul class="mat-items">${items}
        </ul>
      </details>`;
    }).join('');
  }

  function renderMaterials() {
    const v = activeVersion();
    chipEl.textContent = v.label;
    labelEl.textContent = v.imported ? `Импортированная версия · ${v.date}` : `Версия от ${formatDate(v.date)}`;
    noteEl.textContent = v.note || '';
    listEl.innerHTML = materialsMarkup(v);
    bannerEl.hidden = !v.imported;
    if (v.imported) {
      bannerEl.textContent = `Показан предпросмотр версии «${v.label}». Она не сохранена на сайте — чтобы закрепить состав, передайте JSON дизайнеру.`;
    }
  }

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function downloadJson(version) {
    const payload = {
      id: version.id,
      label: version.label,
      date: version.date,
      note: version.note,
      rooms: version.rooms.map((r) => ({
        num: r.num,
        title: r.title,
        siteNum: r.siteNum,
        items: r.items,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `materialy-${version.label.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  $('#btn-export').addEventListener('click', () => downloadJson(activeVersion()));
  $('#btn-export-2').addEventListener('click', () => downloadJson(activeVersion()));

  renderMaterials();

  /* ---------- versions dialog ---------- */

  const dialog = $('#versions-dialog');
  const versionList = $('#version-list');
  const versionsClose = $('#versions-close');
  const importFile = $('#import-file');
  const hintEl = $('.dialog-hint', dialog);
  let dialogTrigger = null;

  function renderVersionList() {
    versionList.innerHTML = state.versions.map((v) => `
      <button type="button" class="version-row${v.id === state.activeId ? ' is-active' : ''}" data-id="${esc(v.id)}">
        <span class="vr-chip">${esc(v.label)}</span>
        <span>
          <span class="vr-note">${esc(v.note || 'Без описания')}</span>
          ${v.imported ? '<span class="vr-tag">предпросмотр</span>' : v.current ? '<span class="vr-tag">текущая на сайте</span>' : ''}
        </span>
        <span class="vr-date">${esc(formatDate(v.date))}</span>
      </button>`).join('');
  }

  function openDialog(trigger) {
    dialogTrigger = trigger ?? document.activeElement;
    renderVersionList();
    dialog.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    versionsClose.focus({ preventScroll: true });
  }

  function closeDialog() {
    dialog.hidden = true;
    document.documentElement.style.overflow = '';
    dialogTrigger?.focus?.({ preventScroll: true });
    dialogTrigger = null;
  }

  $('#btn-history').addEventListener('click', (e) => openDialog(e.currentTarget));
  versionsClose.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });

  versionList.addEventListener('click', (e) => {
    const row = e.target.closest('.version-row');
    if (!row) return;
    state.activeId = row.dataset.id;
    renderVersionList();
    renderMaterials();
  });

  document.addEventListener('keydown', (e) => {
    if (dialog.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
  });

  $('#btn-import').addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    importFile.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const version = normalizeImport(parsed);
      state.versions.push(version);
      state.activeId = version.id;
      renderVersionList();
      renderMaterials();
      hintEl.textContent = `Версия «${version.label}» открыта как предпросмотр. На сайте она не сохраняется.`;
      hintEl.classList.remove('is-error');
      closeDialog();
      $('#materials').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      hintEl.textContent = `Не удалось прочитать файл: ${err.message}. Нужен JSON, выгруженный кнопкой «Скачать JSON».`;
      hintEl.classList.add('is-error');
    }
  });

  function normalizeImport(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('ожидался объект');
    let rooms = raw.rooms;
    if (!Array.isArray(rooms) && Array.isArray(raw.materialy)) rooms = raw.materialy;
    if (!Array.isArray(rooms)) throw new Error('нет поля rooms');

    const normalized = rooms.map((r) => {
      const num = String(r.num ?? r.specNum ?? '').padStart(2, '0');
      const site = siteRoomBySpec.get(num) ?? P.rooms.find((x) => x.title === r.title);
      const items = Array.isArray(r.items) ? r.items : [];
      return {
        num: site?.specNum ?? num,
        title: r.title ?? site?.title ?? num,
        siteNum: r.siteNum ?? site?.num,
        items: items.map((it) => ({
          id: it.id ?? '',
          title: String(it.title ?? 'Позиция'),
          badge: BADGES[it.badge] ? it.badge : 'info',
          text: String(it.text ?? ''),
        })),
      };
    }).filter((r) => r.items.length);

    if (!normalized.length) throw new Error('в файле нет позиций');

    const label = String(raw.label ?? raw.version ?? 'Импорт').trim();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date ?? '')) ? raw.date : new Date().toISOString().slice(0, 10);
    return {
      id: 'import-' + Date.now(),
      label: /^v/i.test(label) ? label : 'v' + label,
      date,
      note: String(raw.note ?? 'Версия материалов, загруженная для предпросмотра.'),
      imported: true,
      rooms: normalized,
    };
  }

  /* ---------- print ---------- */

  let openedForPrint = [];
  window.addEventListener('beforeprint', () => {
    openedForPrint = $$('.mat-room:not([open]), .room-spec:not([open])');
    openedForPrint.forEach((d) => { d.open = true; });
    $$('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
  });
  window.addEventListener('afterprint', () => {
    openedForPrint.forEach((d) => { d.open = false; });
    openedForPrint = [];
  });

  $('#btn-print').addEventListener('click', () => window.print());
})();
