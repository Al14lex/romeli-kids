const RENDER_API_BASE = 'https://romeli-kids.onrender.com/api';

function resolveApiBase() {
  const host = window.location.hostname;
  if (host.endsWith('vercel.app')) {
    return RENDER_API_BASE;
  }
  return '/api';
}

const API_BASE = window.__API_BASE__ || resolveApiBase();
const ENABLE_LEGACY_UPLOAD_FALLBACK = window.__ENABLE_LEGACY_UPLOAD_FALLBACK__ === true;
const NOTES_MAX_LENGTH = 300;

// Must match the "Typ odzieży" filters on girls.html / boys.html,
// so every product can be found with the filters.
const PRODUCT_TYPES = [
  'Odzież zimowa',
  'Odzież przejściowa',
  'Bluza/Sweter',
  'Zestawy',
  'Komplety',
  'Body/Pajacyk',
  'Kombinezon/Ogrodniczki',
  'T-shirt',
  'Bluzka',
  'Koszula',
  'Sukienka',
  'Spódnica/Spodenki',
  'Spodnie/Legginsy',
  'Odzież sportowa',
  'Piżama',
  'Obuwie',
  'Inne',
];

// ===== Shared helpers =====

const revokeObjectURLSafe = (url) => {
  try { URL.revokeObjectURL(url); } catch {}
};

const sameText = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Fills a <select> with the product types. A value that is not in the list
// (older products) is kept as an extra option so it is not lost on save.
function fillTypeSelect(select, currentValue = '') {
  select.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— оберіть тип —';
  select.appendChild(placeholder);

  let matched = '';
  PRODUCT_TYPES.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
    if (currentValue && sameText(type, currentValue)) matched = type;
  });

  if (currentValue && !matched) {
    const legacy = document.createElement('option');
    legacy.value = currentValue;
    legacy.textContent = `${currentValue} (старий тип, оберіть новий)`;
    select.appendChild(legacy);
    matched = currentValue;
  }

  select.value = matched;
}

function bindNotesCounter(textarea, counter) {
  const update = () => {
    counter.textContent = `${textarea.value.length}/${NOTES_MAX_LENGTH}`;
    counter.classList.toggle('is-full', textarea.value.length >= NOTES_MAX_LENGTH);
  };
  textarea.addEventListener('input', update);
  update();
  return update;
}

async function compressImageSafe(file) {
  if (typeof imageCompression !== 'function') return file;

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
  };

  try {
    const compressed = await imageCompression(file, options);
    return new File([compressed], file.name, { type: compressed.type || file.type });
  } catch (err) {
    console.error('Compression error:', err);
    return file;
  }
}

// Renders photo previews. items: [{ src, label }]. Click = set cover, "x" = remove.
function renderPhotoPreviews({ container, items, coverIndex, onSetCover, onRemove }) {
  container.innerHTML = '';

  items.forEach((item, index) => {
    const preview = document.createElement('div');
    preview.className = 'product-preview-item';
    preview.setAttribute('role', 'button');
    preview.setAttribute('tabindex', '0');
    preview.title = 'Зробити головним фото';
    preview.setAttribute('aria-label', `Фото ${index + 1}${index === coverIndex ? ' (головне)' : ''}`);
    if (index === coverIndex) preview.classList.add('is-cover');

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.label || `image-${index + 1}`;
    preview.appendChild(img);

    if (index === coverIndex) {
      const badge = document.createElement('span');
      badge.className = 'cover-badge';
      badge.textContent = 'ГОЛОВНЕ';
      preview.appendChild(badge);
    }

    if (item.isNew) {
      const badgeNew = document.createElement('span');
      badgeNew.className = 'new-photo-badge';
      badgeNew.textContent = 'нове';
      preview.appendChild(badgeNew);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'preview-remove';
    removeBtn.textContent = 'x';
    removeBtn.title = 'Видалити фото';
    removeBtn.setAttribute('aria-label', `Видалити фото ${index + 1}`);
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemove(index);
    });
    preview.appendChild(removeBtn);

    preview.addEventListener('click', () => onSetCover(index));
    preview.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSetCover(index);
      }
    });

    container.appendChild(preview);
  });
}

// Cover index after removing the photo at removedIndex.
function coverAfterRemove(coverIndex, removedIndex, remainingCount) {
  if (remainingCount <= 0) return 0;
  if (removedIndex < coverIndex) return coverIndex - 1;
  if (removedIndex === coverIndex) return Math.min(coverIndex, remainingCount - 1);
  return coverIndex;
}

