// /* admin-girls-upload.js
//    Логіка для секції "Завантажити фото для дівчаток".
//    Працює з наявною розміткою (ids, template) без змін в HTML.
// */

// (function () {
//   // ====== ЕЛЕМЕНТИ DOM ======
//   const pickBtn = document.getElementById('girls-pick-files');
//   const fileInput = document.getElementById('girls-file-input');
//   const cardsGrid = document.getElementById('girls-cards-grid');
//   const uploadAllBtn = document.getElementById('girls-upload-all');
//   const progressWrap = document.getElementById('girls-upload-progress');
//   const progressBar = document.getElementById('girls-progress-bar');
//   const progressText = document.getElementById('girls-progress-text');
//   const resultBox = document.getElementById('girls-upload-result');
//   const template = document.getElementById('girls-photo-card-template');

//   if (!pickBtn || !fileInput || !cardsGrid || !uploadAllBtn || !template) {
//     console.error('[admin-girls-upload] Не знайдено необхідні елементи DOM.');
//     return;
//   }

//   // ====== СТАН ======
//   let cardSeq = 0; // лічильник для унікальних id інпутів
//   let skuCounter = 0; // лічильник для генерації артиклів
//   const STATE = new Map(); // key: cardId -> { file, objectURL, fields... }

//   // ====== УТИЛІТИ ======
//   const pad = (n) => String(n).padStart(2, '0');

//  const genSKU = () => {
//   const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
//   let sku = "";
//   for (let i = 0; i < 5; i++) {
//     sku += alphabet[Math.floor(Math.random() * alphabet.length)];
//   }
//      return `Rk-${sku}`;
// };

//   const setUploadButtonState = () => {
//     // Умови: є хоча б одна картка і всі обов’язкові поля валідні
//     const cards = [...cardsGrid.querySelectorAll('.photo-card')];
//     if (!cards.length) {
//       uploadAllBtn.disabled = true;
//       return;
//     }
//     const allValid = cards.every((card) => validateCard(card));
//     uploadAllBtn.disabled = !allValid;
//   };

//   const validateCard = (cardEl) => {
//     const price = cardEl.querySelector('input[name="price"]');
//     const type = cardEl.querySelector('input[name="type"]');
//     const size = cardEl.querySelector('input[name="size"]');
//     const sku = cardEl.querySelector('input[name="sku"]');

//     let ok = true;

//     // Ціна
//     if (!price.value || Number(price.value) < 0) {
//       price.classList.add('input-error');
//       ok = false;
//     } else {
//       price.classList.remove('input-error');
//     }
//     // Тип
//     if (!type.value.trim()) {
//       type.classList.add('input-error');
//       ok = false;
//     } else {
//       type.classList.remove('input-error');
//     }
//     // Розмір
//     if (!size.value.trim()) {
//       size.classList.add('input-error');
//       ok = false;
//     } else {
//       size.classList.remove('input-error');
//     }
//     // SKU
//     if (!sku.value.trim()) {
//       ok = false;
//     }

//     return ok;
//   };

//   const readCardData = (cardEl) => {
//     const cardId = cardEl.dataset.cardId;
//     const sku = cardEl.querySelector('input[name="sku"]').value.trim();
//     const price = cardEl.querySelector('input[name="price"]').value.trim();
//     const salePrice = cardEl
//       .querySelector('input[name="salePrice"]')
//       .value.trim();
//     const type = cardEl.querySelector('input[name="type"]').value.trim();
//     const size = cardEl.querySelector('input[name="size"]').value.trim();

//     const st = STATE.get(cardId);
//     return {
//       file: st?.file || null,
//       sku,
//       price: price ? Number(price) : null,
//       salePrice: salePrice ? Number(salePrice) : null, // опціонально
//       type,
//       size,
//     };
//   };

//   const revokeObjectURLSafe = (url) => {
//     try {
//       URL.revokeObjectURL(url);
//     } catch (e) {
//       // ignore
//     }
//   };

