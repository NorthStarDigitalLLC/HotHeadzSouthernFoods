(() => {
  'use strict';

  const PIN_HASH = '77334823791bea53e508ba59387c1287c8da962026769657b4686756db4b7bc8';
  const SESSION_PIN_KEY = 'hhPin';
  const AI_FILE_LIMIT = 4;

  const clone = value => JSON.parse(JSON.stringify(value));

  // The finished image is sized from the background picture itself, so an
  // uploaded photo never gets black bars down the side. The longest edge is
  // normalised to this many pixels so every published menu is the same weight.
  const CANVAS_LONG_EDGE = 1350;
  // Font sizes below are tuned against a 1350px tall image. Anything taller or
  // shorter scales from this so text keeps its proportion on any background.
  const FONT_BASE_HEIGHT = 1350;

  const builtInBackground = {
    id: 'hotheadz-original',
    name: 'Original Hot Headz menu',
    url: '/images/FBMenu.png',
    source: 'website'
  };

  // Every block of text the studio prints is a named box. Staff drag these
  // outlines on the Backgrounds & boxes screen, so a brand new background can
  // be laid out without anybody touching code. Box positions are percentages
  // of the background picture, not of the canvas, so they stay glued to the
  // artwork whatever shape the picture is.
  const REGION_DEFS = [
    { key: 'header', label: 'Date header', help: 'The weekday and date printed across the top.' },
    { key: 'breakfast', label: 'Breakfast', help: 'The standing breakfast list, with this weekday’s breakfast hours.' },
    { key: 'breakfastSandwiches', label: 'Breakfast sandwiches', help: 'The “Same Daily” sandwiches beside the breakfast list.' },
    { key: 'salad', label: 'Salad bar', help: 'Lettuce and toppings.' },
    { key: 'saladDressings', label: 'Dressings', help: 'The dressings column beside the salad bar.' },
    { key: 'lunch', label: 'Today’s lunch', help: 'The only section that changes daily — it comes from the draft you just built.' },
    { key: 'drinks', label: 'Drinks', help: 'The drinks list.' },
    { key: 'dessert', label: 'Dessert', help: 'The dessert list.' },
    { key: 'footer', label: 'Website line', help: 'The “for pricing and hours” line along the bottom.' }
  ];
  const REGION_KEYS = REGION_DEFS.map(def => def.key);

  // Starting positions, measured against the blank Hot Headz board so each
  // block lands inside its own panel: breakfast and its sandwiches share the
  // big left panel, salad and dressings share the right one, and lunch, drinks
  // and dessert take the three panels along the bottom.
  const DEFAULT_REGIONS = {
    header: { x: 15, y: 4.6, w: 70, h: 10, scale: 1, align: 'center' },
    breakfast: { x: 4.4, y: 33.4, w: 25, h: 25.5, scale: .78, align: 'left' },
    breakfastSandwiches: { x: 31, y: 37.6, w: 25, h: 21, scale: .78, align: 'left' },
    salad: { x: 61, y: 31, w: 18.5, h: 39, scale: .66, align: 'left' },
    saladDressings: { x: 80.5, y: 35, w: 16, h: 34, scale: .66, align: 'left' },
    lunch: { x: 4.4, y: 60.8, w: 22, h: 31.5, scale: .82, align: 'left' },
    drinks: { x: 30.6, y: 60.8, w: 24, h: 31.5, scale: .78, align: 'left' },
    dessert: { x: 61.5, y: 73.2, w: 33, h: 19, scale: .82, align: 'left' },
    footer: { x: 18, y: 94.6, w: 64, h: 3.6, scale: .62, align: 'center' }
  };

  // The same boxes as the studio used to hard-code them: percentages of the
  // old fixed 1080x1350 canvas. Layouts saved before boxes existed are read
  // with these numbers and then converted onto the picture itself.
  const LEGACY_REGIONS = {
    header: { x: 5, y: 4.05, w: 90, h: 9.6, scale: 1, align: 'center' },
    breakfast: { x: 10.5, y: 34, w: 43, h: 25, scale: .82, align: 'left' },
    breakfastSandwiches: { x: 31, y: 37.6, w: 25, h: 21, scale: .78, align: 'left' },
    salad: { x: 59, y: 34, w: 32, h: 32, scale: .72, align: 'left' },
    saladDressings: { x: 80.5, y: 35, w: 16, h: 34, scale: .66, align: 'left' },
    drinks: { x: 32.5, y: 65, w: 20, h: 25, scale: .8, align: 'left' },
    lunch: { x: 9.5, y: 64.5, w: 22, h: 29, scale: 1, align: 'left' },
    dessert: { x: 61.5, y: 73.2, w: 33, h: 19, scale: .82, align: 'left' },
    footer: { x: 18, y: 94.6, w: 64, h: 3.6, scale: .62, align: 'center' }
  };
  const LEGACY_CANVAS = { width: 1080, height: 1350 };

  const builtInLayout = {
    id: 'hotheadz-original-layout',
    name: 'Original Menu',
    builtIn: true,
    data: {
      kind: 'menu-layout-v2',
      version: 3,
      space: 'image',
      backgroundId: builtInBackground.id,
      backgroundUrl: builtInBackground.url,
      regions: clone(DEFAULT_REGIONS),
      lunchBox: { x: 1.4, y: 64.5, w: 26.4, h: 29 },
      textColor: '#f5eee5',
      textScale: 1
    }
  };

  const state = {
    mode: 'home',
    defaults: {},
    backgrounds: [builtInBackground],
    layouts: [builtInLayout],
    activeLayoutId: builtInLayout.id,
    activeBackgroundId: builtInBackground.id,
    aiFiles: [],
    aiDraft: null,
    manualDraft: null,
    previews: {},
    trainerLayout: clone(builtInLayout),
    trainerDrag: null,
    activeRegion: 'lunch',
    previewOutlines: false,
    imageCache: new Map(),
    renderToken: 0
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const round2 = value => Math.round(Number(value) * 100) / 100;
  const regionLabel = key => (REGION_DEFS.find(def => def.key === key) || {}).label || key;

  function normalizeBox(saved, fallback) {
    const base = fallback || DEFAULT_REGIONS.lunch;
    const box = {
      x: Number.isFinite(Number(saved?.x)) ? Number(saved.x) : base.x,
      y: Number.isFinite(Number(saved?.y)) ? Number(saved.y) : base.y,
      w: Number.isFinite(Number(saved?.w)) ? Number(saved.w) : base.w,
      h: Number.isFinite(Number(saved?.h)) ? Number(saved.h) : base.h,
      scale: Number(saved?.scale) > 0 ? Number(saved.scale) : base.scale,
      align: ['left', 'center', 'right'].includes(saved?.align) ? saved.align : base.align,
      // Most backgrounds already have "BREAKFAST", "DRINKS" and so on printed
      // on the artwork, so staff can switch our own heading off per box.
      showTitle: saved?.showTitle !== false
    };
    box.w = clamp(box.w, 4, 100);
    box.h = clamp(box.h, 4, 100);
    box.x = clamp(box.x, 0, 100 - box.w);
    box.y = clamp(box.y, 0, 100 - box.h);
    box.scale = clamp(box.scale, .4, 2);
    return box;
  }

  // Brings any saved layout — brand new, v2, or the very first canvas editor —
  // up to the box model, in place, so the rest of the studio only ever deals
  // with one shape.
  function ensureLayoutShape(layout) {
    if (!layout) return layout;
    const data = layout.data && typeof layout.data === 'object' ? layout.data : {};
    const isNewModel = !!data.regions;
    const fallbacks = isNewModel || data.space === 'image' ? DEFAULT_REGIONS : LEGACY_REGIONS;
    const regions = {};
    REGION_KEYS.forEach(key => {
      let saved = data.regions?.[key];
      if (!saved && key === 'lunch' && data.lunchBox) saved = data.lunchBox;
      regions[key] = normalizeBox(saved, fallbacks[key]);
    });
    data.regions = regions;
    data.kind = 'menu-layout-v2';
    data.space = data.space === 'image' || isNewModel ? 'image' : 'canvas';
    data.version = data.space === 'image' ? 3 : 2;
    data.textColor = data.textColor || '#f5eee5';
    data.textScale = clamp(Number(data.textScale) || 1, .5, 2);
    data.lunchBox = { x: regions.lunch.x, y: regions.lunch.y, w: regions.lunch.w, h: regions.lunch.h };
    layout.data = data;
    return layout;
  }

  // Older layouts positioned text against the fixed 1080x1350 frame, where the
  // background sat letterboxed in the middle. Re-measure those boxes against
  // the picture so the printed menu looks the same but the bars are gone.
  function convertToImageSpace(data, image) {
    if (!data || data.space === 'image') return false;
    if (!image?.naturalWidth || !image?.naturalHeight) return false;
    const fit = Math.min(LEGACY_CANVAS.width / image.naturalWidth, LEGACY_CANVAS.height / image.naturalHeight);
    const drawWidth = image.naturalWidth * fit;
    const drawHeight = image.naturalHeight * fit;
    const offsetX = (LEGACY_CANVAS.width - drawWidth) / 2;
    const offsetY = (LEGACY_CANVAS.height - drawHeight) / 2;
    REGION_KEYS.forEach(key => {
      const box = data.regions[key];
      const width = clamp(box.w / 100 * LEGACY_CANVAS.width / drawWidth * 100, 4, 100);
      const height = clamp(box.h / 100 * LEGACY_CANVAS.height / drawHeight * 100, 4, 100);
      box.x = round2(clamp((box.x / 100 * LEGACY_CANVAS.width - offsetX) / drawWidth * 100, 0, 100 - width));
      box.y = round2(clamp((box.y / 100 * LEGACY_CANVAS.height - offsetY) / drawHeight * 100, 0, 100 - height));
      box.w = round2(width);
      box.h = round2(height);
    });
    data.space = 'image';
    data.version = 3;
    data.lunchBox = { x: data.regions.lunch.x, y: data.regions.lunch.y, w: data.regions.lunch.w, h: data.regions.lunch.h };
    return true;
  }

  function toast(message, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = message;
    $('#toastStack').appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function setStatus(el, message, kind = '') {
    if (!el) return;
    el.textContent = message;
    el.className = `form-status ${kind}`.trim();
  }

  async function hashPin(pin) {
    const bytes = new TextEncoder().encode(pin);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function getPin() {
    try { return sessionStorage.getItem(SESSION_PIN_KEY) || ''; } catch { return ''; }
  }

  // Reads go through this site's own /api/menu-read, which asks NorthStar's
  // backend for the rows. No database key is shipped to the browser.
  async function menuRead(table) {
    const response = await fetch(`/api/menu-read?table=${encodeURIComponent(table)}`, { headers: { Accept: 'application/json' } });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) throw new Error((data && (data.message || data.error)) || text || `HTTP ${response.status}`);
    return Array.isArray(data?.rows) ? data.rows : [];
  }

  async function cloudWrite(op, table, extra = {}) {
    const response = await fetch('/api/menu-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: getPin(), op, table, ...extra })
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) throw new Error((data && data.error) || text || `HTTP ${response.status}`);
    return data || { success: true };
  }

  async function cloudUpload(path, dataUrl, contentType = 'image/jpeg') {
    const response = await fetch('/api/menu-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: getPin(), op: 'upload', path, dataUrl, contentType })
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok || !data?.url) throw new Error((data && data.error) || text || 'Upload failed');
    return data.url;
  }

  async function loadCloudData() {
    try {
      const [defaultRows, layoutRows] = await Promise.all([
        menuRead('menu_defaults'),
        menuRead('drawing_projects')
      ]);
      const defaults = {};
      (defaultRows || []).forEach(row => { defaults[row.key] = row.value; });
      state.defaults = defaults;

      const cloudBackgrounds = Array.isArray(defaults.backgroundLibrary?.items)
        ? defaults.backgroundLibrary.items.filter(item => item && item.id && item.url)
        : [];
      state.backgrounds = [builtInBackground, ...cloudBackgrounds.filter(item => item.id !== builtInBackground.id)];

      const cloudLayouts = (layoutRows || []).map(row => {
        if (row?.data?.kind === 'menu-layout-v2') {
          return { id: row.id, name: row.name, data: row.data, updatedAt: row.updated_at };
        }
        // Preserve useful layouts from the previous canvas editor. They appear
        // in the new library and become v2 layouts the next time staff updates
        // them, so no existing Hot Headz work disappears during the redesign.
        if (Array.isArray(row?.data?.boxes)) {
          const lunch = row.data.boxes.find(box => box?.name === 'Lunch') || {};
          const savedBounds = defaults.lunchBoxBounds || {};
          const backgroundUrl = /^https?:\/\//.test(String(row.data.imgDataURL || '')) ? row.data.imgDataURL : builtInBackground.url;
          const backgroundId = backgroundUrl === builtInBackground.url ? builtInBackground.id : `legacy-background-${row.id}`;
          return {
            id: row.id,
            name: row.name || 'Saved Menu Layout',
            legacy: true,
            updatedAt: row.updated_at,
            data: {
              kind: 'menu-layout-v2',
              version: 2,
              backgroundId,
              backgroundUrl,
              lunchBox: {
                x: Number(savedBounds.xPct ?? ((lunch.xPct || 20) - (lunch.maxWidthPct || 22) / 2)),
                y: Number(savedBounds.yPct ?? 64.5),
                w: Number(savedBounds.wPct ?? lunch.maxWidthPct ?? 22),
                h: Number(savedBounds.hPct ?? 29)
              },
              textColor: lunch.color || '#f5eee5',
              textScale: 1
            }
          };
        }
        return null;
      }).filter(Boolean);
      cloudLayouts.forEach(layout => {
        const url = layout.data.backgroundUrl;
        if (url && url !== builtInBackground.url && !state.backgrounds.some(background => background.id === layout.data.backgroundId)) {
          state.backgrounds.push({ id: layout.data.backgroundId, name: `${layout.name} background`, url, source: 'supabase' });
        }
      });
      state.layouts = [builtInLayout, ...cloudLayouts.filter(item => item.id !== builtInLayout.id)];
      state.layouts.forEach(ensureLayoutShape);

      const preferredLayout = defaults.editorActiveLayout?.id;
      if (preferredLayout && state.layouts.some(layout => layout.id === preferredLayout)) state.activeLayoutId = preferredLayout;
      if (!state.layouts.some(layout => layout.id === state.activeLayoutId)) state.activeLayoutId = builtInLayout.id;
      const layout = getActiveLayout();
      state.activeBackgroundId = backgroundForLayout(layout)?.id || builtInBackground.id;
      state.trainerLayout = clone(layout);
    } catch (error) {
      console.warn('[menu studio] cloud load:', error);
      toast('Cloud library could not load. The original layout is still available.', 'error');
    }
    refreshLibraries();
    refreshPreviewSelectors();
    renderAllPreviews();
  }

  function getActiveLayout() {
    return state.layouts.find(layout => layout.id === state.activeLayoutId) || builtInLayout;
  }

  function getActiveBackground() {
    return state.backgrounds.find(background => background.id === state.activeBackgroundId) || builtInBackground;
  }

  function backgroundForLayout(layout) {
    return state.backgrounds.find(background => background.id === layout?.data?.backgroundId)
      || (layout?.data?.backgroundUrl ? { id: layout.data.backgroundId || 'layout-background', name: 'Layout background', url: layout.data.backgroundUrl } : null)
      || builtInBackground;
  }

  async function unlock(pin) {
    const status = $('#pinStatus');
    if (pin.length !== 4) return setStatus(status, 'Enter all four digits.', 'error');
    $('#unlockBtn').disabled = true;
    setStatus(status, 'Checking PIN…');
    try {
      if (await hashPin(pin) !== PIN_HASH) {
        setStatus(status, 'That PIN is not correct.', 'error');
        $$('.pin-row input').forEach(input => { input.value = ''; });
        $('.pin-row input')?.focus();
        return;
      }
      sessionStorage.setItem(SESSION_PIN_KEY, pin);
      $('#gate').hidden = true;
      $('#studio').hidden = false;
      await loadCloudData();
    } finally {
      $('#unlockBtn').disabled = false;
    }
  }

  function initPin() {
    const inputs = $$('.pin-row input');
    inputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(-1);
        if (input.value && inputs[index + 1]) inputs[index + 1].focus();
        if (inputs.every(item => item.value)) unlock(inputs.map(item => item.value).join(''));
      });
      input.addEventListener('keydown', event => {
        if (event.key === 'Backspace' && !input.value && inputs[index - 1]) inputs[index - 1].focus();
        if (event.key === 'Enter') unlock(inputs.map(item => item.value).join(''));
      });
      input.addEventListener('paste', event => {
        const digits = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
        if (digits.length === 4) {
          event.preventDefault();
          inputs.forEach((item, i) => { item.value = digits[i]; });
          unlock(digits);
        }
      });
    });
    $('#unlockBtn').addEventListener('click', () => unlock(inputs.map(input => input.value).join('')));
    const saved = getPin();
    if (saved.length === 4) unlock(saved);
    else inputs[0]?.focus();
  }

  function switchMode(mode) {
    state.mode = mode;
    const map = { home: '#welcomeScreen', ai: '#aiScreen', manual: '#manualScreen', setup: '#setupScreen' };
    $$('.screen').forEach(screen => { screen.hidden = true; });
    $(map[mode] || map.home).hidden = false;
    $$('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
    if (mode === 'setup') {
      state.trainerLayout = clone(ensureLayoutShape(getActiveLayout()));
      refreshLibraries();
      syncTrainerControls();
      drawTrainer();
    }
    if (mode === 'ai' || mode === 'manual') {
      mountPreview(mode);
      renderPreview(mode);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initNavigation() {
    $$('[data-go]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.go)));
    $$('[data-mode]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mode)));
    $('#homeBtn').addEventListener('click', () => switchMode('home'));
    $('#signOutBtn').addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_PIN_KEY);
      location.reload();
    });
  }

  function parseItems(text) {
    return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      const clean = line.replace(/^[•*\-–—]\s*/, '');
      const parts = clean.split('|');
      return { name: (parts.shift() || '').trim().slice(0, 90), desc: parts.join('|').trim().slice(0, 200), confidence: 'manual' };
    }).filter(item => item.name).slice(0, 36);
  }

  function itemsText(items) {
    return (items || []).map(item => typeof item === 'string' ? item : `${item.name || ''}${item.desc ? ` | ${item.desc}` : ''}`).filter(Boolean).join('\n');
  }

  function renderAiReview(data) {
    state.aiDraft = {
      meats: data.meats || [],
      sides: data.sides || [],
      warnings: data.warnings || [],
      excluded: data.excluded || []
    };
    if (data.detectedDate) $('#aiDate').value = data.detectedDate;
    const total = state.aiDraft.meats.length + state.aiDraft.sides.length;
    const ignored = state.aiDraft.excluded;
    $('#aiResult').innerHTML = `
      <section class="review-card">
        <div class="review-head"><div><p class="eyebrow">Review before publishing</p><h2>Assistant draft</h2></div><span>${total} items found</span></div>
        <p class="review-note">Correct any line below. Crossed-out items are excluded and never added to the menu.</p>
        ${state.aiDraft.warnings.length ? `<div class="review-warning">${state.aiDraft.warnings.map(esc).join(' ')}</div>` : ''}
        ${ignored.length ? `<div class="review-warning"><b>Ignored from the photos:</b><ul class="ignored-list">${ignored.map(item => `<li>${esc(item.text || 'Crossed-out item')} — ${esc(item.reason || 'not intended for menu')}</li>`).join('')}</ul></div>` : ''}
        <label for="aiReviewMeats">Main dishes</label>
        <textarea id="aiReviewMeats" rows="8">${esc(itemsText(state.aiDraft.meats))}</textarea>
        <label for="aiReviewSides">Sides</label>
        <textarea id="aiReviewSides" rows="9">${esc(itemsText(state.aiDraft.sides))}</textarea>
        <p class="review-note">The preview updates while you type. Use the buttons beside the preview to download or publish.</p>
      </section>`;
    $('#aiResult').hidden = false;
    ['#aiReviewMeats', '#aiReviewSides'].forEach(selector => $(selector).addEventListener('input', () => {
      state.aiDraft.meats = parseItems($('#aiReviewMeats').value);
      state.aiDraft.sides = parseItems($('#aiReviewSides').value);
      renderPreview('ai');
    }));
    renderPreview('ai');
    $('#aiResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not open ${file.name}`)); };
      image.src = url;
    });
  }

  async function imageVariant(file, enhanced = false, maxDimension = 1450, quality = .8) {
    const image = await fileToImage(file);
    const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    context.filter = enhanced ? 'grayscale(1) contrast(1.55) brightness(1.08)' : 'none';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg', variant: enhanced ? 'high-contrast' : 'original' };
  }

  function addAiFiles(files) {
    const incoming = Array.from(files || []).filter(file => file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name));
    const existingKeys = new Set(state.aiFiles.map(file => `${file.name}-${file.size}-${file.lastModified}`));
    for (const file of incoming) {
      if (state.aiFiles.length >= AI_FILE_LIMIT) break;
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (!existingKeys.has(key)) {
        state.aiFiles.push(file);
        existingKeys.add(key);
      }
    }
    renderAiThumbs();
  }

  function renderAiThumbs() {
    $('#aiFileCount').textContent = `${state.aiFiles.length} / ${AI_FILE_LIMIT}`;
    $('#aiThumbs').innerHTML = '';
    state.aiFiles.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'thumb';
      const image = document.createElement('img');
      const url = URL.createObjectURL(file);
      image.onload = () => URL.revokeObjectURL(url);
      image.src = url;
      image.alt = `Selected menu photo ${index + 1}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove photo ${index + 1}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => { state.aiFiles.splice(index, 1); renderAiThumbs(); });
      card.append(image, remove);
      $('#aiThumbs').appendChild(card);
    });
  }

  async function readAiMenu() {
    if (!state.aiFiles.length) return toast('Choose at least one menu photo.', 'error');
    const button = $('#readMenuBtn');
    const progress = $('#aiProgress');
    button.disabled = true;
    progress.hidden = false;
    $('#aiProgressText').textContent = 'Creating clear and high-contrast copies…';
    try {
      const images = [];
      for (let index = 0; index < state.aiFiles.length; index += 1) {
        $('#aiProgressText').textContent = `Preparing photo ${index + 1} of ${state.aiFiles.length}…`;
        images.push(await imageVariant(state.aiFiles[index], false));
        images.push(await imageVariant(state.aiFiles[index], true));
      }
      $('#aiProgressText').textContent = 'Reading handwriting, checking corrections, and ignoring crossed-out items…';
      const response = await fetch('/api/ai-extract-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, userPrompt: $('#aiPrompt').value.trim(), requestedDate: $('#aiDate').value })
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
      if (!response.ok || !data.success) throw new Error(data.error || 'The assistant could not read those photos.');
      renderAiReview(data);
      toast('Menu draft is ready to review.', 'success');
    } catch (error) {
      toast(error.message || 'The photos could not be read.', 'error');
      $('#aiResult').hidden = false;
      $('#aiResult').innerHTML = `<div class="review-warning"><b>Nothing was published.</b> ${esc(error.message || 'Try a clearer photo or use the manual editor.')}</div>`;
    } finally {
      button.disabled = false;
      progress.hidden = true;
    }
  }

  function initAi() {
    $('#aiDate').value = todayISO();
    $('#aiFiles').addEventListener('change', event => addAiFiles(event.target.files));
    $('#pickAiFiles').addEventListener('click', () => $('#aiFiles').click());
    const drop = $('#pickAiFiles');
    ['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', event => addAiFiles(event.dataTransfer.files));
    $('#readMenuBtn').addEventListener('click', readAiMenu);
  }

  function buildManualPreview() {
    const meats = parseItems($('#manualMeats').value);
    const sides = parseItems($('#manualSides').value);
    if (!meats.length && !sides.length) return toast('Type at least one menu item.', 'error');
    state.manualDraft = { meats, sides, warnings: [], excluded: [] };
    $('#manualResult').innerHTML = '<p class="form-status success">Preview ready. Nothing is live until you press Publish.</p>';
    renderPreview('manual');
    state.previews.manual?.card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function initManual() {
    $('#manualDate').value = todayISO();
    $('#manualPreviewBtn').addEventListener('click', buildManualPreview);
    ['#manualMeats', '#manualSides'].forEach(selector => $(selector).addEventListener('input', () => {
      if (!state.manualDraft) return;
      state.manualDraft.meats = parseItems($('#manualMeats').value);
      state.manualDraft.sides = parseItems($('#manualSides').value);
      renderPreview('manual');
    }));
  }

  function mountPreview(kind) {
    if (state.previews[kind]) return state.previews[kind];
    const screen = kind === 'ai' ? $('#aiScreen') : $('#manualScreen');
    const host = $('[data-preview-host]', screen);
    const fragment = $('#previewTemplate').content.cloneNode(true);
    host.appendChild(fragment);
    const card = $('.preview-card', host);
    const preview = {
      card,
      canvas: $('[data-menu-canvas]', card),
      empty: $('[data-empty-preview]', card),
      layoutSelect: $('[data-layout-select]', card),
      backgroundSelect: $('[data-background-select]', card),
      download: $('[data-download]', card),
      publish: $('[data-publish]', card),
      status: $('[data-publish-status]', card),
      badge: $('[data-preview-state]', card),
      addBackground: $('[data-add-background]', card),
      outlineToggle: $('[data-outline-toggle]', card)
    };
    preview.layoutSelect.addEventListener('change', () => {
      state.activeLayoutId = preview.layoutSelect.value;
      const layout = getActiveLayout();
      state.activeBackgroundId = backgroundForLayout(layout).id;
      refreshPreviewSelectors();
      renderAllPreviews();
    });
    preview.backgroundSelect.addEventListener('change', () => {
      state.activeBackgroundId = preview.backgroundSelect.value;
      refreshPreviewSelectors();
      renderAllPreviews();
    });
    if (preview.addBackground) preview.addBackground.addEventListener('click', () => openBackgroundPicker());
    if (preview.outlineToggle) preview.outlineToggle.addEventListener('change', () => {
      state.previewOutlines = preview.outlineToggle.checked;
      Object.values(state.previews).forEach(item => { if (item.outlineToggle) item.outlineToggle.checked = state.previewOutlines; });
      renderAllPreviews();
    });
    preview.download.addEventListener('click', () => downloadPreview(kind));
    preview.publish.addEventListener('click', () => publishDraft(kind));
    state.previews[kind] = preview;
    refreshPreviewSelectors();
    return preview;
  }

  function refreshPreviewSelectors() {
    Object.values(state.previews).forEach(preview => {
      preview.layoutSelect.innerHTML = state.layouts.map(layout => `<option value="${esc(layout.id)}">${esc(layout.name)}</option>`).join('');
      preview.backgroundSelect.innerHTML = state.backgrounds.map(background => `<option value="${esc(background.id)}">${esc(background.name)}</option>`).join('');
      preview.layoutSelect.value = state.activeLayoutId;
      preview.backgroundSelect.value = state.activeBackgroundId;
    });
  }

  function currentDraft(kind) {
    return kind === 'ai' ? state.aiDraft : state.manualDraft;
  }

  function currentDate(kind) {
    return (kind === 'ai' ? $('#aiDate').value : $('#manualDate').value) || todayISO();
  }

  async function loadImage(url) {
    if (!url) return null;
    if (state.imageCache.has(url)) return state.imageCache.get(url);
    const promise = new Promise(resolve => {
      const image = new Image();
      if (/^https?:\/\//.test(url)) image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
    state.imageCache.set(url, promise);
    return promise;
  }

  // The canvas takes the shape of the background picture, so the picture fills
  // it edge to edge and every box percentage lines up with the artwork.
  function canvasSizeForImage(image) {
    if (!image?.naturalWidth || !image?.naturalHeight) return { width: 1080, height: 1350 };
    const fit = CANVAS_LONG_EDGE / Math.max(image.naturalWidth, image.naturalHeight);
    return {
      width: Math.max(320, Math.round(image.naturalWidth * fit)),
      height: Math.max(320, Math.round(image.naturalHeight * fit))
    };
  }

  function drawBackground(context, image, width, height) {
    context.fillStyle = '#0b0908';
    context.fillRect(0, 0, width, height);
    if (image) context.drawImage(image, 0, 0, width, height);
  }

  function boxRect(canvas, box) {
    return {
      x: box.x / 100 * canvas.width,
      y: box.y / 100 * canvas.height,
      width: box.w / 100 * canvas.width,
      height: box.h / 100 * canvas.height
    };
  }

  function alignedX(rect, align) {
    if (align === 'center') return rect.x + rect.width / 2;
    if (align === 'right') return rect.x + rect.width;
    return rect.x;
  }

  function wrapLine(context, text, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let line = '';
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (line && context.measureText(test).width > maxWidth) { lines.push(line); line = word; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  function fittedLines(context, sourceLines, boxWidth, boxHeight, scale = 1, unit = 1) {
    const smallest = Math.max(9, Math.round(12 * unit));
    let size = Math.max(smallest, Math.round(23 * scale * unit));
    let lines = [];
    while (size >= smallest) {
      context.font = `700 ${size}px Arial, sans-serif`;
      lines = sourceLines.flatMap(line => wrapLine(context, line, boxWidth));
      const height = lines.length * size * 1.25;
      if (height <= boxHeight) break;
      size -= 1;
    }
    return { size, lines, lineHeight: size * 1.25 };
  }

  const isGroupHeading = line => /:$/.test(String(line || '').trim());

  function drawSection(context, title, sourceItems, box, color, scale = 1, unit = 1, subtitle = '') {
    const rect = boxRect(context.canvas, box);
    const align = box.align || 'left';
    const items = (sourceItems || []).map(item => typeof item === 'string' ? item : item.name).filter(Boolean);
    const showTitle = box.showTitle !== false && !!title;
    // Headings and the service-time line keep their own styling; everything
    // else is a bulleted item.
    const source = [
      ...(showTitle ? [{ text: title, kind: 'title' }] : []),
      ...(subtitle ? [{ text: subtitle, kind: 'subtitle' }] : []),
      ...items.map(item => isGroupHeading(item)
        ? { text: item, kind: 'group' }
        : { text: `• ${item}`, kind: 'item' })
    ];
    if (!source.length) return;
    context.save();
    context.fillStyle = color;
    context.textBaseline = 'top';
    context.textAlign = align;
    context.shadowColor = 'rgba(0,0,0,.9)';
    context.shadowBlur = 8 * unit;
    const fit = fittedLines(context, source.map(entry => entry.text), rect.width, rect.height, scale * (box.scale || 1), unit);
    const x = alignedX(rect, align);
    // Map every wrapped line back to the entry it came from so continuation
    // lines keep the style of their entry.
    const styles = [];
    source.forEach(entry => {
      context.font = `700 ${fit.size}px Arial, sans-serif`;
      wrapLine(context, entry.text, rect.width).forEach(() => styles.push(entry.kind));
    });
    let cursorY = rect.y;
    fit.lines.forEach((line, index) => {
      const kind = styles[index] || 'item';
      const weight = kind === 'title' ? '900' : kind === 'group' ? '800' : '700';
      const size = kind === 'title' ? fit.size : kind === 'group' || kind === 'subtitle' ? Math.round(fit.size * .94) : fit.size;
      context.font = `${weight} ${size}px Arial, sans-serif`;
      context.fillText(line, x, cursorY, rect.width);
      cursorY += fit.lineHeight;
    });
    context.restore();
  }

  function drawHeader(context, date, box, color, scale = 1, unit = 1) {
    const rect = boxRect(context.canvas, box);
    const align = box.align || 'center';
    const dateObject = new Date(`${date || todayISO()}T12:00:00`);
    const weekday = dateObject.toLocaleDateString('en-US', { weekday: 'long' });
    const full = dateObject.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const smallest = Math.max(12, Math.round(18 * unit));
    let size = Math.max(smallest, Math.round(64 * scale * (box.scale || 1) * unit));
    let subSize = Math.round(size * 31 / 64);
    context.save();
    while (size > smallest) {
      subSize = Math.max(Math.round(smallest * .55), Math.round(size * 31 / 64));
      context.font = `900 ${size}px Arial, sans-serif`;
      const weekdayWidth = context.measureText(weekday).width;
      context.font = `700 ${subSize}px Arial, sans-serif`;
      const dateWidth = context.measureText(full).width;
      const stackHeight = size * 1.25 + subSize * 1.2;
      if (Math.max(weekdayWidth, dateWidth) <= rect.width && stackHeight <= rect.height) break;
      size -= 1;
    }
    context.fillStyle = color;
    context.textBaseline = 'top';
    context.textAlign = align;
    context.shadowColor = 'rgba(0,0,0,.92)';
    context.shadowBlur = 12 * unit;
    const x = alignedX(rect, align);
    context.font = `900 ${size}px Arial, sans-serif`;
    context.fillText(weekday, x, rect.y, rect.width);
    context.font = `700 ${subSize}px Arial, sans-serif`;
    context.fillText(full, x, rect.y + size * 1.25, rect.width);
    context.restore();
  }

  // Guide outlines. These are painted on screen only — the download and the
  // published image are always redrawn without them.
  function drawRegionOutlines(context, regions, activeKey, unit) {
    const canvas = context.canvas;
    REGION_DEFS.forEach(def => {
      const box = regions[def.key];
      if (!box) return;
      const rect = boxRect(canvas, box);
      const active = def.key === activeKey;
      context.save();
      context.lineWidth = Math.max(2, (active ? 5 : 2.5) * unit);
      context.setLineDash(active ? [18 * unit, 10 * unit] : [9 * unit, 8 * unit]);
      context.strokeStyle = active ? '#ff7b43' : 'rgba(255,255,255,.55)';
      if (active) {
        context.fillStyle = 'rgba(242,107,53,.13)';
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
      context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      context.setLineDash([]);

      const label = def.label.toUpperCase();
      const labelSize = Math.max(11, Math.round(19 * unit));
      context.font = `900 ${labelSize}px Arial, sans-serif`;
      const padding = Math.round(8 * unit);
      const chipHeight = Math.round(labelSize * 1.7);
      const chipWidth = Math.min(rect.width + padding * 2, context.measureText(label).width + padding * 2);
      let chipY = rect.y - chipHeight - 3 * unit;
      if (chipY < 2) chipY = rect.y + 3 * unit;
      context.fillStyle = active ? '#ff7b43' : 'rgba(0,0,0,.62)';
      context.fillRect(rect.x, chipY, chipWidth, chipHeight);
      context.fillStyle = '#fff';
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      context.fillText(label, rect.x + padding, chipY + chipHeight / 2, chipWidth - padding * 2);

      if (active) {
        const handle = Math.max(22, 34 * unit);
        const hx = rect.x + rect.width - handle / 2;
        const hy = rect.y + rect.height - handle / 2;
        context.fillStyle = '#ff7b43';
        context.fillRect(hx, hy, handle, handle);
        context.lineWidth = Math.max(1.5, 2 * unit);
        context.strokeStyle = '#fff';
        context.strokeRect(hx, hy, handle, handle);
      }
      context.restore();
    });
  }

  // Only what changes today. The "Same Daily" sandwiches now print in their own
  // box beside breakfast, which is where the printed menu puts them — appending
  // them here is what made the lunch box overflow.
  function dailyLunchItems(draft) {
    return [...(draft?.meats || []), ...(draft?.sides || [])];
  }

  // A line ending in ':' is drawn as a small heading inside the box rather than
  // a bulleted item, which is how the printed menu groups the salad bar.
  const GROUP = label => `${label}:`;
  const FOOTER_LINE = 'For pricing and hours please visit HotHeadzSouthernFoods.com';

  function sectionItems(key, draft) {
    const defaults = state.defaults;
    if (key === 'lunch') return dailyLunchItems(draft);
    if (key === 'breakfast') return defaults.breakfast?.items || ['Scrambled Eggs', 'Bacon', 'Sausage, Hotlinks', 'Pancakes', 'French Toast Sticks', 'Biscuits', 'Hashbrowns', 'Cheesy Grits', 'Grits', 'Sausage Gravy', 'Oatmeal'];
    if (key === 'breakfastSandwiches') return defaults.sameDaily?.items || [];
    if (key === 'drinks') return defaults.drinks?.items || ['Sweet Tea', 'Unsweet Tea', 'Dr. Pepper', 'Sprite', 'Coke', 'Coffee'];
    if (key === 'dessert') return defaults.dessert?.items || [];
    if (key === 'salad') {
      const salad = defaults.salad?.saladBar || {};
      const lettuce = salad.lettuce || [];
      const toppings = salad.toppings || [];
      return [
        ...(lettuce.length ? [GROUP('Lettuce'), ...lettuce] : []),
        ...(toppings.length ? [GROUP('Toppings'), ...toppings] : [])
      ];
    }
    if (key === 'saladDressings') return state.defaults.salad?.saladBar?.dressing || [];
    if (key === 'footer') return [];
    return [];
  }

  const SECTION_TITLES = {
    breakfast: 'BREAKFAST',
    breakfastSandwiches: 'BREAKFAST SANDWICHES',
    salad: 'SALAD BAR',
    saladDressings: 'Dressings:',
    drinks: 'DRINKS',
    lunch: 'LUNCH',
    dessert: 'DESSERT',
    footer: ''
  };

  // Service times come from the saved hours for the day being printed, so the
  // menu can never disagree with the hours shown on the website.
  function serviceTime(key, date) {
    if (key !== 'breakfast' && key !== 'lunch') return '';
    const weekly = state.defaults.hours?.weekly;
    if (!Array.isArray(weekly)) return '';
    const weekday = new Date(`${date || todayISO()}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    const today = weekly.find(entry => entry?.day === weekday);
    return String(today?.[key] || '').trim();
  }

  function sectionSubtitle(key, date) {
    if (key === 'breakfastSandwiches') return '- Same Daily';
    return serviceTime(key, date);
  }

  async function drawMenu(canvas, draft, date, layout, background, outline = null) {
    const context = canvas.getContext('2d', { alpha: false });
    const target = layout || builtInLayout;
    ensureLayoutShape(target);
    const image = await loadImage(background?.url || target.data.backgroundUrl || builtInBackground.url);
    convertToImageSpace(target.data, image);

    const size = canvasSizeForImage(image);
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width;
      canvas.height = size.height;
    }
    drawBackground(context, image, canvas.width, canvas.height);

    const data = target.data;
    const regions = data.regions;
    const color = data.textColor || '#f5eee5';
    const textScale = Number(data.textScale) || 1;
    const unit = canvas.height / FONT_BASE_HEIGHT;

    drawHeader(context, date, regions.header, color, textScale, unit);
    ['breakfast', 'breakfastSandwiches', 'salad', 'saladDressings', 'lunch', 'drinks', 'dessert'].forEach(key => {
      drawSection(context, SECTION_TITLES[key], sectionItems(key, draft), regions[key], color, textScale, unit, sectionSubtitle(key, date));
    });
    drawSection(context, '', [], regions.footer, color, textScale, unit, FOOTER_LINE);

    if (outline) drawRegionOutlines(context, regions, outline.activeKey, unit);
  }

  async function renderPreview(kind) {
    const preview = state.previews[kind];
    if (!preview) return;
    const draft = currentDraft(kind);
    const hasItems = !!draft && ((draft.meats?.length || 0) + (draft.sides?.length || 0) > 0);
    preview.empty.hidden = hasItems;
    preview.download.disabled = !hasItems;
    preview.publish.disabled = !hasItems;
    if (!hasItems) return;
    const token = ++state.renderToken;
    const layout = getActiveLayout();
    const background = getActiveBackground();
    await drawMenu(preview.canvas, draft, currentDate(kind), layout, background, state.previewOutlines ? { activeKey: null } : null);
    if (token !== state.renderToken && state.mode === kind) return;
  }

  function renderAllPreviews() {
    Object.keys(state.previews).forEach(renderPreview);
  }

  async function downloadPreview(kind) {
    const preview = state.previews[kind];
    const draft = currentDraft(kind);
    if (!draft || !preview) return;
    try {
      // Always hand over a clean image: the guide outlines are a screen aid and
      // must never end up on the menu that goes out to customers.
      await drawMenu(preview.canvas, draft, currentDate(kind), getActiveLayout(), getActiveBackground(), null);
      const link = document.createElement('a');
      link.download = `hot-headz-menu-${currentDate(kind)}.jpg`;
      link.href = preview.canvas.toDataURL('image/jpeg', .92);
      link.click();
      toast('Menu image downloaded.', 'success');
    } catch {
      toast('The image could not be downloaded. Try the original background or upload it again.', 'error');
    } finally {
      if (state.previewOutlines) renderPreview(kind);
    }
  }

  async function publishDraft(kind) {
    const preview = state.previews[kind];
    const draft = currentDraft(kind);
    const date = currentDate(kind);
    if (!draft || !date) return;
    preview.publish.disabled = true;
    setStatus(preview.status, 'Publishing the reviewed menu…');
    const payload = {
      lunch: {
        show: true,
        items: [...draft.meats, ...draft.sides],
        meats: draft.meats,
        sides: draft.sides,
        sameDaily: []
      },
      dessert: { items: [] },
      crawfish: { show: false }
    };
    try {
      await cloudWrite('upsert', 'lunch_dates', { row: { lunch_date: date, data: payload, saved_by: 'Menu Studio' } });
      preview.badge.textContent = 'Published';
      preview.badge.classList.add('live');
      setStatus(preview.status, `Live for ${new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.`, 'success');
      toast('The live menu was updated.', 'success');
    } catch (error) {
      preview.publish.disabled = false;
      setStatus(preview.status, `Publish failed: ${error.message}`, 'error');
      toast('Nothing changed on the live menu.', 'error');
    }
  }

  function refreshLibraries() {
    const backgroundList = $('#backgroundList');
    const layoutList = $('#layoutList');
    if (!backgroundList || !layoutList) return;
    const activeBackgroundId = state.trainerLayout?.data?.backgroundId;
    backgroundList.innerHTML = state.backgrounds.map(background => `
      <div class="asset-row ${background.id === activeBackgroundId ? 'active' : ''}">
        <button class="asset-item" data-background-id="${esc(background.id)}" type="button">
          <img src="${esc(background.url)}" alt="" loading="lazy"><span><b>${esc(background.name)}</b><small>${background.source === 'supabase' ? 'Added by staff' : 'Came with the website'}</small></span>
        </button>
        ${background.source === 'supabase' ? `<button class="asset-remove" data-remove-background="${esc(background.id)}" type="button" title="Take this off the list" aria-label="Take ${esc(background.name)} off the list">&#10005;</button>` : ''}
      </div>`).join('');
    layoutList.innerHTML = state.layouts.map(layout => `
      <button class="layout-item ${layout.id === state.trainerLayout?.id ? 'active' : ''}" data-layout-id="${esc(layout.id)}" type="button"><span><b>${esc(layout.name)}</b><small>${layout.builtIn ? 'Built-in starting layout' : 'Saved by staff'}</small></span></button>`).join('');
    $$('[data-background-id]', backgroundList).forEach(button => button.addEventListener('click', () => {
      const background = state.backgrounds.find(item => item.id === button.dataset.backgroundId);
      if (!background) return;
      useBackground(background);
    }));
    $$('[data-remove-background]', backgroundList).forEach(button => button.addEventListener('click', () => removeBackground(button.dataset.removeBackground)));
    $$('[data-layout-id]', layoutList).forEach(button => button.addEventListener('click', () => {
      const layout = state.layouts.find(item => item.id === button.dataset.layoutId);
      if (!layout) return;
      state.trainerLayout = clone(ensureLayoutShape(layout));
      state.activeLayoutId = layout.id;
      state.activeBackgroundId = backgroundForLayout(layout).id;
      syncTrainerControls();
      refreshLibraries();
      refreshPreviewSelectors();
      drawTrainer();
      renderAllPreviews();
    }));
  }

  function useBackground(background) {
    if (state.trainerLayout) {
      state.trainerLayout.data.backgroundId = background.id;
      state.trainerLayout.data.backgroundUrl = background.url;
    }
    state.activeBackgroundId = background.id;
    refreshLibraries();
    refreshPreviewSelectors();
    drawTrainer();
    renderAllPreviews();
  }

  async function removeBackground(id) {
    const background = state.backgrounds.find(item => item.id === id);
    if (!background || background.source !== 'supabase') return;
    if (!window.confirm(`Take “${background.name}” off the background list?`)) return;
    const previous = state.backgrounds.slice();
    state.backgrounds = state.backgrounds.filter(item => item.id !== id);
    if (state.activeBackgroundId === id) state.activeBackgroundId = builtInBackground.id;
    if (state.trainerLayout?.data?.backgroundId === id) {
      state.trainerLayout.data.backgroundId = builtInBackground.id;
      state.trainerLayout.data.backgroundUrl = builtInBackground.url;
    }
    refreshLibraries();
    refreshPreviewSelectors();
    drawTrainer();
    renderAllPreviews();
    try {
      await saveBackgroundLibrary();
      setStatus($('#setupStatus'), `“${background.name}” was taken off the list.`, 'success');
    } catch (error) {
      state.backgrounds = previous;
      refreshLibraries();
      refreshPreviewSelectors();
      setStatus($('#setupStatus'), `That background could not be removed: ${error.message}`, 'error');
    }
  }

  function activeRegionKey() {
    return REGION_KEYS.includes(state.activeRegion) ? state.activeRegion : 'lunch';
  }

  function activeRegionBox() {
    const regions = state.trainerLayout?.data?.regions;
    return regions ? regions[activeRegionKey()] : null;
  }

  function syncLunchMirror(data) {
    if (!data?.regions?.lunch) return;
    data.lunchBox = { x: data.regions.lunch.x, y: data.regions.lunch.y, w: data.regions.lunch.w, h: data.regions.lunch.h };
  }

  function renderRegionTabs() {
    const tabs = $('#regionTabs');
    if (!tabs) return;
    const active = activeRegionKey();
    tabs.innerHTML = REGION_DEFS.map(def => `
      <button class="region-tab ${def.key === active ? 'active' : ''}" data-region="${esc(def.key)}" type="button" aria-pressed="${def.key === active}">${esc(def.label)}</button>`).join('');
    $$('[data-region]', tabs).forEach(button => button.addEventListener('click', () => selectRegion(button.dataset.region)));
  }

  function selectRegion(key) {
    if (!REGION_KEYS.includes(key)) return;
    state.activeRegion = key;
    renderRegionTabs();
    syncBoxFields();
    drawTrainer();
  }

  function syncBoxFields() {
    const box = activeRegionBox();
    const help = $('#regionHelp');
    const def = REGION_DEFS.find(item => item.key === activeRegionKey());
    if (help && def) help.textContent = def.help;
    if (!box) return;
    const fields = { boxX: box.x, boxY: box.y, boxW: box.w, boxH: box.h };
    Object.entries(fields).forEach(([id, value]) => {
      const input = $(`#${id}`);
      if (input && document.activeElement !== input) input.value = String(round2(value));
    });
    const scale = $('#boxScale');
    if (scale) scale.value = String(box.scale || 1);
    const align = $('#boxAlign');
    if (align) align.value = box.align || 'left';
    const title = $('#boxTitle');
    const titleField = $('#boxTitleField');
    if (title) {
      const isHeader = activeRegionKey() === 'header';
      title.checked = box.showTitle !== false;
      title.disabled = isHeader;
      if (titleField) titleField.hidden = isHeader;
    }
  }

  function syncTrainerControls() {
    if (!state.trainerLayout) return;
    ensureLayoutShape(state.trainerLayout);
    $('#layoutName').value = state.trainerLayout.name || 'Menu Layout';
    $('#layoutScale').value = String(state.trainerLayout.data.textScale || 1);
    $('#layoutColor').value = state.trainerLayout.data.textColor || '#f5eee5';
    $('#updateLayoutBtn').disabled = !!state.trainerLayout.builtIn;
    renderRegionTabs();
    syncBoxFields();
  }

  async function drawTrainer() {
    const canvas = $('#trainerCanvas');
    if (!canvas || !state.trainerLayout) return;
    const sample = {
      meats: [{ name: 'Beef Tips' }, { name: 'Smothered Chicken' }],
      sides: [{ name: 'Mashed Potatoes & Gravy' }, { name: 'Cabbage' }, { name: 'Green Beans' }, { name: 'Fried Okra' }]
    };
    const background = state.backgrounds.find(item => item.id === state.trainerLayout.data.backgroundId) || builtInBackground;
    await drawMenu(canvas, sample, todayISO(), state.trainerLayout, background, { activeKey: activeRegionKey() });
    syncBoxFields();
  }

  async function saveBackgroundLibrary() {
    const items = state.backgrounds.filter(background => background.source === 'supabase');
    await cloudWrite('upsert', 'menu_defaults', {
      row: { key: 'backgroundLibrary', value: { version: 1, items } }
    });
    state.defaults.backgroundLibrary = { version: 1, items };
  }

  async function compressBackground(file) {
    const image = await fileToImage(file);
    const ratio = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * ratio);
    canvas.height = Math.round(image.naturalHeight * ratio);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .86);
  }

  // Turns the raw failure from Supabase storage into something a staff member
  // can act on, instead of a wall of JSON.
  function uploadFailureReason(message) {
    const text = String(message || 'Unknown error');
    if (/NoSuchBucket|Bucket not found/i.test(text)) {
      return 'the “media” storage bucket does not exist in Supabase yet. Ask NorthStar to create it (see database/005-storage-media-bucket.sql).';
    }
    if (/Bucket not public/i.test(text)) return 'the “media” bucket is private, so saved pictures cannot be shown. It needs to be public.';
    if (/Wrong PIN/i.test(text)) return 'the staff PIN was not accepted. Sign out and back in.';
    if (/too large/i.test(text)) return 'the picture is too big. Try one under about 5 MB.';
    if (/not configured|same Supabase project/i.test(text)) return 'the NorthStar database backend is not configured for this site.';
    if (/Failed to fetch|NetworkError/i.test(text)) return 'the connection dropped. Check the internet and try again.';
    return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  }

  function openBackgroundPicker() {
    const input = $('#backgroundUpload');
    if (input && !input.disabled) input.click();
  }

  function setUploadBusy(busy, message) {
    const progress = $('#backgroundProgress');
    const input = $('#backgroundUpload');
    const picker = $('#pickBackground');
    if (input) input.disabled = busy;
    if (picker) picker.disabled = busy;
    Object.values(state.previews).forEach(preview => { if (preview.addBackground) preview.addBackground.disabled = busy; });
    if (progress) {
      progress.hidden = !busy;
      const label = $('b', progress);
      if (label && message) label.textContent = message;
    }
  }

  async function uploadBackgrounds(files) {
    const chosen = Array.from(files || []).filter(file => /^image\//.test(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)).slice(0, 8);
    if (!chosen.length) {
      if ((files || []).length) toast('That file is not a picture. Choose a JPG, PNG, or HEIC.', 'error');
      return;
    }
    const many = chosen.length === 1 ? 'picture' : 'pictures';
    setUploadBusy(true, `Saving ${chosen.length} ${many}…`);
    setStatus($('#setupStatus'), `Saving ${chosen.length} ${many} to the shared library…`);
    let added = 0;
    try {
      for (const file of chosen) {
        const id = uid('background');
        const dataUrl = await compressBackground(file);
        const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'menu-background';
        const url = await cloudUpload(`hotheadz/backgrounds/${id}-${safeName}.jpg`, dataUrl);
        state.backgrounds.push({ id, name: file.name.replace(/\.[^.]+$/, '') || 'Menu background', url, source: 'supabase', createdAt: new Date().toISOString() });
        added += 1;
      }
      await saveBackgroundLibrary();
      const newest = state.backgrounds[state.backgrounds.length - 1];
      useBackground(newest);
      setStatus($('#setupStatus'), added === 1 ? 'Picture added and switched on. Drag the outlined boxes to fit it.' : `${added} pictures added. The newest one is switched on.`, 'success');
      toast(added === 1 ? 'Background added.' : `${added} backgrounds added.`, 'success');
    } catch (error) {
      // The detailed reason lives on the setup screen, but staff can start an
      // upload from the preview screens too, so put the reason in the toast as
      // well or they are left with "it failed" and nowhere to look.
      const reason = uploadFailureReason(error.message);
      setStatus($('#setupStatus'), `That picture could not be saved: ${reason}`, 'error');
      toast(`Background not saved: ${reason}`, 'error');
    } finally {
      setUploadBusy(false);
      const input = $('#backgroundUpload');
      if (input) input.value = '';
    }
  }

  function trainerPayload(id, name) {
    ensureLayoutShape(state.trainerLayout);
    const data = clone(state.trainerLayout.data);
    data.kind = 'menu-layout-v2';
    data.version = 3;
    data.space = 'image';
    data.textScale = Number($('#layoutScale').value) || 1;
    data.textColor = $('#layoutColor').value || '#f5eee5';
    syncLunchMirror(data);
    return { id, name, data, saved_by: 'Menu Studio', updated_at: new Date().toISOString() };
  }

  async function saveLayout(asNew) {
    const name = $('#layoutName').value.trim() || 'Menu Layout';
    const selected = state.trainerLayout;
    if (!asNew && selected?.builtIn) return setStatus($('#setupStatus'), 'Save the built-in layout as a new layout first.', 'error');
    const id = asNew ? uid('layout') : selected.id;
    const payload = trainerPayload(id, name);
    setStatus($('#setupStatus'), asNew ? 'Saving new layout…' : 'Updating layout…');
    try {
      await cloudWrite('upsert', 'drawing_projects', { row: payload });
      const layout = ensureLayoutShape({ id, name, data: payload.data, updatedAt: payload.updated_at });
      const index = state.layouts.findIndex(item => item.id === id);
      if (index >= 0) state.layouts[index] = layout;
      else state.layouts.push(layout);
      state.trainerLayout = clone(layout);
      state.activeLayoutId = id;
      state.activeBackgroundId = backgroundForLayout(layout).id;
      await cloudWrite('upsert', 'menu_defaults', { row: { key: 'editorActiveLayout', value: { id } } });
      state.defaults.editorActiveLayout = { id };
      refreshLibraries();
      refreshPreviewSelectors();
      syncTrainerControls();
      renderAllPreviews();
      setStatus($('#setupStatus'), `Saved “${name}”. Every staff device sees it now.`, 'success');
      toast('Layout saved.', 'success');
    } catch (error) {
      setStatus($('#setupStatus'), `Layout save failed: ${error.message}`, 'error');
    }
  }

  function resetActiveRegion() {
    const key = activeRegionKey();
    state.trainerLayout.data.regions[key] = clone(DEFAULT_REGIONS[key]);
    syncLunchMirror(state.trainerLayout.data);
    syncBoxFields();
    drawTrainer();
    setStatus($('#setupStatus'), `“${regionLabel(key)}” is back where it started.`);
  }

  function resetAllRegions() {
    if (!window.confirm('Put all five boxes back to their starting positions?')) return;
    state.trainerLayout.data.regions = clone(DEFAULT_REGIONS);
    syncLunchMirror(state.trainerLayout.data);
    syncBoxFields();
    drawTrainer();
    setStatus($('#setupStatus'), 'All boxes are back where they started.');
  }

  // The canvas is letterboxed inside its shell whenever the picture is a
  // different shape, so pointer positions are measured against the drawn
  // picture rather than the element box.
  function trainerMetrics() {
    const canvas = $('#trainerCanvas');
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height) || 1;
    const drawWidth = canvas.width * scale;
    const drawHeight = canvas.height * scale;
    return {
      canvas,
      scale,
      drawWidth,
      drawHeight,
      left: rect.left + (rect.width - drawWidth) / 2,
      top: rect.top + (rect.height - drawHeight) / 2
    };
  }

  function trainerPoint(event) {
    const metrics = trainerMetrics();
    return {
      x: (event.clientX - metrics.left) / metrics.drawWidth * 100,
      y: (event.clientY - metrics.top) / metrics.drawHeight * 100
    };
  }

  function hitRegion(point) {
    const regions = state.trainerLayout.data.regions;
    const canvas = $('#trainerCanvas');
    const tolerance = { x: 30 / canvas.width * 100, y: 30 / canvas.height * 100 };
    const active = activeRegionKey();
    const inside = key => {
      const box = regions[key];
      return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h;
    };
    const onHandle = key => {
      const box = regions[key];
      return Math.abs(point.x - (box.x + box.w)) <= tolerance.x && Math.abs(point.y - (box.y + box.h)) <= tolerance.y;
    };
    if (onHandle(active)) return { key: active, mode: 'resize' };
    if (inside(active)) return { key: active, mode: 'move' };
    // Smallest box wins, so a little box sitting on a big one is still reachable.
    const covered = REGION_KEYS.filter(key => key !== active && inside(key))
      .sort((a, b) => (regions[a].w * regions[a].h) - (regions[b].w * regions[b].h));
    if (covered.length) return { key: covered[0], mode: 'move' };
    const handled = REGION_KEYS.find(key => key !== active && onHandle(key));
    if (handled) return { key: handled, mode: 'resize' };
    return null;
  }

  function nudgeActiveBox(dx, dy, resize) {
    const box = activeRegionBox();
    if (!box) return;
    if (resize) {
      box.w = round2(clamp(box.w + dx, 4, 100 - box.x));
      box.h = round2(clamp(box.h + dy, 4, 100 - box.y));
    } else {
      box.x = round2(clamp(box.x + dx, 0, 100 - box.w));
      box.y = round2(clamp(box.y + dy, 0, 100 - box.h));
    }
    syncLunchMirror(state.trainerLayout.data);
    syncBoxFields();
    drawTrainer();
  }

  function initBoxFields() {
    [['#boxX', 'x'], ['#boxY', 'y'], ['#boxW', 'w'], ['#boxH', 'h']].forEach(([selector, key]) => {
      const input = $(selector);
      if (!input) return;
      input.addEventListener('input', () => {
        const box = activeRegionBox();
        if (!box) return;
        const value = Number(input.value);
        if (!Number.isFinite(value) || input.value === '') return;
        if (key === 'w') box.w = clamp(value, 4, 100 - box.x);
        else if (key === 'h') box.h = clamp(value, 4, 100 - box.y);
        else if (key === 'x') box.x = clamp(value, 0, 100 - box.w);
        else box.y = clamp(value, 0, 100 - box.h);
        syncLunchMirror(state.trainerLayout.data);
        drawTrainer();
      });
      input.addEventListener('blur', syncBoxFields);
    });
    const scale = $('#boxScale');
    if (scale) scale.addEventListener('input', () => {
      const box = activeRegionBox();
      if (!box) return;
      box.scale = clamp(Number(scale.value) || 1, .4, 2);
      drawTrainer();
    });
    const align = $('#boxAlign');
    if (align) align.addEventListener('change', () => {
      const box = activeRegionBox();
      if (!box) return;
      box.align = align.value;
      drawTrainer();
    });
    const title = $('#boxTitle');
    if (title) title.addEventListener('change', () => {
      const box = activeRegionBox();
      if (!box) return;
      box.showTitle = title.checked;
      drawTrainer();
    });
    $$('[data-nudge]').forEach(button => button.addEventListener('click', () => {
      const [axis, direction] = button.dataset.nudge.split(':');
      const step = .5 * Number(direction);
      nudgeActiveBox(axis === 'x' ? step : 0, axis === 'y' ? step : 0, false);
    }));
    const resetBox = $('#resetBoxBtn');
    if (resetBox) resetBox.addEventListener('click', resetActiveRegion);
    const resetAll = $('#resetAllBtn');
    if (resetAll) resetAll.addEventListener('click', resetAllRegions);
  }

  function initBackgroundDropzone() {
    const input = $('#backgroundUpload');
    if (input) input.addEventListener('change', event => uploadBackgrounds(event.target.files));
    const picker = $('#pickBackground');
    if (picker) picker.addEventListener('click', openBackgroundPicker);
    const zone = $('#libraryPanel');
    if (!zone) return;
    ['dragenter', 'dragover'].forEach(type => zone.addEventListener(type, event => {
      event.preventDefault();
      if (picker) picker.classList.add('drag');
    }));
    ['dragleave', 'drop'].forEach(type => zone.addEventListener(type, event => {
      event.preventDefault();
      if (picker) picker.classList.remove('drag');
    }));
    zone.addEventListener('drop', event => uploadBackgrounds(event.dataTransfer?.files));
  }

  function initTrainer() {
    initBackgroundDropzone();
    initBoxFields();
    $('#layoutScale').addEventListener('input', () => { state.trainerLayout.data.textScale = Number($('#layoutScale').value); drawTrainer(); });
    $('#layoutColor').addEventListener('input', () => { state.trainerLayout.data.textColor = $('#layoutColor').value; drawTrainer(); });
    $('#layoutName').addEventListener('input', () => { state.trainerLayout.name = $('#layoutName').value; });
    $('#saveLayoutAsBtn').addEventListener('click', () => saveLayout(true));
    $('#updateLayoutBtn').addEventListener('click', () => saveLayout(false));

    const canvas = $('#trainerCanvas');
    canvas.addEventListener('pointerdown', event => {
      const point = trainerPoint(event);
      const hit = hitRegion(point);
      if (!hit) return;
      if (hit.key !== activeRegionKey()) selectRegion(hit.key);
      try { canvas.focus({ preventScroll: true }); } catch { canvas.focus(); }
      state.trainerDrag = { mode: hit.mode, key: hit.key, start: point, original: clone(state.trainerLayout.data.regions[hit.key]) };
      try { canvas.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', event => {
      const drag = state.trainerDrag;
      if (!drag) return;
      const point = trainerPoint(event);
      const dx = point.x - drag.start.x;
      const dy = point.y - drag.start.y;
      const box = state.trainerLayout.data.regions[drag.key];
      if (drag.mode === 'move') {
        box.x = round2(clamp(drag.original.x + dx, 0, 100 - box.w));
        box.y = round2(clamp(drag.original.y + dy, 0, 100 - box.h));
      } else {
        box.w = round2(clamp(drag.original.w + dx, 4, 100 - box.x));
        box.h = round2(clamp(drag.original.h + dy, 4, 100 - box.y));
      }
      syncLunchMirror(state.trainerLayout.data);
      drawTrainer();
    });
    const stop = event => {
      if (!state.trainerDrag) return;
      state.trainerDrag = null;
      syncBoxFields();
      try { canvas.releasePointerCapture(event.pointerId); } catch {}
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('keydown', event => {
      const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const step = steps[event.key];
      if (!step) return;
      event.preventDefault();
      const amount = event.altKey ? .1 : .5;
      nudgeActiveBox(step[0] * amount, step[1] * amount, event.shiftKey);
    });
  }

  function init() {
    initPin();
    initNavigation();
    initAi();
    initManual();
    initTrainer();
    mountPreview('ai');
    mountPreview('manual');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