// ===== Upload: new product =====
(function () {
  const MULTI_UPLOAD_URL = `${API_BASE}/admin/products/upload`;
  console.log('[admin] API base:', API_BASE);

  const genSKU = () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let sku = '';
    for (let i = 0; i < 5; i += 1) sku += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `Rk-${sku}`;
  };

  const pickBtn = document.getElementById('product-pick-files');
  const fileInput = document.getElementById('product-file-input');
  const cardsGrid = document.getElementById('product-cards-grid');
  const previewsGrid = document.getElementById('product-previews-grid');
  const uploadBtn = document.getElementById('product-upload');
  const progressWrap = document.getElementById('product-upload-progress');
  const progressBar = document.getElementById('product-progress-bar');
  const progressText = document.getElementById('product-progress-text');
  const resultBox = document.getElementById('product-upload-result');

  const skuInput = document.getElementById('product-sku');
  const categoryInput = document.getElementById('product-category');
  const priceInput = document.getElementById('product-price');
  const salePriceInput = document.getElementById('product-sale-price');
  const typeInput = document.getElementById('product-type');
  const sizeInput = document.getElementById('product-size');
  const notesInput = document.getElementById('product-notes');
  const notesCounter = document.getElementById('product-notes-counter');

  if (
    !pickBtn || !fileInput || !cardsGrid || !previewsGrid || !uploadBtn || !progressWrap ||
    !progressBar || !progressText || !resultBox || !skuInput || !categoryInput || !priceInput ||
    !salePriceInput || !typeInput || !sizeInput || !notesInput || !notesCounter
  ) {
    return;
  }

  fillTypeSelect(typeInput);
  const updateNotesCounter = bindNotesCounter(notesInput, notesCounter);

  const state = {
    files: [],
    coverIndex: 0,
  };

  const showResult = (message) => {
    resultBox.hidden = false;
    const msgNode = resultBox.querySelector('.success-message');
    if (msgNode) msgNode.textContent = message;
  };

  const parseCoverIndex = (value, total) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) return 0;
    if (parsed < 0 || parsed >= total) return 0;
    return parsed;
  };

  const resetDraft = ({ regenerateSku = false } = {}) => {
    state.files.forEach((item) => revokeObjectURLSafe(item.objectURL));
    state.files = [];
    state.coverIndex = 0;

    if (regenerateSku) skuInput.value = genSKU();
    priceInput.value = '';
    salePriceInput.value = '';
    typeInput.value = '';
    sizeInput.value = '';
    notesInput.value = '';
    updateNotesCounter();
    categoryInput.value = 'girls';
    [priceInput, salePriceInput, typeInput, sizeInput, categoryInput].forEach((input) => {
      delete input.dataset.touched;
      input.classList.remove('input-error');
    });

    renderPreviews();
    setUploadButtonState();
  };

  const markField = (input, valid) => {
    input.classList.toggle('input-error', !valid);
    return valid;
  };

  const validate = ({ highlight = false } = {}) => {
    const checks = [
      [priceInput, priceInput.value !== '' && Number(priceInput.value) >= 0],
      [typeInput, !!typeInput.value.trim()],
      [sizeInput, !!sizeInput.value.trim()],
      [categoryInput, ['girls', 'boys'].includes(categoryInput.value)],
    ];

    let ok = !!skuInput.value.trim() && state.files.length > 0;
    checks.forEach(([input, valid]) => {
      // Only show red borders after the user tried to upload or touched the field.
      if (highlight || input.dataset.touched === 'true') markField(input, valid);
      if (!valid) ok = false;
    });

    state.coverIndex = parseCoverIndex(state.coverIndex, state.files.length || 1);
    return ok;
  };

  const setUploadButtonState = () => {
    uploadBtn.disabled = !validate();
  };

  function renderPreviews() {
    renderPhotoPreviews({
      container: previewsGrid,
      items: state.files.map((item) => ({ src: item.objectURL, label: item.file.name })),
      coverIndex: state.coverIndex,
      onSetCover: (index) => {
        state.coverIndex = index;
        renderPreviews();
        setUploadButtonState();
      },
      onRemove: (index) => {
        const removed = state.files.splice(index, 1)[0];
        if (removed?.objectURL) revokeObjectURLSafe(removed.objectURL);
        state.coverIndex = coverAfterRemove(state.coverIndex, index, state.files.length);
        renderPreviews();
        setUploadButtonState();
      },
    });
  }

  const requestWithProgress = ({ url, payload, onProgress }) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.onreadystatechange = function onReadyStateChange() {
      if (xhr.readyState !== 4) return;

      let body = null;
      if (xhr.responseText) {
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          body = null;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body || {});
        return;
      }

      const message = body?.message || xhr.responseText || `HTTP ${xhr.status}`;
      reject({ status: xhr.status, message });
    };

    xhr.send(payload);
  });

  const appendCommonFields = (form) => {
    form.append('price', String(Number(priceInput.value)));
    form.append('salePrice', salePriceInput.value.trim());
    form.append('type', typeInput.value.trim());
    form.append('size', sizeInput.value.trim());
    form.append('category', categoryInput.value);
    form.append('notes', notesInput.value.trim());
  };

  const buildMultiFormData = () => {
    const form = new FormData();

    state.files.forEach(({ file }) => {
      form.append('images', file, file.name);
    });

    form.append('sku', skuInput.value.trim());
    appendCommonFields(form);
    form.append('coverIndex', String(state.coverIndex));

    return form;
  };

  const buildLegacySingleFileFormData = ({ file, sku }) => {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('sku', sku);
    appendCommonFields(form);
    return form;
  };

  const uploadLegacySequential = async () => {
    const total = state.files.length;
    const category = categoryInput.value;
    const baseSku = skuInput.value.trim();
    const legacyUrl = `${API_BASE}/admin/${category}/upload`;

    for (let index = 0; index < total; index += 1) {
      const file = state.files[index].file;
      const fileSku = total === 1 ? baseSku : `${baseSku}-${index + 1}`;
      const payload = buildLegacySingleFileFormData({ file, sku: fileSku });

      await requestWithProgress({
        url: legacyUrl,
        payload,
        onProgress: (fileProgress) => {
          const overall = Math.round(((index + (fileProgress / 100)) / total) * 100);
          progressBar.value = overall;
          progressText.textContent = `${overall}%`;
        },
      });
    }
  };

  const handleUpload = async () => {
    if (!validate({ highlight: true })) {
      alert('Заповніть обов’язкові поля (ціна, тип, розмір) і додайте хоча б одне фото.');
      return;
    }

    resultBox.hidden = true;
    progressWrap.hidden = false;
    progressBar.value = 0;
    progressText.textContent = '0%';
    uploadBtn.disabled = true;
    pickBtn.disabled = true;
    cardsGrid.setAttribute('aria-busy', 'true');

    try {
      const payload = buildMultiFormData();
      await requestWithProgress({
        url: MULTI_UPLOAD_URL,
        payload,
        onProgress: (p) => {
          progressBar.value = p;
          progressText.textContent = `${p}%`;
        },
      });

      progressBar.value = 100;
      progressText.textContent = '100%';
      showResult(`Товар ${skuInput.value.trim()} успішно завантажено!`);
      resetDraft({ regenerateSku: true });
    } catch (err) {
      if (err?.status === 404 && ENABLE_LEGACY_UPLOAD_FALLBACK) {
        console.warn('[upload] /admin/products/upload not found; falling back to legacy category upload route.');
        try {
          await uploadLegacySequential();
          progressBar.value = 100;
          progressText.textContent = '100%';
          showResult('Завантажено через старий маршрут окремими товарами (сервер ще не оновлено).');
          resetDraft({ regenerateSku: true });
          return;
        } catch (legacyErr) {
          const msg = legacyErr?.message || `HTTP ${legacyErr?.status || 'unknown'}`;
          console.error('[upload] legacy fallback failed:', legacyErr);
          alert(`Помилка завантаження (старий маршрут): ${msg}`);
          return;
        }
      }

      const notFoundHint = err?.status === 404
        ? 'Маршрут завантаження не знайдено: /api/admin/products/upload. Перевірте, чи оновлено сервер.'
        : null;
      const msg = notFoundHint || err?.message || `HTTP ${err?.status || 'unknown'}`;
      console.error('[upload] failed:', err);
      alert(`Помилка завантаження: ${msg}`);
    } finally {
      progressWrap.hidden = true;
      cardsGrid.setAttribute('aria-busy', 'false');
      pickBtn.disabled = false;
      setUploadButtonState();
    }
  };

  pickBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []).filter((file) => file.type.startsWith('image/'));
    fileInput.value = '';
    if (!files.length) return;

    pickBtn.disabled = true;
    try {
      for (const file of files) {
        const processed = await compressImageSafe(file);
        const objectURL = URL.createObjectURL(processed);
        state.files.push({ file: processed, objectURL });
      }
    } finally {
      pickBtn.disabled = false;
    }

    if (state.coverIndex >= state.files.length) state.coverIndex = 0;
    renderPreviews();
    setUploadButtonState();
  });

  [priceInput, salePriceInput, typeInput, sizeInput, categoryInput].forEach((input) => {
    const touch = () => {
      input.dataset.touched = 'true';
      setUploadButtonState();
    };
    input.addEventListener('input', touch);
    input.addEventListener('change', touch);
  });

  uploadBtn.addEventListener('click', handleUpload);

  skuInput.value = genSKU();
  renderPreviews();
  setUploadButtonState();
})();

