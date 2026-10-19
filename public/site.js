// Progressive enhancement only: native forms and navigation work without JS.
// Avoid duplicate inquiries/orders on slow connections; restore on back navigation.
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (
    !(form instanceof HTMLFormElement) ||
    form.method.toLowerCase() !== "post"
  )
    return;
  if (form.dataset.submitting === "true") {
    event.preventDefault();
    return;
  }
  form.dataset.submitting = "true";
  form.setAttribute("aria-busy", "true");
  for (const button of form.querySelectorAll(
    'button[type="submit"], button:not([type])',
  ))
    button.disabled = true;
});
window.addEventListener("pageshow", () => {
  for (const form of document.querySelectorAll(
    'form[data-submitting="true"]',
  )) {
    delete form.dataset.submitting;
    form.removeAttribute("aria-busy");
    for (const button of form.querySelectorAll(
      'button[type="submit"], button:not([type])',
    ))
      button.disabled = false;
  }
});
