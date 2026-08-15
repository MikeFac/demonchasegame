import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.cloneThreeSkeleton = cloneSkeleton;
window.dispatchEvent(new CustomEvent('versebattles:three-ready', {
    detail: { revision: THREE.REVISION }
}));
