(() => {
  document.querySelectorAll(".site-header").forEach((header) => {
    const button = header.querySelector(".nav-menu-button");
    const nav = header.querySelector(".nav-links");
    const legacyToggle = header.querySelector(".nav-toggle");
    if (!button || !nav) return;
    nav.id = "site-nav-links";
    button.type = "button";
    button.setAttribute("aria-controls", nav.id);
    const setOpen = (open, returnFocus = false) => {
      nav.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
      if (legacyToggle) legacyToggle.checked = open;
      if (returnFocus) button.focus();
    };
    setOpen(false);
    button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
    header.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target === button) {
        event.preventDefault();
        event.stopImmediatePropagation();
        button.click();
        return;
      }
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        event.preventDefault();
        setOpen(false, true);
      }
    }, true);
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
  });
})();
