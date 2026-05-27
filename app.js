import * as THREE from 'https://esm.sh/three@0.165.0';

import { OrbitControls } from 'https://esm.sh/three@0.165.0/examples/jsm/controls/OrbitControls.js';

import { GLTFLoader } from 'https://esm.sh/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';

import { DRACOLoader } from 'https://esm.sh/three@0.165.0/examples/jsm/loaders/DRACOLoader.js';

// ---------------- SCENE ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2);

// ---------------- CAMERA ----------------
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 5);

// ---------------- STATE ----------------
let hovered = null;
let countyData = {};

// ---------------- RENDERER ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('container').appendChild(renderer.domElement);

// ---------------- CONTROLS ----------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ---------------- LIGHTING ----------------
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
scene.add(dirLight);

// ---------------- LABEL ----------------
const label = document.getElementById('hover-label');

// ---------------- LOAD DATA ----------------
fetch('county-data.json')
  .then(res => res.json())
  .then(data => countyData = data);

// ---------------- RAYCASTER ----------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ---------------- LOAD MODEL ----------------
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load(

  './nc-counties.glb',

  // SUCCESS
  (gltf) => {

    const model = gltf.scene;
    console.log('Model loaded');

    model.traverse((child) => {

      if (child.isMesh) {

        child.geometry.computeVertexNormals();

        child.material = new THREE.MeshStandardMaterial({
          color: 0x4a90e2,
          roughness: 0.8,
          metalness: 0.0,
          flatShading: false
        });

        child.castShadow = true;
        child.receiveShadow = true;

        const edges = new THREE.EdgesGeometry(child.geometry);

        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x111111 })
        );

        line.raycast = () => {};

        child.add(line);
      }

    });

    scene.add(model);

  },

  // PROGRESS
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },

  // ERROR
  (error) => {
    console.error('GLB failed to load:', error);
  }

);
// ---------------- CLICK (MODAL) ----------------
window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const hit of hits) {
    const obj = hit.object;
    if (obj.isMesh && obj.parent) {
      openModal(obj.name);
      break;
    }
  }
});

// ---------------- HOVER ----------------
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  let found = null;
  for (const hit of hits) {
    if (hit.object.isMesh && hit.object.material) {
      found = hit.object;
      break;
    }
  }
  if (hovered && hovered !== found) {
    hovered.material.emissive.setHex(0x000000);
  }
  hovered = found;
  if (hovered) {
    hovered.material.emissive.setHex(0xe5e6bd);
    hovered.material.emissiveIntensity = 0.4;
    label.style.display = 'block';
    label.innerText = hovered.name || 'County';
    label.style.left = event.clientX + 'px';
    label.style.top = event.clientY + 'px';
  } else {
    label.style.display = 'none';
  }
});

// ---------------- MODAL ----------------
function openModal(name) {

  const data = countyData[name];

  document.getElementById('modal').classList.remove('hidden');

  document.getElementById('county-title').innerText = name;

  if (!data) {
    document.getElementById('county-description').innerHTML =
      'No data available';
    return;
  }

  document.getElementById('county-description').innerHTML = `

    <div style="text-align:center;">

      <img
        src="${data.picture}"
        alt="${data.contactName}"
        style="
          width:120px;
          height:120px;
          object-fit:cover;
          border-radius:50%;
          margin-bottom:15px;
        "
      >

      <p>${data.description}</p>

      <hr style="margin:15px 0;">

      <p>
        <strong>${data.contactName}</strong>
      </p>

      <p>
        <a href="mailto:${data.email}">
          ${data.email}
        </a>
      </p>

      <p>
        <a href="tel:${data.phone}">
          ${data.phone}
        </a>
      </p>

    </div>

  `;
}
// ---------------- CLOSE MODAL ----------------
document.getElementById('close-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('modal').classList.add('hidden');
});

// ---------------- RESIZE ----------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- ANIMATE ----------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