// ===== Search by SKU + full edit =====
(function () {
  const API = API_BASE;

  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const resultBox = document.getElementById('search-result-box');
  const template = document.getElementById('search-photo-card-template');

  if (!searchForm || !searchInput || !resultBox || !template) return;

  let messageTimer = null;
  let activeEditor = null;

  const clearEditor = () => {
    if (activeEditor) activeEditor.destroy();
    activeEditor = null;
  };

  const showMessage = (msg) => {
    clearEditor();
    clearTimeout(messageTimer);
    resultBox.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'saved-changes';
    box.textContent = msg;
    resultBox.appendChild(box);
    messageTimer = setTimeout(() => {
      if (resultBox.contains(box)) resultBox.innerHTML = '';
    }, 5000);
  };

  const readError = async (res) => {
    try {
      const body = await res.json();
      return body?.message || `HTTP ${res.status}`;
    } catch {
      return `HTTP ${res.status}`;
    }
  };

  const renderCard = (data) => {
    clearEditor();
    clearTimeout(messageTimer);
    resultBox.innerHTML = '';

    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.photo-card');

    const els = {
      previews: card.querySelector('.edit-previews-grid'),
      addPhotosBtn: card.querySelector('.btn-add-photos'),
      fileInput: card.querySelector('.edit-file-input'),
      sku: card.querySelector('input[name="sku"]'),
      category: card.querySelector('select[name="category"]'),
      price: card.querySelector('input[name="price"]'),
      salePrice: card.querySelector('input[name="salePrice"]'),
      type: card.querySelector('select[name="type"]'),
      size: card.querySelector('input[name="size"]'),
      notes: card.querySelector('textarea[name="notes"]'),
      notesCounter: card.querySelector('.notes-counter'),
      saveBtn: card.querySelector('.btn-save'),
      deleteBtn: card.querySelector('.btn-delete'),
      status: card.querySelector('.edit-status'),
    };

    const existingImages = Array.isArray(data.images) && data.images.length
      ? data.images.filter(Boolean)
      : (data.imageUrl ? [data.imageUrl] : []);

    // Photos in display order: existing first, then newly added.
    const state = {
      photos: existingImages.map((url) => ({ kind: 'existing', url, src: url })),
      coverIndex: Number.isInteger(data.coverIndex) && data.coverIndex < existingImages.length
        ? data.coverIndex
        : 0,
      busy: false,
    };

    els.sku.value = data.sku || '';
    els.category.value = data.category === 'boys' ? 'boys' : 'girls';
    els.price.value = data.price ?? '';
    els.salePrice.value = data.salePrice ?? '';
    fillTypeSelect(els.type, data.type || '');
    els.size.value = data.size || '';
    els.notes.value = data.notes || '';
    bindNotesCounter(els.notes, els.notesCounter);

    const setStatus = (text, kind = '') => {
      els.status.textContent = text;
      els.status.className = `edit-status${kind ? ` is-${kind}` : ''}`;
    };

    const setBusy = (busy) => {
      state.busy = busy;
      [els.saveBtn, els.deleteBtn, els.addPhotosBtn].forEach((btn) => { btn.disabled = busy; });
      card.setAttribute('aria-busy', busy ? 'true' : 'false');
    };

    const renderPhotos = () => {
      renderPhotoPreviews({
        container: els.previews,
        items: state.photos.map((photo) => ({ src: photo.src, isNew: photo.kind === 'new' })),
        coverIndex: state.coverIndex,
        onSetCover: (index) => {
          state.coverIndex = index;
          renderPhotos();
        },
        onRemove: (index) => {
          if (state.photos.length === 1) {
            setStatus('Товар має мати хоча б одне фото. Спочатку додайте нове.', 'error');
            return;
          }
          const [removed] = state.photos.splice(index, 1);
          if (removed?.kind === 'new') revokeObjectURLSafe(removed.src);
          state.coverIndex = coverAfterRemove(state.coverIndex, index, state.photos.length);
          renderPhotos();
        },
      });
    };

    const validate = () => {
      const checks = [
        [els.price, els.price.value !== '' && Number(els.price.value) >= 0],
        [els.salePrice, els.salePrice.value === '' || Number(els.salePrice.value) >= 0],
        [els.type, !!els.type.value.trim()],
        [els.size, !!els.size.value.trim()],
      ];
      let ok = true;
      checks.forEach(([input, valid]) => {
        input.classList.toggle('input-error', !valid);
        if (!valid) ok = false;
      });
      if (!state.photos.length) ok = false;
      return ok;
    };

    els.addPhotosBtn.addEventListener('click', () => els.fileInput.click());

    els.fileInput.addEventListener('change', async () => {
      const files = Array.from(els.fileInput.files || []).filter((file) => file.type.startsWith('image/'));
      els.fileInput.value = '';
      if (!files.length) return;

      setBusy(true);
      setStatus('Готую фото…');
      try {
        for (const file of files) {
          const processed = await compressImageSafe(file);
          state.photos.push({ kind: 'new', file: processed, src: URL.createObjectURL(processed) });
        }
        setStatus('Фото додано. Не забудьте натиснути «Зберегти».');
      } finally {
        setBusy(false);
      }
      renderPhotos();
    });

    els.saveBtn.addEventListener('click', async () => {
      if (state.busy) return;
      if (!validate()) {
        setStatus('Перевірте поля, виділені червоним.', 'error');
        return;
      }

      const form = new FormData();
      form.append('price', String(Number(els.price.value)));
      form.append('salePrice', els.salePrice.value.trim());
      form.append('type', els.type.value.trim());
      form.append('size', els.size.value.trim());
      form.append('category', els.category.value);
      form.append('notes', els.notes.value.trim());
      form.append('keepImages', JSON.stringify(
        state.photos.filter((photo) => photo.kind === 'existing').map((photo) => photo.url)
      ));
      state.photos
        .filter((photo) => photo.kind === 'new')
        .forEach((photo) => form.append('images', photo.file, photo.file.name));
      form.append('coverIndex', String(state.coverIndex));

      setBusy(true);
      setStatus('Зберігаю…');
      try {
        const res = await fetch(`${API}/admin/products/${data._id}`, {
          method: 'PATCH',
          body: form,
        });
        if (!res.ok) throw new Error(await readError(res));

        const body = await res.json();
        renderCard(body.product || data);
        activeEditor?.setStatus('Збережено ✓', 'success');
      } catch (err) {
        console.error(err);
        setStatus(`Помилка збереження: ${err.message}`, 'error');
        setBusy(false);
      }
    });

    els.deleteBtn.addEventListener('click', async () => {
      if (state.busy) return;
      if (!confirm(`Видалити товар ${data.sku} разом з усіма фото?`)) return;

      setBusy(true);
      setStatus('Видаляю…');
      try {
        const res = await fetch(`${API}/admin/delete/${data._id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(await readError(res));
        searchInput.value = '';
        showMessage(`Товар ${data.sku} видалено`);
      } catch (err) {
        console.error(err);
        setStatus(`Помилка видалення: ${err.message}`, 'error');
        setBusy(false);
      }
    });

    renderPhotos();
    resultBox.appendChild(clone);

    activeEditor = {
      setStatus,
      destroy: () => {
        state.photos
          .filter((photo) => photo.kind === 'new')
          .forEach((photo) => revokeObjectURLSafe(photo.src));
      },
    };
  };

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sku = searchInput.value.trim();
    if (!sku) return;

    clearEditor();
    resultBox.innerHTML = '<div class="not-found">Шукаю…</div>';

    try {
      const res = await fetch(`${API}/admin/find/${encodeURIComponent(sku)}`);
      if (res.status === 404) {
        showMessage('Товар не знайдено');
        return;
      }
      if (!res.ok) throw new Error('Request error');

      const data = await res.json();
      renderCard(data);
    } catch (err) {
      console.error(err);
      showMessage('Помилка пошуку');
    }
  });
})();
