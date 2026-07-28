/* =========================================================
   MIHAYO'S SAFARIS — trip-calculator.js
   Live, client-side rough budget estimator. Rates are
   illustrative starting points consistent with the ranges
   quoted elsewhere on the site (see safaris.html / hotels.html)
   — NOT a live pricing feed. The UI says so explicitly.
   ========================================================= */

const CALC_RATES = {
  budget:   { safariPerDay: 150, zanzibarPerNight: 90 },
  midrange: { safariPerDay: 280, zanzibarPerNight: 180 },
  luxury:   { safariPerDay: 520, zanzibarPerNight: 350 },
};
const CALC_KILI_FLAT_PER_PERSON = 2200;

let calcTier = "midrange";

function calcFormatUSD(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function calcRun() {
  const travelersEl = document.getElementById("calcTravelers");
  const durationEl = document.getElementById("calcDuration");
  const kiliSwitch = document.getElementById("calcKiliSwitch");
  const zanzibarSwitch = document.getElementById("calcZanzibarSwitch");
  const zanzibarNightsEl = document.getElementById("calcZanzibarNights");
  if (!travelersEl) return;

  const travelers = parseInt(travelersEl.value, 10);
  const duration = parseInt(durationEl.value, 10);
  const kiliOn = kiliSwitch.classList.contains("on");
  const zanzibarOn = zanzibarSwitch.classList.contains("on");
  const zanzibarNights = parseInt(zanzibarNightsEl.value, 10) || 0;

  const rates = CALC_RATES[calcTier];
  const safariCost = travelers * duration * rates.safariPerDay;
  const kiliCost = kiliOn ? travelers * CALC_KILI_FLAT_PER_PERSON : 0;
  const zanzibarCost = zanzibarOn ? travelers * zanzibarNights * rates.zanzibarPerNight : 0;
  const total = safariCost + kiliCost + zanzibarCost;
  const perPerson = total / travelers;

  document.getElementById("calcTravelersVal").textContent = travelers;
  document.getElementById("calcDurationVal").textContent = duration;

  document.getElementById("calcTotal").textContent = calcFormatUSD(total);
  document.getElementById("calcPerPerson").textContent = calcFormatUSD(perPerson) + " " + (TRANSLATIONS[currentLang]["calc.result.pp"] || "per person");

  document.getElementById("calcRowSafari").textContent = calcFormatUSD(safariCost);
  const kiliRow = document.getElementById("calcRowKiliWrap");
  const zanzibarRow = document.getElementById("calcRowZanzibarWrap");
  kiliRow.style.display = kiliOn ? "flex" : "none";
  zanzibarRow.style.display = zanzibarOn ? "flex" : "none";
  document.getElementById("calcRowKili").textContent = calcFormatUSD(kiliCost);
  document.getElementById("calcRowZanzibar").textContent = calcFormatUSD(zanzibarCost);

  document.getElementById("calcZanzibarNightsWrap").style.display = zanzibarOn ? "flex" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const travelersEl = document.getElementById("calcTravelers");
  if (!travelersEl) return;

  document.getElementById("calcDuration").addEventListener("input", calcRun);
  travelersEl.addEventListener("input", calcRun);
  document.getElementById("calcZanzibarNights").addEventListener("input", calcRun);

  document.querySelectorAll(".calc-tier-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".calc-tier-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      calcTier = btn.getAttribute("data-tier");
      calcRun();
    });
  });

  document.querySelectorAll(".calc-switch").forEach(sw => {
    sw.addEventListener("click", () => {
      sw.classList.toggle("on");
      calcRun();
    });
  });

  calcRun();
});
