/* =========================================================
   MIHAYO'S SAFARIS — currency.js
   Live currency conversion for every [data-usd] price on the
   page. Fetches real rates from exchangerate-api.com's free,
   keyless endpoint. If that fails (offline, rate-limited),
   falls back to approximate static rates and says so plainly
   rather than pretending the fallback numbers are live.

   Text-node-only mutation: this only rewrites the numeric
   text node inside each element, so sibling tags like <small>
   (e.g. "from · per person") are never touched or wiped out.
   ========================================================= */

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", GBP: "£", TZS: "TSh ", KES: "KSh " };
const CURRENCY_FALLBACK_RATES = { USD: 1, EUR: 0.92, GBP: 0.79, TZS: 2650, KES: 129 };

let currencyRates = null;
let currencyIsLive = false;
let currentCurrency = "USD";

function currencyFormat(amount, code) {
  const symbol = CURRENCY_SYMBOLS[code] || (code + " ");
  const decimals = (code === "TZS" || code === "KES") ? 0 : 0; // whole numbers everywhere for readability
  const rounded = Math.round(amount);
  return symbol + rounded.toLocaleString("en-US");
}

function currencyConvertElement(el, code) {
  const textNode = Array.from(el.childNodes).find(n => n.nodeType === 3 && /\$/.test(n.nodeValue));
  if (!textNode) return;
  if (el.dataset.usdOriginal === undefined) el.dataset.usdOriginal = textNode.nodeValue;
  const original = el.dataset.usdOriginal;
  const match = original.match(/\$([\d,]+(?:\.\d+)?)/);
  if (!match) return;
  const baseUSD = parseFloat(match[1].replace(/,/g, ""));
  const rate = (currencyRates && currencyRates[code]) || CURRENCY_FALLBACK_RATES[code] || 1;
  const converted = baseUSD * rate;
  const formatted = currencyFormat(converted, code);
  textNode.nodeValue = original.replace(match[0], formatted);
}

function currencyApplyAll(code) {
  currentCurrency = code;
  document.querySelectorAll("[data-usd]").forEach(el => currencyConvertElement(el, code));
  document.querySelectorAll(".currency-current").forEach(el => { el.textContent = code; });
  document.querySelectorAll("[data-currency]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-currency") === code);
  });
  document.querySelectorAll(".currency-live-note").forEach(el => {
    el.style.display = (code === "USD") ? "none" : "block";
    el.textContent = currencyIsLive
      ? "Live exchange rate"
      : "Approximate rate — live feed unavailable right now";
  });
}

async function currencyFetchRates() {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (!res.ok) throw new Error("rate service unreachable");
    const data = await res.json();
    currencyRates = data.rates;
    currencyIsLive = true;
  } catch (err) {
    currencyRates = CURRENCY_FALLBACK_RATES;
    currencyIsLive = false;
  }
  currencyApplyAll(currentCurrency);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-usd]")) return;

  currencyFetchRates();

  const switchEl = document.querySelector(".currency-switch");
  const btn = document.querySelector(".currency-btn");
  btn && btn.addEventListener("click", (e) => {
    e.stopPropagation();
    switchEl.classList.toggle("open");
  });
  document.addEventListener("click", () => switchEl && switchEl.classList.remove("open"));

  document.querySelectorAll("[data-currency]").forEach(option => {
    option.addEventListener("click", () => {
      currencyApplyAll(option.getAttribute("data-currency"));
      switchEl.classList.remove("open");
    });
  });
});
