(function () {
    // Коли лінки вже в DOM — ставимо active і відписуємось
    function setActiveOnceReady() {
      const links = document.querySelectorAll(".header-nav-link");
      if (!links.length) return false;
  
      // визначаємо поточну сторінку
      let current = window.location.pathname.split("/").pop();
      if (current === "" || current === "/") current = "index.html";
  
      links.forEach((link) => {
        const href = (link.getAttribute("href") || "").split("/").pop();
  
        // не підсвічуємо адмінку/лого
        const isAdmin = href === "admin.html" || link.classList.contains("logo");
        if (!isAdmin && href === current) {
          link.classList.add("active");
        }
      });
  
      return true;
    }
  
    // 1) Спроба одразу (раптом include вже відпрацював)
    if (setActiveOnceReady()) return;
  
    // 2) Чекаємо, поки include.js вставить хедер
    const headerHost = document.getElementById("site-header") || document.body;
    const mo = new MutationObserver(() => {
      if (setActiveOnceReady()) mo.disconnect();
    });
    mo.observe(headerHost, { childList: true, subtree: true });
  
    // 3) Підстрахуємось на DOMContentLoaded
    document.addEventListener("DOMContentLoaded", setActiveOnceReady);
  })();
  