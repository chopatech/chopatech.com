const root = document.documentElement;
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const modal = document.querySelector("[data-modal]");
const canvas = document.querySelector("[data-hero-canvas]");
const ctx = canvas.getContext("2d");

const setHeaderState = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 18);
};

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

document.querySelector(".theme-toggle").addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
});

menuToggle.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("is-open");
  document.body.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

mobileMenu.addEventListener("click", (event) => {
  if (event.target.matches("a, button")) {
    mobileMenu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll("[data-scroll-target]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(button.dataset.scrollTarget).scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    modal.showModal();
    document.body.classList.add("modal-open");
  });
});

modal.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
});

document.querySelectorAll(".workflow-step").forEach((step) => {
  step.addEventListener("click", () => {
    document.querySelectorAll(".workflow-step").forEach((item) => item.classList.remove("is-active"));
    step.classList.add("is-active");
  });
});

const sceneFrame = document.querySelector("[data-scene-frame]");
const layerLabel = document.querySelector("[data-layer-label]");
const layerNames = {
  Final: "Final composite",
  Motion: "Mocap solve",
  Masks: "Roto and alpha",
  Lighting: "Light match",
};

document.querySelectorAll("[data-layer]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-layer]").forEach((item) => {
      item.classList.remove("is-selected");
      item.setAttribute("aria-selected", "false");
    });
    button.classList.add("is-selected");
    button.setAttribute("aria-selected", "true");
    const layer = button.dataset.layer;
    layerLabel.textContent = layerNames[layer];
    sceneFrame.dataset.layer = layer.toLowerCase();
  });
});

const uploadTitle = document.querySelector("[data-upload-title]");
const uploadSubtitle = document.querySelector("[data-upload-subtitle]");
document.querySelector("[data-file-input]").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;
  uploadTitle.textContent = file.name;
  uploadSubtitle.textContent = "Ready to analyze";
});

const fidelity = document.querySelector("[data-fidelity]");
const fidelityValue = document.querySelector("[data-fidelity-value]");
fidelity.addEventListener("input", () => {
  fidelityValue.textContent = `${fidelity.value}%`;
});

const renderButton = document.querySelector("[data-render-button]");
const renderBar = document.querySelector("[data-render-bar]");
const renderStatus = document.querySelector("[data-render-status]");
const characterSelect = document.querySelector("[data-character-select]");

renderButton.addEventListener("click", () => {
  renderButton.disabled = true;
  renderButton.textContent = "Analyzing...";
  renderStatus.textContent = `Solving ${characterSelect.value}`;
  renderBar.style.width = "18%";

  const stages = [
    ["Tracking performer", "42%"],
    ["Retargeting motion", "68%"],
    ["Matching light", "86%"],
    ["Export ready", "100%"],
  ];

  stages.forEach(([label, width], index) => {
    window.setTimeout(() => {
      renderStatus.textContent = label;
      renderBar.style.width = width;
      if (index === stages.length - 1) {
        renderButton.disabled = false;
        renderButton.textContent = "Analyze again";
      }
    }, 650 * (index + 1));
  });
});

const particles = Array.from({ length: 92 }, (_, index) => ({
  x: Math.random(),
  y: Math.random(),
  z: Math.random() * 0.8 + 0.2,
  hue: index % 3,
}));

function resizeCanvas() {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * scale);
  canvas.height = Math.floor(canvas.clientHeight * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function draw(time) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  const centerX = width * 0.66;
  const centerY = height * 0.48;
  const radius = Math.min(width, height) * 0.28;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(time * 0.00008);
  for (let ring = 0; ring < 9; ring += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius + ring * 22, radius * 0.42 + ring * 12, ring * 0.17, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ring % 2 ? "255, 79, 154" : "62, 231, 255"}, ${0.22 - ring * 0.014})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();

  particles.forEach((particle) => {
    const drift = time * 0.00004 * particle.z;
    const x = ((particle.x + drift) % 1) * width;
    const y = (particle.y + Math.sin(time * 0.001 + particle.x * 8) * 0.018) * height;
    const size = 1 + particle.z * 2.4;
    const colors = ["62, 231, 255", "255, 79, 154", "255, 209, 102"];
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${colors[particle.hue]}, ${0.28 + particle.z * 0.42})`;
    ctx.fill();
  });

  ctx.fillStyle = "rgba(245, 247, 251, 0.9)";
  ctx.font = "700 13px Inter";
  ctx.fillText("tracking volume 03", centerX + radius * 0.62, centerY - radius * 0.52);
  ctx.fillText("actor solve locked", centerX - radius * 0.78, centerY + radius * 0.58);

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);