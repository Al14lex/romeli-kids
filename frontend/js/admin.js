

(function () {
  const genSKU = () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let sku = '';
    for (let i = 0; i < 5; i++) sku += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `Rk-${sku}`;
  };

  const revokeObjectURLSafe = (url) => {
    try { URL.revokeObjectURL(url); } catch {}
  };

  // ===== Фабрика секції =====
  function initUploadSection({ prefix, uploadUrl, category }) {
    const pickBtn = document.getElementById(`${prefix}-pick-files`);
    const fileInput = document.getElementById(`${prefix}-file-input`);
    const cardsGrid = document.getElementById(`${prefix}-cards-grid`);
    const uploadAllBtn = document.getElementById(`${prefix}-upload-all`);
    const progressWrap = document.getElementById(`${prefix}-upload-progress`);
    const progressBar = document.getElementById(`${prefix}-progress-bar`);
    const progressText = document.getElementById(`${prefix}-progress-text`);
    const resultBox = document.getElementById(`${prefix}-upload-result`);
    const template = document.getElementById(`${prefix}-photo-card-template`);

    // якщо секції нема в DOM — тихо виходимо (щоб скрипт був універсальний)
    if (!pickBtn || !fileInput || !cardsGrid || !uploadAllBtn || !template) return;

    // стан секції (ізольовано)
    let cardSeq = 0;
    const STATE = new Map(); // cardId -> { file, objectURL }

    const validateCard = (cardEl) => {
      const price = cardEl.querySelector('input[name="price"]');
      const type  = cardEl.querySelector('input[name="type"]');
      const size  = cardEl.querySelector('input[name="size"]');
      const sku   = cardEl.querySelector('input[name="sku"]');
      let ok = true;

      if (!price.value || Number(price.value) < 0) { price.classList.add('input-error'); ok = false; }
      else price.classList.remove('input-error');

      if (!type.value.trim()) { type.classList.add('input-error'); ok = false; }
      else type.classList.remove('input-error');

      if (!size.value.trim()) { size.classList.add('input-error'); ok = false; }
      else size.classList.remove('input-error');

      if (!sku.value.trim()) ok = false;

      return ok;
    };

    const setUploadButtonState = () => {
      const cards = [...cardsGrid.querySelectorAll('.photo-card')];
      uploadAllBtn.disabled = !cards.length || !cards.every(validateCard);
    };

    const readCardData = (cardEl) => {
      const cardId    = cardEl.dataset.cardId;
      const sku       = cardEl.querySelector('input[name="sku"]').value.trim();
      const price     = cardEl.querySelector('input[name="price"]').value.trim();
      const salePrice = cardEl.querySelector('input[name="salePrice"]').value.trim();
      const type      = cardEl.querySelector('input[name="type"]').value.trim();
      const size      = cardEl.querySelector('input[name="size"]').value.trim();
      const st        = STATE.get(cardId);
      return {
        file: st?.file || null,
        sku,
        price: price ? Number(price) : null,
        salePrice: salePrice ? Number(salePrice) : null,
        type,
        size,
      };
    };

    const createCardFromFile = (file) => {
      const clone = template.content.cloneNode(true);
      const article = clone.querySelector('.photo-card');

      cardSeq += 1;
      const cardId = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      article.dataset.cardId = cardId;

      const sku = genSKU();
      article.dataset.sku = sku;

      // заміна плейсхолдерів __ID__ у всіх id та їх label[for]
      article.querySelectorAll('[id*="__ID__"]').forEach((el) => {
          // el.id = el.id.replace('__ID__', cardSeq);
          el.id = el.id.replace('__ID__', `${prefix}_${cardSeq}`);
      });
      article.querySelectorAll('label[for*="__ID__"]').forEach((lab) => {
          // lab.htmlFor = lab.htmlFor.replace('__ID__', cardSeq);
          lab.htmlFor = lab.htmlFor.replace('__ID__', `${prefix}_${cardSeq}`);
      });

      // поставити SKU
      article.querySelector('input[name="sku"]').value = sku;

      // прев’ю
      const img = article.querySelector('.photo-thumb');
      const objectURL = URL.createObjectURL(file);
      img.src = objectURL;
      img.alt = file.name;

      // зберегти у стан
      STATE.set(cardId, { file, objectURL });

      // видалення картки
      article.querySelector('.btn-remove').addEventListener('click', () => {
        const st = STATE.get(cardId);
        if (st?.objectURL) revokeObjectURLSafe(st.objectURL);
        STATE.delete(cardId);
        article.remove();
        setUploadButtonState();
      });

      // live-валідація
      article.querySelectorAll('input').forEach((inp) => {
        inp.addEventListener('input', setUploadButtonState);
      });

      // в DOM
      cardsGrid.appendChild(article);
      setUploadButtonState();
    };

    // XHR з прогресом
    const uploadWithProgress = ({ file, meta, onProgress }) =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && typeof onProgress === 'function') {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
            } else {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          }
        };

        const form = new FormData();
        form.append('file', file, file.name);
        form.append('sku', meta.sku);
        form.append('price', String(meta.price ?? ''));
        if (meta.salePrice != null) form.append('salePrice', String(meta.salePrice));
        form.append('type', meta.type);
        form.append('size', meta.size);
        form.append('category', category); // girls | boys

        xhr.send(form);
      });

    const uploadAll = async () => {
      const cards = [...cardsGrid.querySelectorAll('.photo-card')];
      if (!cards.length) return;

      resultBox.hidden = true;
      progressWrap.hidden = false;
      progressBar.value = 0;
      progressText.textContent = '0%';
      uploadAllBtn.disabled = true;
      pickBtn.disabled = true;
      cardsGrid.setAttribute('aria-busy', 'true');

      const total = cards.length;
      let completed = 0;

      const updateGlobalProgress = (pctOfCurrent) => {
        const overall = Math.min(100, Math.round(((completed + pctOfCurrent / 100) / total) * 100));
        progressBar.value = overall;
        progressText.textContent = `${overall}%`;
      };

      try {
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];

          if (!validateCard(card)) throw new Error('Заповни всі обов’язкові поля перед завантаженням.');
          const data = readCardData(card);
          if (!data.file) throw new Error('Відсутній файл у картці.');

          await uploadWithProgress({
            file: data.file,
            meta: {
              sku: data.sku,
              price: data.price,
              salePrice: data.salePrice,
              type: data.type,
              size: data.size,
            },
            onProgress: (p) => updateGlobalProgress(p),
          });

          completed += 1;
          updateGlobalProgress(100);

          const cardId = card.dataset.cardId;
          const st = STATE.get(cardId);
          if (st?.objectURL) revokeObjectURLSafe(st.objectURL);
          STATE.delete(cardId);
          card.remove();
        }

        resultBox.hidden = false;
        resultBox.querySelector('.success-message').textContent = 'Успішно завантажено!';
      } catch (err) {
        console.error(err);
        alert(`Помилка завантаження: ${err.message || err}`);
      } finally {
        cardsGrid.setAttribute('aria-busy', 'false');
        pickBtn.disabled = false;
        setUploadButtonState();
        // progressWrap.hidden = true; // якщо хочеш ховати після завершення
      }
    };

    // Події
    pickBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;
      files.forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        createCardFromFile(file);
      });
      fileInput.value = ''; // щоб повторний вибір тих самих файлів тригерив change
    });
    uploadAllBtn.addEventListener('click', uploadAll);

    // старт
    setUploadButtonState();
  }

  // ==== Ініціалізація двох секцій однією функцією ====
  // важливо: ці ендпоінти ми потім реалізуємо в бекенді
  initUploadSection({ prefix: 'girls', uploadUrl: 'http://localhost:5000/api/admin/girls/upload', category: 'girls' });
  initUploadSection({ prefix: 'boys',  uploadUrl: 'http://localhost:5000/api/admin/boys/upload',  category: 'boys'  });
})();


