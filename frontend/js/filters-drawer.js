(() => {
    const drawer = document.getElementById('filters-drawer');
    const handle = document.getElementById('filters-handle');
    const closeBtn = document.getElementById('filters-close');
    const overlay = document.getElementById('filters-overlay');
    const applyBtn = document.getElementById('apply-filters');
  
    const open = () => {
      drawer.classList.add('is-open');
      document.documentElement.classList.add('drawer-open');
      drawer.setAttribute('aria-hidden', 'false');
      handle.setAttribute('aria-expanded', 'true');
      overlay.hidden = false;
    };
    const close = () => {
      drawer.classList.remove('is-open');
      document.documentElement.classList.remove('drawer-open');
      drawer.setAttribute('aria-hidden', 'true');
      handle.setAttribute('aria-expanded', 'false');
      overlay.hidden = true;
    };
    const toggle = () => (drawer.classList.contains('is-open') ? close() : open());
  
    handle.addEventListener('click', toggle);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
  
    // закривати на Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });
  
    // після застосування фільтрів — закриваємо
    applyBtn?.addEventListener('click', () => {
      // тут виклич свою функцію застосування фільтрів, якщо є
      // applyFilters();
      close();
    });
  })();
  