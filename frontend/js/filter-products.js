document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("filters-form");
  const applyBtn = document.getElementById("apply-filters");
  const resetBtn = document.getElementById("reset-filters");
  const grid = document.getElementById("products-grid");

  if (!form || !grid) return;

  // застосувати фільтри
  applyBtn.addEventListener("click", () => {
    const formData = new FormData(form);

    // збираємо всі значення
    const selectedTypes = formData.getAll("type").map(t => t.toLowerCase());
    const selectedSize = formData.get("size_cm"); // одне значення
    const extras = formData.getAll("extra"); // ["sale","new"]

    const cards = grid.querySelectorAll(".product-card");

    cards.forEach(card => {
      let visible = true;

      // === Тип одягу ===
      if (selectedTypes.length > 0) {
        const typeText = card.querySelector(".product-title")?.textContent.trim().toLowerCase() || "";
        visible = selectedTypes.some(t => typeText === t || typeText.includes(t));
      }

      // === Розмір ===
      if (visible && selectedSize) {
        const sizeText = card.querySelector(".product-size")?.textContent.replace(/[^\d-]/g, "");
        // приклад: "50-56" → ["50","56"]
        if (selectedSize.includes("-")) {
          const [min, max] = selectedSize.split("-").map(Number);
          const sizeNum = parseInt(sizeText, 10);
          visible = sizeNum >= min && sizeNum <= max;
        } else {
          const sizeNum = parseInt(sizeText, 10);
          const selectedNum = parseInt(selectedSize, 10);
          visible = sizeNum === selectedNum;
        }
      }

      // === Знижки ===
      if (visible && extras.includes("sale")) {
        visible = !!card.querySelector(".sale-price");
      }

      // === Новинки ===
      if (visible && extras.includes("new")) {
        visible = !!card.querySelector(".new-badge");
      }

      card.style.display = visible ? "" : "none";
    });
  });

  // скинути фільтри
  resetBtn.addEventListener("click", () => {
    const cards = grid.querySelectorAll(".product-card");
    cards.forEach(card => (card.style.display = ""));
  });
});
