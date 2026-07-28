/* =========================================================
   MIHAYO'S SAFARIS — newsletter-popup.js
   Shows once per page view, after a delay, unless dismissed.
   In-memory only (no browser storage) — so it can reappear on
   a fresh page load. Wire to a cookie if you want a real
   "don't show again for 30 days" behavior once there's a backend.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("newsletterPopupOverlay");
  if (!overlay) return;

  const closeBtn = document.getElementById("newsletterPopupClose");
  const declineBtn = document.getElementById("newsletterPopupDecline");
  const form = document.getElementById("newsletterPopupForm");
  const successBox = document.getElementById("newsletterPopupSuccess");

  const openPopup = () => overlay.classList.add("open");
  const closePopup = () => overlay.classList.remove("open");

  const timer = setTimeout(openPopup, 12000);

  closeBtn.addEventListener("click", () => { clearTimeout(timer); closePopup(); });
  declineBtn.addEventListener("click", (e) => { e.preventDefault(); clearTimeout(timer); closePopup(); });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closePopup(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.style.display = "none";
    successBox.style.display = "block";
    setTimeout(closePopup, 2200);
  });
});
