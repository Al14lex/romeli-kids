const galleryByCardKey = new Map();
const RENDER_API_BASE = 'https://romeli-kids.onrender.com/api';

function resolveApiBase() {
  const host = window.location.hostname;
  if (host.endsWith('vercel.app')) {
    return RENDER_API_BASE;
  }
  return '/api';
}

const API_BASE = window.__API_BASE__ || resolveApiBase();
const skuCopyTimers = new WeakMap();

function normalizeImages(product) {
  if (Array.isArray(product?.images) && product.images.length) {
    return product.images.filter(Boolean);
  }
  if (product?.imageUrl) return [product.imageUrl];
  return [];
}

function normalizeCoverIndex(rawCoverIndex, totalImages) {
  const index = Number.parseInt(rawCoverIndex, 10);
  if (!Number.isInteger(index)) return 0;
  if (index < 0 || index >= totalImages) return 0;
  return index;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function copyTextToClipboard(text) {
  if (!text) return false;

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback handled below.
    }
  }

  const fallbackArea = document.createElement('textarea');
  fallbackArea.value = text;
  fallbackArea.setAttribute('readonly', '');
  fallbackArea.style.position = 'fixed';
  fallbackArea.style.top = '-9999px';
  fallbackArea.style.left = '-9999px';
  fallbackArea.style.opacity = '0';
  fallbackArea.style.pointerEvents = 'none';
  document.body.appendChild(fallbackArea);
  fallbackArea.focus();
  fallbackArea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(fallbackArea);
  return copied;
}

function setSkuBadgeFeedback(badge, copied) {
  const originalText = badge.dataset.originalText || badge.dataset.sku || badge.textContent.trim();
  const previousTimer = skuCopyTimers.get(badge);
  if (previousTimer) clearTimeout(previousTimer);

  badge.classList.remove('is-copied', 'is-copy-error');
  badge.classList.add(copied ? 'is-copied' : 'is-copy-error');
  badge.textContent = copied ? 'skopiowano' : 'Błąd kopiowania';

  const timer = setTimeout(() => {
    badge.classList.remove('is-copied', 'is-copy-error');
    badge.textContent = originalText;
  }, 1200);
  skuCopyTimers.set(badge, timer);
}

async function handleSkuCopyInteraction(event, badge) {
  event.preventDefault();
  event.stopPropagation();

  const sku = badge.dataset.sku || badge.textContent.trim();
  const copied = await copyTextToClipboard(sku);
  setSkuBadgeFeedback(badge, copied);
}

// Lazy-load utility.
function lazyLoadImages() {
  const imgs = document.querySelectorAll('img.lazy[data-src]');

  if (!('IntersectionObserver' in window)) {
    imgs.forEach((img) => {
      img.src = img.dataset.src;
      img.classList.add('is-loaded');
    });
    return;
  }

  const onEnter = (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
      observer.unobserve(img);
    });
  };

  const observer = new IntersectionObserver(onEnter, {
    rootMargin: '300px 0px',
    threshold: 0.1,
  });

  imgs.forEach((img) => observer.observe(img));
}

async function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const gender = grid.dataset.gender === 'girl' ? 'girls' : 'boys';
  const API = `${API_BASE}/${gender}`;

  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const products = await res.json();
    grid.innerHTML = '';

    const now = new Date();

    products.forEach((item, idx) => {
      const images = normalizeImages(item);
      const coverIndex = normalizeCoverIndex(item?.coverIndex, images.length);
      const coverImage = images[coverIndex] || images[0] || '';

      const createdAt = new Date(item.createdAt);
      const isNew = (now - createdAt) < 24 * 60 * 60 * 1000;
      const badgeNew = isNew
        ? `<span class="new-badge new-badge-${gender}">NEW</span>`
        : '';

      const hasSalePrice = item.salePrice !== null && item.salePrice !== undefined && item.salePrice !== '';
      const priceHtml = hasSalePrice
        ? `<p class="product-price"><span class="old-price">${item.price} zl</span><span class="sale-price">${item.salePrice} zl</span></p>`
        : `<p class="product-price">Cena: ${item.price} zl</p>`;

      const card = document.createElement('article');
      card.className = 'product-card';
      card.dataset.sku = item.sku;

      const cardKey = item._id || `${item.sku || 'sku'}-${idx}`;
      card.dataset.galleryKey = cardKey;
      galleryByCardKey.set(cardKey, {
        images: images.length ? images : (item.imageUrl ? [item.imageUrl] : []),
        coverIndex,
        sku: item.sku || '',
      });

      card.innerHTML = `
        ${badgeNew}
        <div class="product-image">
          <img class="lazy" data-src="${coverImage}" alt="${item.type || ''}" />
          <span class="sku-badge">${item.sku || ''}</span>
        </div>
        <div class="product-meta">
          ${priceHtml}
          <h3 class="product-title">${capitalize(item.type || '')}</h3>
          <p class="product-size">Rozmiar: ${item.size || ''}</p>
        </div>
      `;

      const skuBadge = card.querySelector('.sku-badge');
      if (skuBadge) {
        const skuText = item.sku || '';
        skuBadge.dataset.sku = skuText;
        skuBadge.dataset.originalText = skuText;
        skuBadge.setAttribute('role', 'button');
        skuBadge.setAttribute('tabindex', '0');
        skuBadge.setAttribute('aria-label', `Copy SKU ${skuText}`);
      }

      grid.appendChild(card);
    });

    lazyLoadImages();
  } catch (err) {
    console.error('Product loading error:', err);
    grid.innerHTML = "<p class='error'>Nie udalo sie zaladowac produktow.</p>";
  }
}

