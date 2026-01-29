import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class AnimationManager {
    constructor(engine) {
        this.engine = engine;
        this.cache = new Map();

        // Loaders
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(dracoLoader);
        this.fbxLoader = new FBXLoader();
    }

    async preloadAnimations(characters) {
        if (!characters || !Array.isArray(characters)) return;

        console.log(`[ANIM] Starting preload for ${characters.length} characters`);

        const allAnims = characters.reduce((acc, char) => {
            const data = this.engine.store.state.game.characters.find(c => c.id === char.id) || char;
            if (data.animations) {
                acc.push(...data.animations);
            }
            return acc;
        }, []);

        // Filter unique by URL
        const uniqueAnims = [];
        const seenUrls = new Set();

        for (const anim of allAnims) {
            const url = this.getAnimationUrl(anim);
            if (url && !seenUrls.has(url) && !this.cache.has(url)) {
                seenUrls.add(url);
                uniqueAnims.push({ url, anim });
            }
        }

        if (uniqueAnims.length === 0) {
            console.log(`[ANIM] No new unique animations to preload.`);
            return;
        }

        console.log(`[ANIM] Resolved ${uniqueAnims.length} unique animation URLs to preload.`);

        await Promise.all(uniqueAnims.map(async ({ url, anim }) => {
            try {
                const clip = await this.loadAnimationClip(url);
                if (clip) {
                    this.cache.set(url, clip);
                    console.log(`[ANIM] [OK] Cached: ${anim.name}`);
                }
            } catch (e) {
                console.warn(`[ANIM] [FAIL] Preload failed for ${anim.name} (${url}):`, e);
            }
        }));
    }

    async getClip(animData) {
        const url = this.getAnimationUrl(animData);
        if (!url) return null;

        let clip = this.cache.get(url);
        if (!clip) {
            try {
                clip = await this.loadAnimationClip(url);
                this.cache.set(url, clip);
            } catch (e) {
                console.warn(`[ANIM] Failed to load clip: ${animData.name}`, e);
                return null;
            }
        }

        // Clone to ensure filtering doesn't affect the cached source if needed, 
        // though finger filtering is generally global for this project.
        return clip;
    }

    async loadAnimationClip(url) {
        const ext = url.split('.').pop().toLowerCase();
        let clip = null;

        if (ext === 'fbx') {
            const group = await this.fbxLoader.loadAsync(url);
            clip = group.animations && group.animations.length > 0 ? group.animations[0] : null;
        } else {
            const gltf = await this.gltfLoader.loadAsync(url);
            clip = gltf.animations && gltf.animations.length > 0 ? gltf.animations[0] : null;
        }

        if (clip) {
            this.filterFingerTracks(clip);
        }
        return clip;
    }

    getAnimationUrl(anim) {
        if (!anim) return null;

        const storeAnims = this.engine.store.state.game.animations || [];
        const animationId = anim.animation_id || anim.id;
        const fullAnim = storeAnims.find(a => a.id === animationId) || anim;

        if (fullAnim.model_url) {
            return fullAnim.model_url.startsWith('http') ? fullAnim.model_url : `/storage/${fullAnim.model_url}`;
        }

        if (fullAnim.media && fullAnim.media.length > 0) {
            let media = fullAnim.media.find(m => m.type === '3d');
            if (!media) {
                media = fullAnim.media.find(m => {
                    const ext = m.filepad?.split('.').pop().toLowerCase();
                    return ['glb', 'fbx'].includes(ext);
                });
            }
            if (media) {
                const file = media.filepad;
                return file.startsWith('http') ? file : `/storage/${file}`;
            }
        }

        const file = fullAnim.threefile || fullAnim.filepad;
        if (file) {
            return file.startsWith('http') ? file : `/storage/${file}`;
        }

        return null;
    }

    filterFingerTracks(clip) {
        const fingerStrings = ['finger', 'thumb', 'index', 'middle', 'ring', 'pinky'];
        clip.tracks = clip.tracks.filter(track => {
            const lower = track.name.toLowerCase();
            return !fingerStrings.some(f => lower.includes(f));
        });
    }
}
