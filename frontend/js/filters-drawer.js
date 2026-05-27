(() => {
  const drawer = document.getElementById("filters-drawer");
  const handle = document.getElementById("filters-handle");
  const closeBtn = document.getElementById("filters-close");
  const overlay = document.getElementById("filters-overlay");
  const applyBtn = document.getElementById("apply-filters");

  if (!drawer || !handle || !closeBtn || !overlay) return;

  const supportsInert = "inert" in drawer;

  const setHiddenState = (isHidden) => {
    drawer.setAttribute("aria-hidden", isHidden ? "true" : "false");
    if (supportsInert) {
      drawer.inert = isHidden;
    }
  };

  const moveFocusOutOfDrawer = () => {
    const active = document.activeElement;
    if (active && drawer.contains(active)) {
      handle.focus({ preventScroll: true });
    }
  };

  const open = () => {
    drawer.classList.add("is-open");
    document.documentElement.classList.add("drawer-open");
    setHiddenState(false);
    handle.setAttribute("aria-expanded", "true");
    overlay.hidden = false;
  };

  const close = () => {
    moveFocusOutOfDrawer();
    drawer.classList.remove("is-open");
    document.documentElement.classList.remove("drawer-open");
    setHiddenState(true);
    handle.setAttribute("aria-expanded", "false");
    overlay.hidden = true;
  };

  const toggle = () => (drawer.classList.contains("is-open") ? close() : open());

  setHiddenState(!drawer.classList.contains("is-open"));

  handle.addEventListener("click", toggle);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      close();
    }
  });

  applyBtn?.addEventListener("click", close);
})();
