import * as THREE from "three";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });

const container = document.getElementById("scene")!;
renderer.setSize(container.clientWidth, 400);
container.appendChild(renderer.domElement);

// LIGHT
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

// SIMPLE SEWING MACHINE BASE (placeholder 3D start)
const geometry = new THREE.BoxGeometry(2, 0.5, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x6a00ff });
const machine = new THREE.Mesh(geometry, material);
scene.add(machine);

camera.position.z = 5;

// ANIMATION LOOP
function animate() {
  requestAnimationFrame(animate);
  machine.rotation.y += 0.01;
  renderer.render(scene, camera);
}

animate();