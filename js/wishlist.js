/* =========================================================
   MIHAYO'S SAFARIS — wishlist.js
   In-memory wishlist (session only — no browser storage, so
   it resets on reload; wire to a real account/backend later
   if persistence across visits is needed).
   ========================================================= */

let wishlistItems = [];

function wishlistFind(id) {
  return wishlistItems.find(i => i.id === id);
}

function wishlistRenderDrawer() {
  const list = document.getElementById("wishlistItems");
  const emptyState = document.getElementById("wishlistEmpty");
  const footer = document.getElementById("wishlistFooter");
  if (!list) return;

  list.innerHTML = "";
  if (wishlistItems.length === 0) {
    emptyState.style.display = "block";
    footer.style.display = "none";
    return;
  }
  emptyState.style.display = "none";
  footer.style.display = "block";

  wishlistItems.forEach(item => {
    const row = document.createElement("div");
    row.className = "wishlist-item";
    row.innerHTML = `
      <img src="${item.image}" alt="">
      <div class="wishlist-item-info"><h4>${item.name}</h4><span>${item.tag}</span></div>
      <button aria-label="Remove ${item.name}"><i class="fa-solid fa-xmark"></i></button>
    `;
    row.querySelector("button").addEventListener("click", () => wishlistToggle(item.id, null));
    list.appendChild(row);
  });
}

function wishlistUpdateFab() {
  const fab = document.getElementById("wishlistFab");
  const countEl = document.getElementById("wishlistCount");
  if (!fab) return;
  countEl.textContent = wishlistItems.length;
  fab.classList.toggle("empty", wishlistItems.length === 0);
}

function wishlistUpdateHearts(id) {
  const isSaved = !!wishlistFind(id);
  document.querySelectorAll(`.wishlist-heart[data-wishlist-id="${id}"]`).forEach(btn => {
    btn.classList.toggle("active", isSaved);
    const icon = btn.querySelector("i");
    icon.className = isSaved ? "fa-solid fa-heart" : "fa-regular fa-heart";
  });
}

function wishlistToggle(id, btn) {
  const existing = wishlistFind(id);
  if (existing) {
    wishlistItems = wishlistItems.filter(i => i.id !== id);
  } else {
    const name = btn ? btn.getAttribute("data-wishlist-name") : (wishlistFind(id) || {}).name;
    const image = btn ? btn.getAttribute("data-wishlist-image") : null;
    const tag = btn ? btn.getAttribute("data-wishlist-tag") : null;
    wishlistItems.push({ id, name, image, tag });
  }
  wishlistUpdateHearts(id);
  wishlistUpdateFab();
  wishlistRenderDrawer();
}

function wishlistOpenDrawer() {
  document.getElementById("wishlistDrawer").classList.add("open");
  document.getElementById("wishlistOverlay").classList.add("open");
}
function wishlistCloseDrawer() {
  document.getElementById("wishlistDrawer").classList.remove("open");
  document.getElementById("wishlistOverlay").classList.remove("open");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".wishlist-heart").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute("data-wishlist-id");
      wishlistToggle(id, btn);
    });
  });

  const fab = document.getElementById("wishlistFab");
  const closeBtn = document.getElementById("wishlistCloseBtn");
  const overlay = document.getElementById("wishlistOverlay");
  fab && fab.addEventListener("click", wishlistOpenDrawer);
  closeBtn && closeBtn.addEventListener("click", wishlistCloseDrawer);
  overlay && overlay.addEventListener("click", wishlistCloseDrawer);

  wishlistUpdateFab();
});