//   // ====== РОБОТА З КАРТКАМИ ======
//   const createCardFromFile = (file) => {
//     const clone = template.content.cloneNode(true);
//     const article = clone.querySelector('.photo-card');

//     // унікальний id для інпутів у картці
//     cardSeq += 1;
//     const cardId = `card_${cardSeq}`;
//     article.dataset.cardId = cardId;

//     // SKU
//     const sku = genSKU();
//     article.dataset.sku = sku;

//     // Підставляємо у всі id з плейсхолдером __ID__
// article.querySelectorAll('[id*="__ID__"]').forEach((el) => {
//   el.id = el.id.replace('__ID__', cardSeq);
// });

// // ТАКОЖ оновити всі label[for*="__ID__"]
// article.querySelectorAll('label[for*="__ID__"]').forEach((lab) => {
//   lab.htmlFor = lab.htmlFor.replace('__ID__', cardSeq);
// });
//     // Встановлюємо значення SKU
//     const skuInput = article.querySelector('input[name="sku"]');
//     skuInput.value = sku;

//     // Прев’ю
//     const img = article.querySelector('.photo-thumb');
//     const objectURL = URL.createObjectURL(file);
//     img.src = objectURL;
//     img.alt = file.name;

//     // Зберігаємо в стан
//     STATE.set(cardId, { file, objectURL });

//     // Видалення картки
//     const removeBtn = article.querySelector('.btn-remove');
//     removeBtn.addEventListener('click', () => {
//       const st = STATE.get(cardId);
//       if (st?.objectURL) revokeObjectURLSafe(st.objectURL);
//       STATE.delete(cardId);
//       article.remove();
//       setUploadButtonState();
//     });

//     // Слухачі валідації
//     article
//       .querySelectorAll('input')
//       .forEach((inp) => inp.addEventListener('input', setUploadButtonState));

//     // Додаємо у DOM
//     cardsGrid.appendChild(article);

//     // Оновити стан кнопки
//     setUploadButtonState();
//   };

//   // ====== ЗАВАНТАЖЕННЯ НА СЕРВЕР ======
//   // TODO: підстав свій бекенд-ендпойнт:
//   const UPLOAD_URL = '/api/admin/girls/upload'; // змінити під свій роут

//   const uploadWithProgress = ({ file, meta, onProgress }) =>
//     new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.open('POST', UPLOAD_URL);

//       // При потребі: токен/заголовки
//       // xhr.setRequestHeader('Authorization', 'Bearer ...');

//       xhr.upload.addEventListener('progress', (e) => {
//         if (e.lengthComputable && typeof onProgress === 'function') {
//           const pct = Math.round((e.loaded / e.total) * 100);
//           onProgress(pct);
//         }
//       });

//       xhr.onreadystatechange = function () {
//         if (xhr.readyState === 4) {
//           if (xhr.status >= 200 && xhr.status < 300) {
//             resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
//           } else {
//             reject(new Error(`HTTP ${xhr.status}`));
//           }
//         }
//       };

//       const form = new FormData();
//       form.append('file', file, file.name);
//       form.append('sku', meta.sku);
//       form.append('price', String(meta.price ?? ''));
//       if (meta.salePrice != null) form.append('salePrice', String(meta.salePrice));
//       form.append('type', meta.type);
//       form.append('size', meta.size);
//       form.append('category', 'girls'); // щоб на бекенді знати секцію

//       xhr.send(form);
//     });

//   const uploadAll = async () => {
//     const cards = [...cardsGrid.querySelectorAll('.photo-card')];
//     if (!cards.length) return;

//     // Підготовка UI
//     resultBox.hidden = true;
//     progressWrap.hidden = false;
//     progressBar.value = 0;
//     progressText.textContent = '0%';
//     uploadAllBtn.disabled = true;
//     pickBtn.disabled = true;
//     cardsGrid.setAttribute('aria-busy', 'true');

//     // Сукупний прогрес по всім файлам
//     const total = cards.length;
//     let completed = 0;

