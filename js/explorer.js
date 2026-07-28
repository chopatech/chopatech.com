/* =========================================================
   MIHAYO'S SAFARIS — explorer.js
   Drives the "Explorer Console": a game/emulator-style
   destination picker. Selecting a destination updates the
   screen image/blurb AND the embedded live Google Map.
   Map embed uses the keyless Google Maps query format:
   https://maps.google.com/maps?q=LAT,LNG&z=ZOOM&output=embed
   ========================================================= */

const EXPLORER_DESTINATIONS = [
  { id: "serengeti", name: "Serengeti National Park", region: "Northern Circuit", lat: -2.3333, lng: 34.8333, zoom: 8, img: "images/destinations/serengeti.png", blurb: "Endless short-grass plains and the stage for the Great Migration's river crossings." },
  { id: "ngorongoro", name: "Ngorongoro Crater", region: "Northern Circuit", lat: -3.2000, lng: 35.5833, zoom: 10, img: "images/destinations/ngorongoro.png", blurb: "A collapsed volcanic caldera holding one of the densest wildlife concentrations on Earth." },
  { id: "tarangire", name: "Tarangire National Park", region: "Northern Circuit", lat: -3.5000, lng: 35.7500, zoom: 9, img: "images/destinations/tarangire.png", blurb: "Tanzania's highest elephant density, framed by centuries-old baobab trees." },
  { id: "manyara", name: "Lake Manyara", region: "Northern Circuit", lat: -3.3833, lng: 35.8167, zoom: 10, img: "images/destinations/lake_manyara.png", blurb: "Groundwater forest, tree-climbing lions, and flamingo-lined alkaline shores." },
  { id: "arusha", name: "Arusha National Park", region: "Northern Circuit", lat: -3.2333, lng: 36.8333, zoom: 10, img: "images/destinations/arusha.png", blurb: "An easy day trip from town — Mount Meru, the Momella Lakes, colobus monkeys." },
  { id: "kilimanjaro", name: "Mount Kilimanjaro", region: "Mountains", lat: -3.0674, lng: 37.3556, zoom: 10, img: "images/destinations/mount_kilimanjaro.png", blurb: "The Roof of Africa: 5,895m, seven routes, five climate zones in a single ascent." },
  { id: "ruaha", name: "Ruaha National Park", region: "Southern Circuit", lat: -7.7000, lng: 34.8333, zoom: 8, img: "images/destinations/ruaha.png", blurb: "Tanzania's largest national park, anchored by the Great Ruaha River." },
  { id: "nyerere", name: "Nyerere National Park", region: "Southern Circuit", lat: -7.7667, lng: 37.7833, zoom: 9, img: "images/destinations/nyerere.png", blurb: "Africa's largest protected wilderness, best explored by boat on the Rufiji River." },
  { id: "mikumi", name: "Mikumi National Park", region: "Southern Circuit", lat: -7.4083, lng: 37.0250, zoom: 9, img: "images/destinations/mikumi.png", blurb: "The most accessible southern park — a 4–5 hour drive from Dar es Salaam." },
  { id: "udzungwa", name: "Udzungwa Mountains", region: "Southern Circuit", lat: -7.8000, lng: 36.9000, zoom: 10, img: "images/destinations/udzungwa.png", blurb: "Rainforest hiking to the Sanje Waterfalls, home to endemic primates." },
  { id: "mahale", name: "Mahale Mountains", region: "Western Tanzania", lat: -6.3167, lng: 30.4833, zoom: 9, img: "images/destinations/mahale.png", blurb: "Boat-access only, on Lake Tanganyika, with habituated wild chimpanzee communities." },
  { id: "katavi", name: "Katavi National Park", region: "Western Tanzania", lat: -6.7333, lng: 31.1333, zoom: 8, img: "images/destinations/katavi.png", blurb: "Remote and rarely visited — dry-season hippo pools packed shoulder to shoulder." },
  { id: "zanzibar", name: "Zanzibar & Stone Town", region: "Coast & Islands", lat: -6.1659, lng: 39.2026, zoom: 11, img: "images/destinations/zanzibar___stone_town.png", blurb: "Spice farms, coral reefs, sandbanks, and centuries-old Swahili architecture." },
  { id: "mafia", name: "Mafia Island Marine Park", region: "Coast & Islands", lat: -7.8333, lng: 39.7500, zoom: 10, img: "images/destinations/mafia.png", blurb: "Whale shark season and undisturbed coral gardens, quieter than Zanzibar." },
  { id: "natron", name: "Lake Natron", region: "Lakes", lat: -2.0500, lng: 36.0833, zoom: 9, img: "https://picsum.photos/seed/exp-natron/900/600", blurb: "A caustic, blood-red soda lake beneath Tanzania's only active volcano." },
];

