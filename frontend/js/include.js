document.addEventListener('DOMContentLoaded', () => {
  const inject = async (selector, url) => {
    const target = document.querySelector(selector);
    if (!target) return;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} → ${url}`);
      target.innerHTML = await res.text();
    } catch (e) {
      console.warn('Не вдалось завантажити partial:', e.message);
      // ВАЖЛИВО: нічого не вставляємо, щоб не бачити текст 404
    }
  };

  inject('#site-header', '/partials/header.html');
  inject('#site-footer', '/partials/footer.html');
});
