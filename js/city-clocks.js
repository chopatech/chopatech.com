/* =========================================================
   MIHAYO'S SAFARIS — city-clocks.js
   Live, real ticking clocks for Tanzania's main hubs.
   Honest note: Tanzania runs on a single time zone nationwide
   (East Africa Time, UTC+3, no daylight saving) — so every
   city genuinely shows the identical time. This isn't a bug;
   the section is about giving each hub its own live-updating
   "right now" moment rather than implying the times differ.
   ========================================================= */

function cityClocksTick() {
  const now = new Date();
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Dar_es_Salaam",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Dar_es_Salaam",
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  }).format(now);

  document.querySelectorAll(".city-clock-time").forEach(el => { el.textContent = timeStr; });
  document.querySelectorAll(".city-clock-date").forEach(el => { el.textContent = dateStr; });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector(".city-clock-time")) return;
  cityClocksTick();
  setInterval(cityClocksTick, 1000);
});