let explorerIndex = 0;

function explorerRender() {
  const d = EXPLORER_DESTINATIONS[explorerIndex];
  const img = document.getElementById("explorerImg");
  const gps = document.getElementById("explorerGps");
  const name = document.getElementById("explorerName");
  const desc = document.getElementById("explorerDesc");
  const mapFrame = document.getElementById("explorerMapFrame");
  const mapLink = document.getElementById("explorerMapBtn");
  if (!img) return;

  img.style.opacity = 0;
  setTimeout(() => { img.src = d.img; img.alt = d.name; img.style.opacity = 1; }, 120);

  gps.textContent = `${Math.abs(d.lat).toFixed(4)}°S, ${Math.abs(d.lng).toFixed(4)}°E`;
  name.textContent = d.name;
  desc.textContent = d.blurb;

  mapFrame.src = `https://maps.google.com/maps?q=${d.lat},${d.lng}&z=${d.zoom}&output=embed`;
  mapLink.href = `https://www.google.com/maps?q=${d.lat},${d.lng}`;

  document.querySelectorAll(".cartridge-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i === explorerIndex);
  });
  const activeBtn = document.querySelector(`.cartridge-btn[data-index="${explorerIndex}"]`);
  if (activeBtn) activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function explorerBuildCartridges() {
  const row = document.getElementById("cartridgeRow");
  if (!row) return;
  row.innerHTML = "";
  EXPLORER_DESTINATIONS.forEach((d, i) => {
    const btn = document.createElement("button");
    btn.className = "cartridge-btn";
    btn.setAttribute("data-index", i);
    btn.setAttribute("aria-label", `Show ${d.name} on the map`);
    btn.innerHTML = `<img src="${d.img}" alt="" loading="lazy"><span class="label">${d.name.split(" ")[0]}</span>`;
    btn.addEventListener("click", () => { explorerIndex = i; explorerRender(); });
    row.appendChild(btn);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("explorerImg")) return;
  explorerBuildCartridges();
  explorerRender();

  const prevBtn = document.getElementById("explorerPrev");
  const nextBtn = document.getElementById("explorerNext");
  prevBtn && prevBtn.addEventListener("click", () => {
    explorerIndex = (explorerIndex - 1 + EXPLORER_DESTINATIONS.length) % EXPLORER_DESTINATIONS.length;
    explorerRender();
  });
  nextBtn && nextBtn.addEventListener("click", () => {
    explorerIndex = (explorerIndex + 1) % EXPLORER_DESTINATIONS.length;
    explorerRender();
  });

  // Keyboard support — left/right arrows act like a game controller
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("explorer-section")) return;
    if (e.key === "ArrowLeft") prevBtn && prevBtn.click();
    if (e.key === "ArrowRight") nextBtn && nextBtn.click();
  });

  // If arriving via #explorer anchor (e.g. from the homepage button), jump a destination selector into view
  if (window.location.hash === "#explorer") {
    setTimeout(() => document.getElementById("explorer-section").scrollIntoView({ behavior: "smooth" }), 300);
  }
});
