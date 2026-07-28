/* =========================================================
   MIHAYO'S SAFARIS — darkmode.js
   Toggles [data-theme="dark"] on <html>. Kept in memory only
   for this page view (no localStorage) — wire to a cookie or
   user-preference API once this ships behind a backend.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const toggleBtns = document.querySelectorAll(".theme-toggle");

  const applyIcon = () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    toggleBtns.forEach(btn => {
      btn.innerHTML = isDark ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
      btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    });
  };

  toggleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      root.setAttribute("data-theme", isDark ? "light" : "dark");
      applyIcon();
    });
  });

  applyIcon();
});
