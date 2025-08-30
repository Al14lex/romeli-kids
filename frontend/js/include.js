async function loadComponent(id, file) {
    const el = document.getElementById(id);
    if (el) {
      const response = await fetch(file);
      const html = await response.text();
      el.innerHTML = html;
    }
  }
  
  // Після завантаження сторінки
  window.addEventListener("DOMContentLoaded", () => {
    loadComponent("site-header", "/partials/header.html");
    loadComponent("site-footer", "/partials/footer.html");
  });
  