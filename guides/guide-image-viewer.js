(() => {
  let trigger = null;
  const dialog = document.createElement("dialog");
  dialog.className = "guide-image-dialog";
  dialog.setAttribute("aria-labelledby", "guide-image-dialog-title");
  dialog.innerHTML = `<div class="guide-image-dialog-bar"><strong id="guide-image-dialog-title">原尺寸圖解</strong><button type="button" aria-label="關閉圖解"><span aria-hidden="true">×</span></button></div><div class="guide-image-dialog-scroll"><img alt=""></div>`;
  document.body.append(dialog);
  const image = dialog.querySelector("img");
  const title = dialog.querySelector("strong");
  const close = dialog.querySelector("button");

  const closeDialog = () => {
    document.body.classList.remove("guide-image-dialog-open");
    if (dialog.open) dialog.close();
  };

  close.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("guide-image-dialog-open");
    trigger?.focus();
    trigger = null;
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".guide-image-zoom");
    if (!button) return;
    const source = button.closest(".endpoint-stage")?.querySelector("img");
    if (!source) return;
    trigger = button;
    const subject = button.getAttribute("aria-label")
      ?.replace(/^放大/, "")
      .replace(/圖解$/, "")
      .trim();
    title.textContent = `${subject || source.alt.split(/[：:]/)[0] || "科學"}原尺寸圖解`;
    image.src = source.dataset.zoomSrc || source.src;
    image.alt = source.alt;
    document.body.classList.add("guide-image-dialog-open");
    dialog.showModal();
    close.focus();
  });
})();
