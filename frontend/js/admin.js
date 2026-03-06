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

(function () {
  const MULTI_UPLOAD_URL = `${API_BASE}/admin/products/upload`;
  console.log('[admin] API base:', API_BASE);

  const genSKU = () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let sku = '';
    for (let i = 0; i < 5; i += 1) sku += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `Rk-${sku}`;
  };

  const revokeObjectURLSafe = (url) => {
    try { URL.revokeObjectURL(url); } catch {}
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

  if (
    !pickBtn || !fileInput || !cardsGrid || !previewsGrid || !uploadBtn || !progressWrap ||
    !progressBar || !progressText || !resultBox || !skuInput || !categoryInput || !priceInput ||
    !salePriceInput || !typeInput || !sizeInput
  ) {
    return;
  }

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
    categoryInput.value = 'girls';

    renderPreviews();
    setUploadButtonState();
  };

  const validate = () => {
    let ok = true;

    if (!skuInput.value.trim()) ok = false;

    if (!priceInput.value || Number(priceInput.value) < 0) {
      priceInput.classList.add('input-error');
      ok = false;
    } else {
      priceInput.classList.remove('input-error');
    }

    if (!typeInput.value.trim()) {
      typeInput.classList.add('input-error');
      ok = false;
    } else {
      typeInput.classList.remove('input-error');
    }

    if (!sizeInput.value.trim()) {
      sizeInput.classList.add('input-error');
      ok = false;
    } else {
      sizeInput.classList.remove('input-error');
    }

    if (!['girls', 'boys'].includes(categoryInput.value)) {
      categoryInput.classList.add('input-error');
      ok = false;
    } else {
      categoryInput.classList.remove('input-error');
    }

    if (!state.files.length) ok = false;
    state.coverIndex = parseCoverIndex(state.coverIndex, state.files.length || 1);

    return ok;
  };

  const setUploadButtonState = () => {
    uploadBtn.disabled = !validate();
  };

  const renderPreviews = () => {
    previewsGrid.innerHTML = '';

    state.files.forEach((item, index) => {
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'product-preview-item';
      if (index === state.coverIndex) preview.classList.add('is-cover');
      preview.title = 'Set as cover';
      preview.setAttribute('aria-label', `Preview ${index + 1}`);

      const img = document.createElement('img');
      img.src = item.objectURL;
      img.alt = item.file.name || `image-${index + 1}`;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'preview-remove';
      removeBtn.textContent = 'x';
      removeBtn.title = 'Remove image';
      removeBtn.setAttribute('aria-label', `Remove image ${index + 1}`);

      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const removed = state.files.splice(index, 1)[0];
        if (removed?.objectURL) revokeObjectURLSafe(removed.objectURL);

        if (state.coverIndex >= state.files.length) {
          state.coverIndex = Math.max(0, state.files.length - 1);
        }

        renderPreviews();
        setUploadButtonState();
      });

      preview.addEventListener('click', () => {
        state.coverIndex = index;
        renderPreviews();
        setUploadButtonState();
      });

      preview.appendChild(img);

      if (index === state.coverIndex) {
        const badge = document.createElement('span');
        badge.className = 'cover-badge';
        badge.textContent = 'COVER';
        preview.appendChild(badge);
      }

      preview.appendChild(removeBtn);
      previewsGrid.appendChild(preview);
    });
  };

  const compressImageSafe = async (file) => {
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
  };

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

  const buildMultiFormData = () => {
    const form = new FormData();

    state.files.forEach(({ file }) => {
      form.append('images', file, file.name);
    });

    form.append('sku', skuInput.value.trim());
    form.append('price', String(Number(priceInput.value)));
    form.append('salePrice', salePriceInput.value.trim());
    form.append('type', typeInput.value.trim());
    form.append('size', sizeInput.value.trim());
    form.append('category', categoryInput.value);
    form.append('coverIndex', String(state.coverIndex));

    return form;
  };

  const buildLegacySingleFileFormData = ({ file, sku }) => {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('sku', sku);
    form.append('price', String(Number(priceInput.value)));
    form.append('salePrice', salePriceInput.value.trim());
    form.append('type', typeInput.value.trim());
    form.append('size', sizeInput.value.trim());
    form.append('category', categoryInput.value);
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
    if (!validate()) {
      alert('Fill required fields and add at least one image.');
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
      showResult('Uploaded successfully as one product.');
      resetDraft({ regenerateSku: true });
    } catch (err) {
      if (err?.status === 404 && ENABLE_LEGACY_UPLOAD_FALLBACK) {
        console.warn('[upload] /admin/products/upload not found; falling back to legacy category upload route.');
        try {
          await uploadLegacySequential();
          progressBar.value = 100;
          progressText.textContent = '100%';
          showResult('Uploaded via legacy endpoint as separate items (server is not updated yet).');
          resetDraft({ regenerateSku: true });
          return;
        } catch (legacyErr) {
          const msg = legacyErr?.message || `HTTP ${legacyErr?.status || 'unknown'}`;
          console.error('[upload] legacy fallback failed:', legacyErr);
          alert(`Upload failed (legacy fallback): ${msg}`);
          return;
        }
      }

      const notFoundHint = err?.status === 404
        ? 'Upload route not found: /api/admin/products/upload. Check backend deploy and route mount.'
        : null;
      const msg = notFoundHint || err?.message || `HTTP ${err?.status || 'unknown'}`;
      console.error('[upload] failed:', err);
      alert(`Upload failed: ${msg}`);
    } finally {
      cardsGrid.setAttribute('aria-busy', 'false');
      pickBtn.disabled = false;
      setUploadButtonState();
    }
  };

  pickBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;

    for (const file of files) {
      const processed = await compressImageSafe(file);
      const objectURL = URL.createObjectURL(processed);
      state.files.push({ file: processed, objectURL });
    }

    if (state.coverIndex >= state.files.length) state.coverIndex = 0;
    renderPreviews();
    setUploadButtonState();
    fileInput.value = '';
  });

  [priceInput, salePriceInput, typeInput, sizeInput, categoryInput].forEach((input) => {
    input.addEventListener('input', setUploadButtonState);
    input.addEventListener('change', setUploadButtonState);
  });

  uploadBtn.addEventListener('click', handleUpload);

  skuInput.value = genSKU();
  renderPreviews();
  setUploadButtonState();
})();

