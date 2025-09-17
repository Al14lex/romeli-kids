/* Лейзі-лоадінг через IntersectionObserver + плавне зняття блюру */
(() => {
    const imgs = document.querySelectorAll('img.lazy[data-src]');
    if (!('IntersectionObserver' in window)) {
      // фолбек: одразу підставити src
      imgs.forEach(img => { img.src = img.dataset.src; img.classList.add('is-loaded'); });
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
  })();
  