//     const updateGlobalProgress = (pctOfCurrent) => {
//       // Вага кожного файлу однакова: completed + частка поточного
//       const overall = Math.min(
//         100,
//         Math.round(((completed + pctOfCurrent / 100) / total) * 100)
//       );
//       progressBar.value = overall;
//       progressText.textContent = `${overall}%`;
//     };

//     try {
//       for (let i = 0; i < cards.length; i++) {
//         const card = cards[i];
//         // валідність перед самим аплоадом
//         if (!validateCard(card)) {
//           throw new Error('Заповни всі обов’язкові поля перед завантаженням.');
//         }
//         const data = readCardData(card);
//         if (!data.file) {
//           throw new Error('Відсутній файл у картці.');
//         }

//         await uploadWithProgress({
//           file: data.file,
//           meta: {
//             sku: data.sku,
//             price: data.price,
//             salePrice: data.salePrice,
//             type: data.type,
//             size: data.size,
//           },
//           onProgress: (p) => updateGlobalProgress(p),
//         });

//         completed += 1;
//         updateGlobalProgress(100);

//         // Після успішного аплоаду можна забрати картку (або залишити — на твій смак)
//         const cardId = card.dataset.cardId;
//         const st = STATE.get(cardId);
//         if (st?.objectURL) revokeObjectURLSafe(st.objectURL);
//         STATE.delete(cardId);
//         card.remove();
//       }

//       // Успіх
//       resultBox.hidden = false;
//       resultBox.querySelector('.success-message').textContent =
//         'Успішно завантажено!';
//     } catch (err) {
//       console.error(err);
//       alert(`Помилка завантаження: ${err.message || err}`);
//     } finally {
//       // Відновлення UI
//       cardsGrid.setAttribute('aria-busy', 'false');
//       pickBtn.disabled = false;
//       setUploadButtonState();
//       // Прогрес залишаємо видимим; якщо хочеш — ховай:
//       // progressWrap.hidden = true;
//     }
//   };

//   // ====== ПОДІЇ ======
//   // 1) Кнопка → відкриває файловий діалог
//   pickBtn.addEventListener('click', () => fileInput.click());

//   // 2) Вибір файлів
//   fileInput.addEventListener('change', () => {
//     const files = Array.from(fileInput.files || []);
//     if (!files.length) return;

//     // Додаємо кожен файл як картку
//     files.forEach((file) => {
//       // Пропускаємо не-зображення на всяк випадок
//       if (!file.type.startsWith('image/')) return;
//       createCardFromFile(file);
//     });

//     // Очистити інпут, щоб повторний вибір тих самих файлів теж тригерив change
//     fileInput.value = '';
//   });

//   // 3) Завантажити всі
//   uploadAllBtn.addEventListener('click', uploadAll);

//   // Початкова ініціалізація
//   setUploadButtonState();
// })();
// /js/admin.js
// ЄДИНИЙ СКРИПТ ДЛЯ СЕКЦІЙ: girls та boys

(function () {
  // ===== Спільні утиліти =====
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
    // очікувані id елементів у DOM (тільки міняється префікс)
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
      const cardId = `${prefix}_card_${cardSeq}`;
      article.dataset.cardId = cardId;

      const sku = genSKU();
      article.dataset.sku = sku;

      // заміна плейсхолдерів __ID__ у всіх id та їх label[for]
      article.querySelectorAll('[id*="__ID__"]').forEach((el) => {
        el.id = el.id.replace('__ID__', cardSeq);
      });
      article.querySelectorAll('label[for*="__ID__"]').forEach((lab) => {
        lab.htmlFor = lab.htmlFor.replace('__ID__', cardSeq);
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
  initUploadSection({ prefix: 'girls', uploadUrl: '/api/admin/girls/upload', category: 'girls' });
  initUploadSection({ prefix: 'boys',  uploadUrl: '/api/admin/boys/upload',  category: 'boys'  });
})();
