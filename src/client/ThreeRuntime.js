import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.dispatchEvent(new CustomEvent('versebattles:three-ready', {
    detail: { revision: THREE.REVISION }
}));
