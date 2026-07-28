/* =========================================================
   MIHAYO'S SAFARIS — weather-spin.js
   A wheel-of-fortune style picker. Spinning (or clicking a
   segment) fetches REAL live weather for that park/region from
   Open-Meteo's free, keyless API — no mock data, no API key.
   Docs: https://open-meteo.com/en/docs
   ========================================================= */

const WEATHER_SPOTS = [
  { name: "Serengeti", region: "Northern Circuit", lat: -2.3333, lng: 34.8333 },
  { name: "Ngorongoro", region: "Northern Circuit", lat: -3.2000, lng: 35.5833 },
  { name: "Kilimanjaro", region: "Uhuru Peak, 5,895m", lat: -3.0674, lng: 37.3556 },
  { name: "Zanzibar", region: "Coast & Islands", lat: -6.1659, lng: 39.2026 },
  { name: "Tarangire", region: "Northern Circuit", lat: -3.5000, lng: 35.7500 },
  { name: "Ruaha", region: "Southern Circuit", lat: -7.7000, lng: 34.8333 },
  { name: "Manyara", region: "Northern Circuit", lat: -3.3833, lng: 35.8167 },
  { name: "Mahale", region: "Western Tanzania", lat: -6.3167, lng: 30.4833 },
];

/* WMO weather codes -> [Font Awesome icon, plain-language label] */
const WMO_MAP = {
  0: ["fa-sun", "Clear sky"], 1: ["fa-cloud-sun", "Mostly clear"], 2: ["fa-cloud-sun", "Partly cloudy"], 3: ["fa-cloud", "Overcast"],
  45: ["fa-smog", "Fog"], 48: ["fa-smog", "Depositing rime fog"],
  51: ["fa-cloud-rain", "Light drizzle"], 53: ["fa-cloud-rain", "Drizzle"], 55: ["fa-cloud-rain", "Dense drizzle"],
  61: ["fa-cloud-rain", "Light rain"], 63: ["fa-cloud-showers-heavy", "Rain"], 65: ["fa-cloud-showers-heavy", "Heavy rain"],
  71: ["fa-snowflake", "Light snow"], 73: ["fa-snowflake", "Snow"], 75: ["fa-snowflake", "Heavy snow"],
  80: ["fa-cloud-showers-heavy", "Rain showers"], 81: ["fa-cloud-showers-heavy", "Rain showers"], 82: ["fa-cloud-showers-heavy", "Violent showers"],
  95: ["fa-cloud-bolt", "Thunderstorm"], 96: ["fa-cloud-bolt", "Thunderstorm w/ hail"], 99: ["fa-cloud-bolt", "Severe thunderstorm"],
};
function describeWeather(code) { return WMO_MAP[code] || ["fa-cloud", "Conditions unavailable"]; }

let spinRotation = 0;
let spinBusy = false;

function spinRenderLabels() {
  const wheel = document.getElementById("weatherWheel");
  if (!wheel) return;
  const n = WEATHER_SPOTS.length;
  const segAngle = 360 / n;
  wheel.innerHTML = "";
  WEATHER_SPOTS.forEach((spot, i) => {
    const angle = i * segAngle + segAngle / 2;
    const label = document.createElement("div");
    label.className = "spin-seg-label";
    label.style.transform = `rotate(${angle}deg) translateY(-128px)`;
    label.innerHTML = `<span style="color:${i % 2 === 0 ? '#222' : '#fff'}">${spot.name}</span>`;
    label.addEventListener("click", () => { if (!spinBusy) spinTo(i); });
    wheel.appendChild(label);
  });
}

async function fetchLiveWeather(spot) {
  const nameEl = document.getElementById("weatherParkName");
  const regionEl = document.getElementById("weatherRegionTag");
  const tempEl = document.getElementById("weatherTempVal");
  const descEl = document.getElementById("weatherDescVal");
  const iconEl = document.getElementById("weatherIconEl");
  const windEl = document.getElementById("weatherWindVal");
  const humidEl = document.getElementById("weatherHumidVal");
  const updatedEl = document.getElementById("weatherUpdatedVal");

  nameEl.textContent = spot.name;
  regionEl.textContent = spot.region;
  descEl.textContent = "Fetching live conditions…";
  updatedEl.textContent = "Contacting Open-Meteo…";

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lng}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=Africa%2FNairobi`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather service unreachable");
    const data = await res.json();
    const cur = data.current;
    const [icon, label] = describeWeather(cur.weather_code);

    tempEl.textContent = `${Math.round(cur.temperature_2m)}°C`;
    descEl.textContent = label;
    iconEl.className = `fa-solid ${icon} weather-icon`;
    windEl.textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
    humidEl.textContent = `${Math.round(cur.relative_humidity_2m)}%`;
    const t = new Date(cur.time);
    updatedEl.textContent = `Live · updated ${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} EAT`;
  } catch (err) {
    tempEl.textContent = "--°C";
    descEl.textContent = "Live weather unavailable right now";
    iconEl.className = "fa-solid fa-cloud-question weather-icon";
    windEl.textContent = "--";
    humidEl.textContent = "--";
    updatedEl.textContent = "Couldn't reach the weather service — check your connection and try Spin again.";
  }
}

function spinTo(index) {
  if (spinBusy) return;
  spinBusy = true;
  const wheel = document.getElementById("weatherWheel");
  const n = WEATHER_SPOTS.length;
  const segAngle = 360 / n;
  const currentMod = ((spinRotation % 360) + 360) % 360;
  // pointer sits at top (0deg); segment i's label sits at (i*segAngle + segAngle/2) when unrotated.
  let desiredMod = (360 - (index * segAngle + segAngle / 2)) % 360;
  let delta = desiredMod - currentMod;
  if (delta < 0) delta += 360;
  const extraSpins = 4;
  spinRotation += delta + extraSpins * 360;
  wheel.style.transform = `rotate(${spinRotation}deg)`;

  const onEnd = () => {
    wheel.removeEventListener("transitionend", onEnd);
    spinBusy = false;
    fetchLiveWeather(WEATHER_SPOTS[index]);
  };
  wheel.addEventListener("transitionend", onEnd);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("weatherWheel")) return;
  spinRenderLabels();
  fetchLiveWeather(WEATHER_SPOTS[0]);

  const spinBtn = document.getElementById("weatherSpinBtn");
  spinBtn && spinBtn.addEventListener("click", () => {
    if (spinBusy) return;
    const randomIndex = Math.floor(Math.random() * WEATHER_SPOTS.length);
    spinTo(randomIndex);
  });

  // Refresh the currently-shown park's weather every 10 minutes without re-spinning
  setInterval(() => {
    if (!spinBusy) {
      const nameEl = document.getElementById("weatherParkName");
      const current = WEATHER_SPOTS.find(s => s.name === nameEl.textContent) || WEATHER_SPOTS[0];
      fetchLiveWeather(current);
    }
  }, 10 * 60 * 1000);
});
