import * as THREE from 'https://esm.sh/three@0.165.0';

import { OrbitControls } from 'https://esm.sh/three@0.165.0/examples/jsm/controls/OrbitControls';

import { GLTFLoader } from 'https://esm.sh/three@0.165.0/examples/jsm/loaders/GLTFLoader';


// ---------------- SCENE ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2);


// ---------------- CAMERA ----------------
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);


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
const loader = new GLTFLoader();

loader.load('nc-counties.glb', (gltf) => {

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

      // OUTLINE (still visible but NOT raycast-targeted)
      const edges = new THREE.EdgesGeometry(child.geometry);

      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x111111 })
      );

      line.raycast = () => {}; // 👈 prevents outline from interfering

      child.add(line);
    }
  });

  // ---------------- CENTER MODEL ----------------
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  model.position.sub(center);

  // ---------------- CAMERA (45° VIEW) ----------------
  const distance = Math.max(size.x, size.y, size.z) * 1.2;

  camera.position.set(distance, distance * 0.8, distance);
  controls.target.set(0, 0, 0);
  controls.update();

  scene.add(model);

});


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

  // reset previous hover
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

  const modal = document.getElementById('modal');

  modal.classList.remove('hidden');

  document.getElementById('county-title').innerText = name;

  document.getElementById('county-description').innerText =
    countyData[name]?.description || "No data available";
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