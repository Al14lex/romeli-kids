document.addEventListener("DOMContentLoaded", () => {
  console.log("check-admin.js завантажено");

  const ADMIN_KEY   = "adminAccess";
  const ADMIN_TOKEN = "skorpion397";
  const MAX_ATTEMPTS = 3;

  document.addEventListener("click", (e) => {
    const logo = e.target.closest(".logo-click");
    if (!logo) return; 

    e.preventDefault();

    const adminUrl = logo.dataset.adminUrl || "admin.html"; 
    const saved = localStorage.getItem(ADMIN_KEY);

    if (saved === ADMIN_TOKEN) {
      window.location.href = adminUrl;
      return;
    }

    let attempts = 0;
    while (attempts < MAX_ATTEMPTS) {
      const input = prompt("Введіть пароль адміністратора:");
      if (input === null) return; // відміна

      if (input === ADMIN_TOKEN) {
        localStorage.setItem(ADMIN_KEY, ADMIN_TOKEN);
        window.location.href = adminUrl;
        return;
      } else {
        attempts++;
        alert(`Неправильний пароль. Спроба ${attempts} з ${MAX_ATTЕМPTS}.`);
      }
    }

    alert("Вичерпано кількість спроб. Доступ заборонено.");
  });

  // Опційно: виклич з консолі або повісь на кнопку в адмінці
  window.logoutAdmin = function () {
    localStorage.removeItem(ADMIN_KEY);
    alert("Ви вийшли з адмінки (локально).");
  };
});
