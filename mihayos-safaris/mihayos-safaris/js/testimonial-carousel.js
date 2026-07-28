/* =========================================================
   MIHAYO'S SAFARIS — testimonial-carousel.js
   A lightweight, dependency-free sliding carousel for the
   testimonials section: arrows, dot indicators, auto-advance,
   pauses on hover, swipe-friendly on touch devices.
   ========================================================= */

let testiIndex = 0;
let testiAutoTimer = null;

function testiSlideCount() {
  const track = document.getElementById("testiTrack");
  return track ? track.children.length : 0;
}

function testiRender() {
  const track = document.getElementById("testiTrack");
  if (!track) return;
  track.style.transform = `translateX(-${testiIndex * 100}%)`;
  document.querySelectorAll(".testi-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === testiIndex);
  });
}

function testiGoTo(i) {
  const count = testiSlideCount();
  testiIndex = ((i % count) + count) % count;
  testiRender();
}

function testiBuildDots() {
  const dotsWrap = document.getElementById("testiDots");
  if (!dotsWrap) return;
  const count = testiSlideCount();
  dotsWrap.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("button");
    dot.className = "testi-dot";
    dot.setAttribute("aria-label", `Go to testimonial ${i + 1}`);
    dot.addEventListener("click", () => { testiGoTo(i); testiResetAutoplay(); });
    dotsWrap.appendChild(dot);
  }
}

function testiResetAutoplay() {
  clearInterval(testiAutoTimer);
  testiAutoTimer = setInterval(() => testiGoTo(testiIndex + 1), 6000);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("testiTrack")) return;
  testiBuildDots();
  testiRender();
  testiResetAutoplay();

  document.getElementById("testiPrev").addEventListener("click", () => { testiGoTo(testiIndex - 1); testiResetAutoplay(); });
  document.getElementById("testiNext").addEventListener("click", () => { testiGoTo(testiIndex + 1); testiResetAutoplay(); });

  const carousel = document.querySelector(".testi-carousel");
  carousel.addEventListener("mouseenter", () => clearInterval(testiAutoTimer));
  carousel.addEventListener("mouseleave", testiResetAutoplay);

  // Basic touch swipe support
  let touchStartX = 0;
  const wrap = document.querySelector(".testi-track-wrap");
  wrap.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; });
  wrap.addEventListener("touchend", (e) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 40) {
      testiGoTo(testiIndex + (delta < 0 ? 1 : -1));
      testiResetAutoplay();
    }
  });
});
