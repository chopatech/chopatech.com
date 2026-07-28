/* =========================================================
   MIHAYO'S SAFARIS — main.js
   Core interactivity: navbar state, mobile nav, filters,
   FAQ accordion, lightbox, form validation, cookie banner
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- Navbar scroll state ---------- */
  const navbar = document.querySelector(".navbar");
  const onScroll = () => {
    if (!navbar) return;
    navbar.classList.toggle("scrolled", window.scrollY > 40);
    const backTop = document.querySelector(".fab-top");
    if (backTop) backTop.classList.toggle("show", window.scrollY > 500);
  };
  window.addEventListener("scroll", onScroll);
  onScroll();

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector(".nav-toggle");
  const navClose = document.querySelector(".mobile-nav .close-btn");
  navToggle && navToggle.addEventListener("click", () => document.body.classList.add("nav-open"));
  navClose && navClose.addEventListener("click", () => document.body.classList.remove("nav-open"));
  document.querySelectorAll(".mobile-nav a").forEach(a =>
    a.addEventListener("click", () => document.body.classList.remove("nav-open"))
  );

  /* ---------- Language dropdown open/close ---------- */
  const langSwitch = document.querySelector(".lang-switch");
  const langBtn = document.querySelector(".lang-btn");
  langBtn && langBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    langSwitch.classList.toggle("open");
  });
  document.addEventListener("click", () => langSwitch && langSwitch.classList.remove("open"));

  /* ---------- Scroll-reveal (lightweight AOS fallback) ---------- */
  const revealEls = document.querySelectorAll("[data-aos]");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("aos-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("aos-in"));
  }

  /* ---------- Filter pills (destinations / safaris) ---------- */
  document.querySelectorAll(".filter-row").forEach(row => {
    const pills = row.querySelectorAll(".filter-pill");
    const targetSelector = row.getAttribute("data-target");
    const items = targetSelector ? document.querySelectorAll(targetSelector) : [];
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        pills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        const filter = pill.getAttribute("data-filter");
        items.forEach(item => {
          const cats = (item.getAttribute("data-cats") || "").split(",");
          item.style.display = (filter === "all" || cats.includes(filter)) ? "" : "none";
        });
      });
    });
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item .faq-q").forEach(q => {
    q.addEventListener("click", () => {
      const item = q.closest(".faq-item");
      const wasOpen = item.classList.contains("open");
      item.parentElement.querySelectorAll(".faq-item").forEach(i => i.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });

  /* ---------- Lightweight lightbox for gallery ---------- */
  const galleryItems = document.querySelectorAll(".masonry .g-item img");
  if (galleryItems.length) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(7,20,15,.92);display:none;align-items:center;justify-content:center;z-index:2000;padding:40px;";
    overlay.innerHTML = '<img style="max-width:90vw;max-height:85vh;border-radius:10px;" /><button aria-label="Close" style="position:absolute;top:24px;right:32px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;">&times;</button>';
    document.body.appendChild(overlay);
    const imgEl = overlay.querySelector("img");
    galleryItems.forEach(img => {
      img.parentElement.addEventListener("click", () => {
        imgEl.src = img.src;
        overlay.style.display = "flex";
      });
    });
    overlay.addEventListener("click", () => overlay.style.display = "none");
  }

  /* ---------- Form validation (contact / booking) ---------- */
  document.querySelectorAll("form[data-validate]").forEach(form => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      form.querySelectorAll("[required]").forEach(field => {
        const group = field.closest(".form-group");
        if (!field.value.trim()) {
          valid = false;
          group && group.classList.add("error");
        } else {
          group && group.classList.remove("error");
        }
      });
      const successBox = form.querySelector(".form-success");
      if (valid) {
        form.style.display = "none";
        if (successBox) successBox.style.display = "block";
      }
    });
  });

  /* ---------- Newsletter forms (footer) ---------- */
  document.querySelectorAll(".foot-newsletter-form").forEach(f => {
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = f.querySelector("button");
      const original = btn.textContent;
      btn.textContent = "✓";
      setTimeout(() => btn.textContent = original, 2000);
      f.reset();
    });
  });

  /* ---------- Cookie consent banner ---------- */
  const cookieBanner = document.querySelector(".cookie-banner");
  if (cookieBanner) {
    setTimeout(() => cookieBanner.classList.add("show"), 900);
    cookieBanner.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => cookieBanner.classList.remove("show"));
    });
  }

  /* ---------- Back to top ---------- */
  const backTop = document.querySelector(".fab-top");
  backTop && backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

});
