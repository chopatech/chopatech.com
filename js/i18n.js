/* =========================================================
   Mihayo's Safaris — i18n Engine
   Applies TRANSLATIONS (see translations.js) to any element
   carrying data-i18n="key" (text) or data-i18n-ph="key" (placeholder)
   NOTE: language choice is kept in memory for this page view only
   (no browser storage is used), so it resets to English on reload —
   swap the setLang() call below for a cookie/session value once
   this is wired to a backend.
   ========================================================= */

let currentLang = DEFAULT_LANG;

function applyTranslations(lang) {
  if (!TRANSLATIONS[lang]) lang = DEFAULT_LANG;
  currentLang = lang;
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", "ltr");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const dict = TRANSLATIONS[lang];
    if (dict && dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const key = el.getAttribute("data-i18n-ph");
    const dict = TRANSLATIONS[lang];
    if (dict && dict[key] !== undefined) {
      el.setAttribute("placeholder", dict[key]);
    }
  });

  document.querySelectorAll(".lang-current").forEach((el) => {
    el.textContent = lang.toUpperCase();
  });

  document.querySelectorAll("[data-lang-option]").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-lang-option") === lang);
  });
}

function setLang(lang) {
  applyTranslations(lang);
}

document.addEventListener("DOMContentLoaded", () => {
  applyTranslations(DEFAULT_LANG);

  document.querySelectorAll("[data-lang-option]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      setLang(btn.getAttribute("data-lang-option"));
    });
  });
});
