
// document.addEventListener("DOMContentLoaded", async () => {
//   const grid = document.getElementById("products-grid");
//   if (!grid) return;

//   const gender = grid.dataset.gender === 'girl' ? 'girls' : 'boys';
//   const API = `/api/${gender}`;

//   try {
//     const res = await fetch(API);
//     const products = await res.json();

//     grid.innerHTML = ""; // очищаємо попередній контент (зразки)

//     const now = new Date();

//     products.forEach((item) => {
//       const createdAt = new Date(item.createdAt);
//       const isNew = (now - createdAt) < 24 * 60 * 60 * 1000; // 24h

//       const badgeNew = isNew
//         ? `<span class="new-badge new-badge-${gender}">NEW</span>`
//         : "";

//       const card = document.createElement("article");
//       card.className = "product-card";
//       card.dataset.sku = item.sku;

//       card.innerHTML = `
//         ${badgeNew}
//         <div class="product-image">
//           <img class="lazy" loading="lazy" data-src="${item.imageUrl}" alt="${item.type}" />
//           <span class="sku-badge">${item.sku}</span>
//         </div>
//         <div class="product-meta">
//           <p class="product-price">Cena: ${item.salePrice || item.price} zł</p>
//           <h3 class="product-title">${capitalize(item.type)}</h3>
//           <p class="product-size">Rozmiar: ${item.size}</p>
//         </div>
//       `;

//       grid.appendChild(card);
//     });
//   } catch (err) {
//     console.error("Błąd ładowania produktów:", err);
//     grid.innerHTML = "<p class='error'>Nie udało się załadować produktów.</p>";
//   }
// });

// function capitalize(str) {
//   return str.charAt(0).toUpperCase() + str.slice(1);
// }
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("products-grid");
  if (!grid) return;

  const gender = grid.dataset.gender === 'girl' ? 'girls' : 'boys';
  const API = `/api/${gender}`;

  try {
    const res = await fetch(API);
    const products = await res.json();

    grid.innerHTML = ""; // очищаємо попередній контент

    const now = new Date();

    products.forEach((item) => {
      const createdAt = new Date(item.createdAt);
      const isNew = (now - createdAt) < 24 * 60 * 60 * 1000;

      const badgeNew = isNew
        ? `<span class="new-badge new-badge-${gender}">NEW</span>`
        : "";

      const card = document.createElement("article");
      card.className = "product-card";
        card.dataset.sku = item.sku;
        const priceHtml = item.salePrice
  ? `<p class="product-price">
       <span class="old-price">${item.price} zł</span>
       <span class="sale-price">${item.salePrice} zł</span>
     </p>`
  : `<p class="product-price">Cena: ${item.price} zł</p>`;


     card.innerHTML = `
  ${badgeNew}
  <div class="product-image">
    <img class="lazy" loading="lazy" data-src="${item.imageUrl}" alt="${item.type}" />
    <span class="sku-badge">${item.sku}</span>
  </div>
  <div class="product-meta">
    ${priceHtml}
    <h3 class="product-title">${capitalize(item.type)}</h3>
    <p class="product-size">Rozmiar: ${item.size}</p>
  </div>
`;


      grid.appendChild(card);
    });

    // 👉 Запускаємо lazy-loading після рендеру товарів
    lazyLoadImages();

  } catch (err) {
    console.error("Błąd ładowania produktów:", err);
    grid.innerHTML = "<p class='error'>Nie udało się załadować produktów.</p>";
  }
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 🔽 Функція lazy-load
function lazyLoadImages() {
  const imgs = document.querySelectorAll('img.lazy[data-src]');

  if (!('IntersectionObserver' in window)) {
    imgs.forEach(img => {
      img.src = img.dataset.src;
      img.classList.add('is-loaded');
    });
    return;
  }

  const onEnter = (entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
      obs.unobserve(img);
    });
  };

  const observer = new IntersectionObserver(onEnter, { rootMargin: '200px 0px' });
  imgs.forEach(img => observer.observe(img));
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-image');
  const modalSku = document.getElementById('modal-sku');
  const closeBtn = document.querySelector('.modal-close');

  // делегуємо обробку кліків по фото
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('.product-image img');
    if (target) {
      const sku = target.closest('.product-card').querySelector('.sku-badge')?.textContent.trim() || '';
      modalImg.src = target.src;
      modalSku.textContent = sku;
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden'; // заблокуємо прокрутку
    }
  });

  // закриття модалки
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    modalImg.src = '';
    document.body.style.overflow = '';
  });

  // клік поза контентом (на фоні)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      modalImg.src = '';
      document.body.style.overflow = '';
    }
  });
});