function initModalGallery() {
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-image');
  const modalSku = document.getElementById('modal-sku');
  const closeBtn = document.querySelector('.modal-close');

  if (!modal || !modalImg || !modalSku || !closeBtn) return;

  const modalContent = modal.querySelector('.modal-content');
  if (!modalContent) return;

  modalContent.style.position = 'relative';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'modal-nav modal-nav-prev';
  prevBtn.textContent = '<';
  prevBtn.setAttribute('aria-label', 'Previous image');

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'modal-nav modal-nav-next';
  nextBtn.textContent = '>';
  nextBtn.setAttribute('aria-label', 'Next image');

  const counter = document.createElement('p');
  counter.className = 'modal-counter';

  Object.assign(prevBtn.style, {
    position: 'absolute',
    left: '5%',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: '2',
    border: '0',
    borderRadius: '999px',
    width: '36px',
    margin: '0',
    height: '36px',
    cursor: 'pointer',
    background: 'rgb(226 221 221 / 60%)',
    color: 'rgb(25 24 24)',
    fontSize: '18px',
    lineHeight: '1',
  });

  Object.assign(nextBtn.style, {
    position: 'absolute',
    right: '5%',
    top: '50%',
    margin: '0',
    transform: 'translateY(-50%)',
    zIndex: '2',
    border: '0',
    borderRadius: '999px',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    background: 'rgb(226 221 221 / 60%)',
    color: 'rgb(25 24 24)',
    fontSize: '18px',
    lineHeight: '1',
  });

  Object.assign(counter.style, {
    margin: '8px 0 0',
    fontSize: '14px',
    textAlign: 'center',
  });

  modalContent.appendChild(prevBtn);
  modalContent.appendChild(nextBtn);
  modalContent.appendChild(counter);

  const state = {
    images: [],
    index: 0,
    sku: '',
  };

  const renderModalState = () => {
    const hasImages = state.images.length > 0;
    const current = hasImages ? state.images[state.index] : '';

    modalImg.src = current || '';
    modalSku.textContent = state.sku || '';
    counter.textContent = hasImages ? `${state.index + 1}/${state.images.length}` : '';

    const showNav = state.images.length > 1;
    prevBtn.hidden = !showNav;
    nextBtn.hidden = !showNav;
  };

  const openGallery = ({ images, startIndex, sku }) => {
    if (!images.length) return;

    state.images = images;
    state.index = normalizeCoverIndex(startIndex, images.length);
    state.sku = sku || '';

    renderModalState();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  const closeGallery = () => {
    modal.classList.add('hidden');
    modalImg.src = '';
    counter.textContent = '';
    document.body.style.overflow = '';
  };

  const showPrev = () => {
    if (state.images.length <= 1) return;
    state.index = (state.index - 1 + state.images.length) % state.images.length;
    renderModalState();
  };

  const showNext = () => {
    if (state.images.length <= 1) return;
    state.index = (state.index + 1) % state.images.length;
    renderModalState();
  };

  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('.product-image img');
    if (!target) return;

    const card = target.closest('.product-card');
    const cardKey = card?.dataset.galleryKey;
    const gallery = cardKey ? galleryByCardKey.get(cardKey) : null;

    if (gallery?.images?.length) {
      openGallery({
        images: gallery.images,
        startIndex: gallery.coverIndex,
        sku: gallery.sku || card?.dataset.sku || '',
      });
      return;
    }

    const fallbackSrc = target.getAttribute('src') || target.dataset.src || '';
    const fallbackImages = fallbackSrc ? [fallbackSrc] : [];
    openGallery({
      images: fallbackImages,
      startIndex: 0,
      sku: card?.dataset.sku || '',
    });
  });

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showPrev();
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showNext();
  });

  closeBtn.addEventListener('click', closeGallery);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeGallery();
  });

  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'Escape') closeGallery();
  });

  let touchStartX = null;
  let touchStartY = null;

  modalImg.addEventListener('touchstart', (e) => {
    if (!e.changedTouches?.length) return;
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  modalImg.addEventListener('touchend', (e) => {
    if (touchStartX === null || touchStartY === null || !e.changedTouches?.length) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    touchStartX = null;
    touchStartY = null;

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX < 0) showNext();
    else showPrev();
  }, { passive: true });
}

function initSkuCopy() {
  document.body.addEventListener('click', async (event) => {
    const badge = event.target.closest('.sku-badge');
    if (!badge) return;
    await handleSkuCopyInteraction(event, badge);
  });

  document.body.addEventListener('keydown', async (event) => {
    const badge = event.target.closest('.sku-badge');
    if (!badge) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    await handleSkuCopyInteraction(event, badge);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initSkuCopy();
  initModalGallery();
  await renderProducts();
});
