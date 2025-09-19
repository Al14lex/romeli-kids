// /js/layout.js (або де ти це робиш)
async function inject(elId, url) {
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    el.innerHTML = await res.text();
  } catch (e) {
    console.error('Не вдалось завантажити', url, e);
    // ВАЖЛИВО: не вставляємо текст 404 у DOM
  }
}

inject('site-header', '/partials/header.html');
inject('site-footer', '/partials/footer.html');
