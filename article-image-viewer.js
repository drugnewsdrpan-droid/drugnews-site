(() => {
  const buttons = [...document.querySelectorAll(".article-image-zoom")];
  if (!buttons.length || typeof HTMLDialogElement === "undefined") return;

  let trigger = null;
  const dialog = document.createElement("dialog");
  dialog.className = "article-image-dialog";
  dialog.setAttribute("aria-labelledby", "article-image-dialog-title");
  dialog.innerHTML = `
    <div class="article-image-dialog-bar">
      <strong id="article-image-dialog-title"></strong>
      <button type="button" aria-label="Close figure"><span aria-hidden="true">×</span></button>
    </div>
    <div class="article-image-dialog-scroll" tabindex="0"><img alt=""></div>
  `;
  document.body.append(dialog);

  const title = dialog.querySelector("strong");
  const closeButton = dialog.querySelector("button");
  const expandedImage = dialog.querySelector("img");

  const closeDialog = () => {
    document.body.classList.remove("article-image-dialog-open");
    if (dialog.open) dialog.close();
  };

  closeButton.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("article-image-dialog-open");
    trigger?.focus();
    trigger = null;
  });

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const source = button.closest("figure")?.querySelector("img");
      if (!source) return;
      trigger = button;
      const english = document.documentElement.lang.startsWith("en");
      title.textContent = english ? "Full-size article figure" : "文章圖解原尺寸閱讀";
      closeButton.setAttribute("aria-label", english ? "Close figure" : "關閉圖解");
      expandedImage.src = source.currentSrc || source.src;
      expandedImage.alt = source.alt;
      document.body.classList.add("article-image-dialog-open");
      dialog.showModal();
      closeButton.focus();
    });
  });
})();
