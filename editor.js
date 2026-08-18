(() => {
  'use strict';

  const SUPABASE_URL = 'https://fkisefambrcyxjrwrplb.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraXNlZmFtYnJjeHhqcndycGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNzA2NzEsImV4cCI6MjA5OTk0NjY3MX0.sDy0HJdssg_vxMQz0NvgLD7OykFZ2LfD6a6qtYevnyk';
  const PIN_HASH = '77334823791bea53e508ba59387c1287c8da962026769657b4686756db4b7bc8';
  const SESSION_PIN_KEY = 'hhPin';
  const AI_FILE_LIMIT = 4;

  const builtInBackground = {
    id: 'hotheadz-original',
    name: 'Original Hot Headz menu',
    url: '/images/FBMenu.png',
    source: 'website'
  };
  const builtInLayout = {
    id: 'hotheadz-original-layout',
    name: 'Original Menu',
    builtIn: true,
    data: {
      kind: 'menu-layout-v2',
      version: 2,
      backgroundId: builtInBackground.id,
      backgroundUrl: builtInBackground.url,
      lunchBox: { x: 9.5, y: 64.5, w: 22, h: 29 },
      textColor: '#f5eee5',
      textScale: 1
    }
  };

  const clone = value => JSON.parse(JSON.stringify(value));

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

  function supabaseHeaders() {
    return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' };
  }

  async function sbGet(path) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supabaseHeaders() });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) throw new Error((data && (data.message || data.error)) || text || `HTTP ${response.status}`);
    return data;
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
        sbGet('Hotheadz_menu_defaults?select=key,value,updated_at'),
        sbGet('Hotheadz_drawing_projects?select=id,name,data,updated_at&order=updated_at.desc')
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
    if (mode === 'setup' && matchMedia('(max-width: 900px)').matches) mode = 'ai';
    state.mode = mode;
    const map = { home: '#welcomeScreen', ai: '#aiScreen', manual: '#manualScreen', setup: '#setupScreen' };
    $$('.screen').forEach(screen => { screen.hidden = true; });
    $(map[mode] || map.home).hidden = false;
    $$('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
    if (mode === 'setup') {
      state.trainerLayout = clone(getActiveLayout());
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
      badge: $('[data-preview-state]', card)
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

  function drawImageContain(context, image, width, height) {
    context.fillStyle = '#0b0908';
    context.fillRect(0, 0, width, height);
    if (!image) return;
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
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

  function fittedLines(context, sourceLines, boxWidth, boxHeight, scale = 1) {
    let size = Math.round(23 * scale);
    let lines = [];
    while (size >= 12) {
      context.font = `700 ${size}px Arial, sans-serif`;
      lines = sourceLines.flatMap(line => wrapLine(context, line, boxWidth));
      const height = lines.length * size * 1.25;
      if (height <= boxHeight) break;
      size -= 1;
    }
    return { size, lines, lineHeight: size * 1.25 };
  }

  function drawSection(context, title, sourceItems, box, color, scale = 1) {
    const x = box.x / 100 * context.canvas.width;
    const y = box.y / 100 * context.canvas.height;
    const width = box.w / 100 * context.canvas.width;
    const height = box.h / 100 * context.canvas.height;
    const items = (sourceItems || []).map(item => typeof item === 'string' ? item : item.name).filter(Boolean);
    const source = [title, ...items.map(item => `• ${item}`)];
    context.save();
    context.fillStyle = color;
    context.textBaseline = 'top';
    context.shadowColor = 'rgba(0,0,0,.9)';
    context.shadowBlur = 8;
    const fit = fittedLines(context, source, width, height, scale);
    let cursorY = y;
    fit.lines.forEach((line, index) => {
      context.font = `${index === 0 ? '900' : '700'} ${fit.size}px Arial, sans-serif`;
      context.fillText(line, x, cursorY, width);
      cursorY += fit.lineHeight;
    });
    context.restore();
  }

  function dailyLunchItems(draft) {
    const sameDaily = state.defaults.sameDaily?.items || [];
    const lines = [
      ...(draft?.meats || []),
      ...(draft?.sides || []),
      ...(sameDaily.length ? [{ name: 'Same Daily' }, ...sameDaily] : [])
    ];
    return lines;
  }

  async function drawMenu(canvas, draft, date, layout, background, showTrainingBox = false) {
    const context = canvas.getContext('2d', { alpha: false });
    const image = await loadImage(background?.url || layout?.data?.backgroundUrl || builtInBackground.url);
    drawImageContain(context, image, canvas.width, canvas.height);
    const data = layout?.data || builtInLayout.data;
    const color = data.textColor || '#f5eee5';
    const textScale = Number(data.textScale) || 1;
    const dateObject = new Date(`${date || todayISO()}T12:00:00`);

    context.save();
    context.fillStyle = color;
    context.textAlign = 'center';
    context.shadowColor = 'rgba(0,0,0,.92)';
    context.shadowBlur = 12;
    context.font = `900 ${Math.round(64 * textScale)}px Arial, sans-serif`;
    context.fillText(dateObject.toLocaleDateString('en-US', { weekday: 'long' }), canvas.width * .5, canvas.height * .075);
    context.font = `700 ${Math.round(31 * textScale)}px Arial, sans-serif`;
    context.fillText(dateObject.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), canvas.width * .5, canvas.height * .115);
    context.restore();

    drawSection(context, 'BREAKFAST', state.defaults.breakfast?.items || ['Scrambled Eggs', 'Bacon', 'Sausage', 'Biscuits', 'Hashbrowns', 'Cheesy Grits', 'Sausage Gravy'], { x: 10.5, y: 34, w: 43, h: 25 }, color, textScale * .82);
    const salad = state.defaults.salad?.saladBar || {};
    drawSection(context, 'SALAD BAR', [...(salad.lettuce || []), ...(salad.toppings || []).slice(0, 15), ...(salad.dressing || []).slice(0, 5)], { x: 59, y: 34, w: 32, h: 32 }, color, textScale * .72);
    drawSection(context, 'DRINKS', state.defaults.drinks?.items || ['Sweet Tea', 'Unsweet Tea', 'Dr Pepper', 'Sprite', 'Coke', 'Coffee'], { x: 32.5, y: 65, w: 20, h: 25 }, color, textScale * .8);
    drawSection(context, 'LUNCH', dailyLunchItems(draft), data.lunchBox || builtInLayout.data.lunchBox, color, textScale);

    if (showTrainingBox) {
      const box = data.lunchBox || builtInLayout.data.lunchBox;
      const x = box.x / 100 * canvas.width;
      const y = box.y / 100 * canvas.height;
      const width = box.w / 100 * canvas.width;
      const height = box.h / 100 * canvas.height;
      context.save();
      context.fillStyle = 'rgba(242,107,53,.12)';
      context.strokeStyle = '#ff7b43';
      context.lineWidth = 6;
      context.setLineDash([18, 10]);
      context.fillRect(x, y, width, height);
      context.strokeRect(x, y, width, height);
      context.setLineDash([]);
      context.fillStyle = '#ff7b43';
      context.fillRect(x + width - 22, y + height - 22, 44, 44);
      context.fillStyle = '#fff';
      context.font = '900 22px Arial, sans-serif';
      context.textAlign = 'left';
      context.fillText('DAILY LUNCH ITEMS', x + 12, Math.max(28, y - 14));
      context.restore();
    }
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
    await drawMenu(preview.canvas, draft, currentDate(kind), layout, background);
    if (token !== state.renderToken && state.mode === kind) return;
  }

  function renderAllPreviews() {
    Object.keys(state.previews).forEach(renderPreview);
  }

  function downloadPreview(kind) {
    const preview = state.previews[kind];
    if (!currentDraft(kind) || !preview) return;
    try {
      const link = document.createElement('a');
      link.download = `hot-headz-menu-${currentDate(kind)}.jpg`;
      link.href = preview.canvas.toDataURL('image/jpeg', .92);
      link.click();
      toast('Menu image downloaded.', 'success');
    } catch {
      toast('The image could not be downloaded. Try the original background or upload it again.', 'error');
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
    backgroundList.innerHTML = state.backgrounds.map(background => `
      <button class="asset-item ${background.id === state.trainerLayout?.data?.backgroundId ? 'active' : ''}" data-background-id="${esc(background.id)}" type="button">
        <img src="${esc(background.url)}" alt=""><span><b>${esc(background.name)}</b><small>${background.source === 'supabase' ? 'Supabase background' : 'Original website background'}</small></span>
      </button>`).join('');
    layoutList.innerHTML = state.layouts.map(layout => `
      <button class="layout-item ${layout.id === state.trainerLayout?.id ? 'active' : ''}" data-layout-id="${esc(layout.id)}" type="button"><span><b>${esc(layout.name)}</b><small>${layout.builtIn ? 'Built-in starting layout' : 'Shared Supabase layout'}</small></span></button>`).join('');
    $$('[data-background-id]', backgroundList).forEach(button => button.addEventListener('click', () => {
      const background = state.backgrounds.find(item => item.id === button.dataset.backgroundId);
      if (!background) return;
      state.trainerLayout.data.backgroundId = background.id;
      state.trainerLayout.data.backgroundUrl = background.url;
      state.activeBackgroundId = background.id;
      refreshLibraries();
      drawTrainer();
    }));
    $$('[data-layout-id]', layoutList).forEach(button => button.addEventListener('click', () => {
      const layout = state.layouts.find(item => item.id === button.dataset.layoutId);
      if (!layout) return;
      state.trainerLayout = clone(layout);
      state.activeLayoutId = layout.id;
      state.activeBackgroundId = backgroundForLayout(layout).id;
      syncTrainerControls();
      refreshLibraries();
      refreshPreviewSelectors();
      drawTrainer();
      renderAllPreviews();
    }));
  }

  function syncTrainerControls() {
    $('#layoutName').value = state.trainerLayout?.name || 'Menu Layout';
    $('#layoutScale').value = String(state.trainerLayout?.data?.textScale || 1);
    $('#layoutColor').value = state.trainerLayout?.data?.textColor || '#f5eee5';
    $('#updateLayoutBtn').disabled = !!state.trainerLayout?.builtIn;
  }

  async function drawTrainer() {
    const canvas = $('#trainerCanvas');
    if (!canvas || !state.trainerLayout) return;
    const sample = {
      meats: [{ name: 'Beef Tips' }, { name: 'Smothered Chicken' }],
      sides: [{ name: 'Mashed Potatoes & Gravy' }, { name: 'Cabbage' }, { name: 'Green Beans' }, { name: 'Fried Okra' }]
    };
    const background = state.backgrounds.find(item => item.id === state.trainerLayout.data.backgroundId) || builtInBackground;
    await drawMenu(canvas, sample, todayISO(), state.trainerLayout, background, true);
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

  async function uploadBackgrounds(files) {
    const chosen = Array.from(files || []).slice(0, 8);
    if (!chosen.length) return;
    setStatus($('#setupStatus'), `Uploading ${chosen.length} background${chosen.length === 1 ? '' : 's'} to Supabase…`);
    $('#backgroundUpload').disabled = true;
    try {
      for (const file of chosen) {
        const id = uid('background');
        const dataUrl = await compressBackground(file);
        const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'menu-background';
        const url = await cloudUpload(`hotheadz/backgrounds/${id}-${safeName}.jpg`, dataUrl);
        state.backgrounds.push({ id, name: file.name.replace(/\.[^.]+$/, ''), url, source: 'supabase', createdAt: new Date().toISOString() });
      }
      await saveBackgroundLibrary();
      const newest = state.backgrounds[state.backgrounds.length - 1];
      state.trainerLayout.data.backgroundId = newest.id;
      state.trainerLayout.data.backgroundUrl = newest.url;
      state.activeBackgroundId = newest.id;
      refreshLibraries();
      refreshPreviewSelectors();
      await drawTrainer();
      setStatus($('#setupStatus'), 'Backgrounds saved to the Hot Headz Supabase library.', 'success');
      toast('Background library updated.', 'success');
    } catch (error) {
      setStatus($('#setupStatus'), `Upload failed: ${error.message}`, 'error');
    } finally {
      $('#backgroundUpload').disabled = false;
      $('#backgroundUpload').value = '';
    }
  }

  function trainerPayload(id, name) {
    const data = clone(state.trainerLayout.data || builtInLayout.data);
    data.kind = 'menu-layout-v2';
    data.version = 2;
    data.textScale = Number($('#layoutScale').value) || 1;
    data.textColor = $('#layoutColor').value || '#f5eee5';
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
      const layout = { id, name, data: payload.data, updatedAt: payload.updated_at };
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
      setStatus($('#setupStatus'), `Saved “${name}” to the shared layout library.`, 'success');
      toast('Layout saved.', 'success');
    } catch (error) {
      setStatus($('#setupStatus'), `Layout save failed: ${error.message}`, 'error');
    }
  }

  function trainerPoint(event) {
    const canvas = $('#trainerCanvas');
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 };
  }

  function initTrainer() {
    $('#backgroundUpload').addEventListener('change', event => uploadBackgrounds(event.target.files));
    $('#layoutScale').addEventListener('input', () => { state.trainerLayout.data.textScale = Number($('#layoutScale').value); drawTrainer(); });
    $('#layoutColor').addEventListener('input', () => { state.trainerLayout.data.textColor = $('#layoutColor').value; drawTrainer(); });
    $('#layoutName').addEventListener('input', () => { state.trainerLayout.name = $('#layoutName').value; });
    $('#saveLayoutAsBtn').addEventListener('click', () => saveLayout(true));
    $('#updateLayoutBtn').addEventListener('click', () => saveLayout(false));

    const canvas = $('#trainerCanvas');
    canvas.addEventListener('pointerdown', event => {
      const point = trainerPoint(event);
      const box = state.trainerLayout.data.lunchBox;
      const handle = Math.abs(point.x - (box.x + box.w)) < 3 && Math.abs(point.y - (box.y + box.h)) < 3;
      const inside = point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h;
      if (!handle && !inside) return;
      state.trainerDrag = { mode: handle ? 'resize' : 'move', start: point, original: clone(box) };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!state.trainerDrag) return;
      const point = trainerPoint(event);
      const drag = state.trainerDrag;
      const dx = point.x - drag.start.x;
      const dy = point.y - drag.start.y;
      const box = state.trainerLayout.data.lunchBox;
      if (drag.mode === 'move') {
        box.x = clamp(drag.original.x + dx, 0, 100 - box.w);
        box.y = clamp(drag.original.y + dy, 0, 100 - box.h);
      } else {
        box.w = clamp(drag.original.w + dx, 8, 100 - box.x);
        box.h = clamp(drag.original.h + dy, 10, 100 - box.y);
      }
      drawTrainer();
    });
    const stop = event => { if (state.trainerDrag) { state.trainerDrag = null; try { canvas.releasePointerCapture(event.pointerId); } catch {} } };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
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