(function () {
  const API = API_BASE;

  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const resultBox = document.getElementById('search-result-box');
  const template = document.getElementById('search-photo-card-template');

  if (!searchForm || !searchInput || !resultBox || !template) return;

  const showMessage = (msg) => {
    resultBox.innerHTML = `<div class="saved-changes">${msg}</div>`;
    setTimeout(() => {
      resultBox.innerHTML = '';
    }, 5000);
  };

  const pickPreviewImage = (data) => {
    if (data?.imageUrl) return data.imageUrl;
    if (Array.isArray(data?.images) && data.images.length) {
      const idx = Number.isInteger(data.coverIndex) ? data.coverIndex : 0;
      return data.images[idx] || data.images[0];
    }
    return '';
  };

  const renderCard = (data) => {
    resultBox.innerHTML = '';
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.photo-card');

    card.querySelector('img.photo-thumb').src = pickPreviewImage(data);
    card.querySelector('input[name="sku"]').value = data.sku;
    card.querySelector('input[name="price"]').value = data.price;
    card.querySelector('input[name="salePrice"]').value = data.salePrice || '';
    card.querySelector('input[name="type"]').value = data.type;
    card.querySelector('input[name="size"]').value = data.size;
    card.querySelector('input[name="category"]').value = data.category;

    card.querySelector('.btn-save').addEventListener('click', async () => {
      const updated = {
        price: Number(card.querySelector('input[name="price"]').value),
        salePrice: Number(card.querySelector('input[name="salePrice"]').value) || null,
        type: card.querySelector('input[name="type"]').value.trim(),
        size: card.querySelector('input[name="size"]').value.trim(),
      };

      try {
        const res = await fetch(`${API}/admin/update/${data._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });

        if (!res.ok) throw new Error('Could not update data');
        searchInput.value = '';
        showMessage('Saved');
      } catch (err) {
        console.error(err);
        showMessage('Save error');
      }
    });

    card.querySelector('.btn-delete').addEventListener('click', async () => {
      if (!confirm('Delete this item?')) return;

      try {
        const res = await fetch(`${API}/admin/delete/${data._id}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('Could not delete');
        searchInput.value = '';
        showMessage('Deleted');
      } catch (err) {
        console.error(err);
        showMessage('Delete error');
      }
    });

    resultBox.appendChild(clone);
  };

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sku = searchInput.value.trim();
    if (!sku) return;

    resultBox.innerHTML = '<div class="not-found">Searching...</div>';

    try {
      const res = await fetch(`${API}/admin/find/${encodeURIComponent(sku)}`);
      if (res.status === 404) {
        return showMessage('Not found');
      }
      if (!res.ok) throw new Error('Request error');

      const data = await res.json();
      renderCard(data);
    } catch (err) {
      console.error(err);
      showMessage('Search error');
    }
  });
})();