// ==== Пошук, редагування та видалення фото за SKU ====
(function () {
  const API = 'http://localhost:5000';

  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const resultBox = document.getElementById('search-result-box');
  const template = document.getElementById('search-photo-card-template');

  if (!searchForm || !searchInput || !resultBox || !template) return;

  // Рендер повідомлення з автозниканням
  const showMessage = (msg) => {
    resultBox.innerHTML = `<div class="saved-changes">${msg}</div>`;
    setTimeout(() => {
      resultBox.innerHTML = '';
    }, 5000);
  };

  // Рендер картки фото для редагування
  const renderCard = (data) => {
    resultBox.innerHTML = '';
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.photo-card');

    // Заповнення даних
    card.querySelector('img.photo-thumb').src = data.imageUrl;
    card.querySelector('input[name="sku"]').value = data.sku;
    card.querySelector('input[name="price"]').value = data.price;
    card.querySelector('input[name="salePrice"]').value = data.salePrice || '';
    card.querySelector('input[name="type"]').value = data.type;
    card.querySelector('input[name="size"]').value = data.size;
    card.querySelector('input[name="category"]').value = data.category;

    // Кнопка збереження
    card.querySelector('.btn-save').addEventListener('click', async () => {
      const updated = {
        price: Number(card.querySelector('input[name="price"]').value),
        salePrice: Number(card.querySelector('input[name="salePrice"]').value) || null,
        type: card.querySelector('input[name="type"]').value.trim(),
        size: card.querySelector('input[name="size"]').value.trim()
      };

      try {
        const res = await fetch(`${API}/api/admin/update/${data._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });

        if (!res.ok) throw new Error('Не вдалося оновити дані');
        searchInput.value = '';
        showMessage('Зміни збережено успішно!');
      } catch (err) {
        console.error(err);
        showMessage('Помилка при збереженні змін');
      }
    });

    // Кнопка видалення
    card.querySelector('.btn-delete').addEventListener('click', async () => {
      if (!confirm('Ви дійсно хочете видалити це фото?')) return;

      try {
        const res = await fetch(`${API}/api/admin/delete/${data._id}`, {
          method: 'DELETE'
        });

          if (!res.ok) throw new Error('Не вдалося видалити');
          searchInput.value = '';
        showMessage('Фото видалено!');
      } catch (err) {
        console.error(err);
        showMessage('Помилка при видаленні');
      }
    });

    resultBox.appendChild(clone);
  };

  // Обробка форми пошуку
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sku = searchInput.value.trim();
    if (!sku) return;

    resultBox.innerHTML = '<div class="not-found">Пошук...</div>';

    try {
      const res = await fetch(`${API}/api/admin/find/${encodeURIComponent(sku)}`);
      if (res.status === 404) return showMessage('Такого фото немає у сховищі або ви ввели невірний артикль');
      if (!res.ok) throw new Error('Помилка запиту');

      const data = await res.json();
      renderCard(data);
    } catch (err) {
      console.error(err);
      showMessage('Сталася помилка під час пошуку');
    }
  });
})();
