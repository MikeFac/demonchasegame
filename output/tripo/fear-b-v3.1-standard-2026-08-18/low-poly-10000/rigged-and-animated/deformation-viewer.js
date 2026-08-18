import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const roles = ['idle', 'walk', 'attack', 'hit', 'death'];
const roleClipNames = {
    idle: ['preset:idle', 'preset:biped:idle'],
    walk: ['preset:walk', 'preset:biped:walk'],
    attack: ['preset:slash', 'preset:biped:box_01'],
    hit: ['preset:hurt', 'preset:biped:hurt'],
    death: ['preset:fall', 'preset:biped:defeat_02']
};
const params = new URLSearchParams(location.search);
const sourceOverride = params.get('source');
let roleIndex = Math.max(0, roles.indexOf(params.get('clip') || 'idle'));
let normalizedTime = Math.min(1, Math.max(0, Number(params.get('time') || 0)));
let model = null;
let mixer = null;
let clip = null;
let loadError = null;
let stats = null;

const status = document.querySelector('#status');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x252b38);
scene.fog = new THREE.Fog(0x252b38, 16, 34);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 100);
camera.position.set(4.4, 2.9, 6.7);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.3, 0);
controls.enableDamping = false;
controls.update();

scene.add(new THREE.HemisphereLight(0xcad9ff, 0x321f1c, 2.2));
const key = new THREE.DirectionalLight(0xffeee0, 3.4);
key.position.set(4, 7, 5);
key.castShadow = true;
scene.add(key);
const rim = new THREE.DirectionalLight(0xa873ff, 2.0);
rim.position.set(-4, 3, -5);
scene.add(rim);

const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x252226, roughness: 0.9, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(9, 18, 0x697386, 0x414958);
grid.position.y = 0.002;
scene.add(grid);

function currentRole() {
    return roles[roleIndex];
}

function animationUrl() {
    return sourceOverride || `./animations/${currentRole()}.glb`;
}

function countScene(root) {
    const data = { meshes: 0, skinnedMeshes: 0, bones: 0, uniqueJoints: 0, materials: 0 };
    const materials = new Set();
    const joints = new Set();
    root.traverse((node) => {
        if (node.isMesh) data.meshes += 1;
        if (node.isSkinnedMesh) {
            data.skinnedMeshes += 1;
            for (const bone of node.skeleton?.bones || []) joints.add(bone.uuid);
        }
        if (node.isBone) data.bones += 1;
        const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of nodeMaterials) if (material) materials.add(material.uuid);
    });
    data.uniqueJoints = joints.size;
    data.materials = materials.size;
    return data;
}

function boundsData() {
    if (!model) return null;
    const box = new THREE.Box3().setFromObject(model, true);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return {
        min: box.min.toArray().map((n) => Number(n.toFixed(3))),
        max: box.max.toArray().map((n) => Number(n.toFixed(3))),
        size: size.toArray().map((n) => Number(n.toFixed(3))),
        center: center.toArray().map((n) => Number(n.toFixed(3)))
    };
}

function updatePose() {
    if (mixer && clip) {
        mixer.setTime(normalizedTime * clip.duration);
        scene.updateMatrixWorld(true);
    }
    renderer.render(scene, camera);
    const time = clip ? normalizedTime * clip.duration : 0;
    status.textContent = loadError
        ? `FAILED: ${loadError}`
        : `${clip ? currentRole().toUpperCase() : 'STATIC SOURCE'} · ${(normalizedTime * 100).toFixed(0)}% · ${time.toFixed(2)}s / ${(clip?.duration || 0).toFixed(2)}s\n${stats ? `${stats.skinnedMeshes} skinned mesh · ${stats.uniqueJoints} joints · ${stats.bones} bones` : 'Loading…'}`;
    status.classList.toggle('error', Boolean(loadError));
}

async function loadRole() {
    loadError = null;
    stats = null;
    status.textContent = `Loading ${currentRole()}…`;
    if (model) {
        scene.remove(model);
        model = null;
    }
    mixer = null;
    clip = null;
    try {
        const gltf = await new GLTFLoader().loadAsync(animationUrl());
        model = gltf.scene;
        const expectedNames = roleClipNames[currentRole()] || [];
        clip = gltf.animations.find((candidate) => expectedNames.includes(candidate.name))
            || gltf.animations[roleIndex]
            || gltf.animations[0]
            || null;
        if (!clip && !sourceOverride) throw new Error('GLB contains no animation clip');
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        const initial = new THREE.Box3().setFromObject(model, true);
        const size = initial.getSize(new THREE.Vector3());
        const center = initial.getCenter(new THREE.Vector3());
        const scale = 2.8 / Math.max(size.y, 0.001);
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -initial.min.y * scale, -center.z * scale);
        scene.add(model);
        if (clip) {
            mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
        }
        stats = countScene(model);
        updatePose();
    } catch (error) {
        loadError = error.message;
        updatePose();
        console.error(error);
    }
}

window.render_game_to_text = () => JSON.stringify({
    coordinateSystem: 'right-handed; Y up; model feet normalized to y=0',
    status: loadError ? 'error' : (model ? 'ready' : 'loading'),
    role: currentRole(),
    source: animationUrl(),
    normalizedTime: Number(normalizedTime.toFixed(3)),
    animation: clip ? {
        name: clip.name,
        duration: Number(clip.duration.toFixed(4)),
        tracks: clip.tracks.length
    } : null,
    scene: stats,
    bounds: boundsData(),
    error: loadError
});

window.advanceTime = async (milliseconds) => {
    if (clip) normalizedTime = (normalizedTime + milliseconds / (clip.duration * 1000)) % 1;
    updatePose();
};

addEventListener('keydown', async (event) => {
    if (event.code === 'ArrowRight') normalizedTime = Math.min(1, normalizedTime + 0.25);
    if (event.code === 'ArrowLeft') normalizedTime = Math.max(0, normalizedTime - 0.25);
    if (event.code === 'ArrowUp') {
        roleIndex = (roleIndex + 1) % roles.length;
        normalizedTime = 0;
        await loadRole();
    }
    if (event.code === 'ArrowDown') {
        roleIndex = (roleIndex + roles.length - 1) % roles.length;
        normalizedTime = 0;
        await loadRole();
    }
    updatePose();
});

addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    updatePose();
});

loadRole();
