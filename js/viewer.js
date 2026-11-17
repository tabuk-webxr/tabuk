/**
 * Three.js WebXR Panoramic Engine
 * Features:
 * - 360-degree equirectangular panorama sphere
 * - Drag/touch look controls with dampening
 * - DeviceOrientation / Gyroscope toggle
 * - WebXR VR session support (Meta Quest, Vision Pro, Cardboard)
 * - 3D spherical coordinates (pitch/yaw) to 2D screen projection
 * - Smooth texture transition animations
 */

class PanoramaViewer {
    constructor(canvasContainerId) {
        this.container = document.getElementById(canvasContainerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.sphere = null;
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = (typeof THREE !== 'undefined' && THREE.GLTFLoader)
            ? new THREE.GLTFLoader()
            : null;
        this._avatarClock = new THREE.Clock();
        // Mouth animation for the Welcome Guide's narration (clip + TTS)
        this.lipsync = window.AvatarLipSync ? new window.AvatarLipSync(this) : null;
        this.gestures = window.AvatarGestures ? new window.AvatarGestures(this) : null;
        this.activeVideo = null;
        this.activeVideoTexture = null;
        
        // Angles in degrees
        this.pitch = 0;
        this.yaw = 0;
        this.targetPitch = 0;
        this.targetYaw = 0;
        this.minFov = 28;  // max zoom
        this.maxFov = 95;
        this.fov = 75;
        this.targetFov = 75;

        // Interaction state
        this.isUserInteracting = false;
        this._lookMoved = false;
        this.onPointerDownPointerX = 0;
        this.onPointerDownPointerY = 0;
        this.onPointerDownYaw = 0;
        this.onPointerDownPitch = 0;

        // Gyroscope
        this.gyroEnabled = false;
        this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.hasGyroSupport = window.DeviceOrientationEvent !== undefined;

        this.onSceneRendered = null;
        this._transitioning = false;
        this._cameraAnimRaf = null;
        this._sceneAvatars = [];
        this._screenOverlays = [];
        this._raycaster = new THREE.Raycaster();
        this._pointerNdc = new THREE.Vector2();
        this.avatarDragEnabled = false;
        this._avatarDragId = null;
        this.onAvatarDrag = null;     // (id, pitch, yaw) while dragging
        this.onAvatarDragEnd = null;  // (id, pitch, yaw) on release
        this.init();
    }

    init() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(this.fov, width / height, 1, 1100);
        this.camera.target = new THREE.Vector3(0, 0, 0);

        // Geometry (Inverted sphere for interior 360 view)
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1);

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });

        this.sphere = new THREE.Mesh(geometry, material);
        this.sphereRotationY = 0;
        this.scene.add(this.sphere);

        // Soft lights for cloth/shoes only (skin stays MeshBasic / unlit)
        this.avatarAmbient = new THREE.AmbientLight(0xfff6ee, 0.45);
        this.avatarHemi = new THREE.HemisphereLight(0xfff2e4, 0x2c3544, 0.55);
        this.avatarKeyLight = new THREE.DirectionalLight(0xfff5e8, 0.95);
        this.avatarKeyLight.position.set(0.25, 1.8, 0.9);
        this.avatarFillLight = new THREE.DirectionalLight(0xe8f0ff, 0.28);
        this.avatarFillLight.position.set(-0.55, 0.6, -0.35);
        this.scene.add(this.avatarAmbient);
        this.scene.add(this.avatarHemi);
        this.scene.add(this.avatarKeyLight);
        this.scene.add(this.avatarFillLight);
        this.scene.add(this.avatarKeyLight.target);
        this.scene.add(this.avatarFillLight.target);

        // WebGL Renderer — original video colors, no tone-mapping darkening
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x000000, 1);
        if ('toneMapping' in this.renderer && THREE.NoToneMapping !== undefined) {
            this.renderer.toneMapping = THREE.NoToneMapping;
        }
        
        // WebXR support
        if ('xr' in navigator) {
            this.renderer.xr.enabled = true;
        }

        this.container.appendChild(this.renderer.domElement);

        // Event listeners
        this.bindEvents();

        // Start render loop
        this.animate = this.animate.bind(this);
        this.renderer.setAnimationLoop(this.animate);
    }

    stopVideo() {
        if (this.activeVideo) {
            this.activeVideo.pause();
            this.activeVideo.removeAttribute('src');
            this.activeVideo.load();
            this.activeVideo = null;
        }
        if (this.activeVideoTexture) {
            this.activeVideoTexture.dispose();
            this.activeVideoTexture = null;
        }
    }

    isTransitioning() {
        return !!this._transitioning;
    }

    _easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    _easeInCubic(t) {
        return t * t * t;
    }

    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    _cancelCameraAnim() {
        if (this._cameraAnimRaf) {
            cancelAnimationFrame(this._cameraAnimRaf);
            this._cameraAnimRaf = null;
        }
    }

    _setSphereScale(scale) {
        const s = Math.max(0.85, Number(scale) || 1);
        this.sphere.scale.set(s, s, s);
    }

    /**
     * Smoothly animate look direction + FOV (+ optional sphere scale for forward rush).
     */
    animateCamera({ pitch, yaw, fov, sphereScale, duration = 700, easing = 'inOut' } = {}) {
        this._cancelCameraAnim();

        const easeFn = easing === 'in'
            ? this._easeInCubic.bind(this)
            : easing === 'out'
                ? this._easeOutCubic.bind(this)
                : this._easeInOutCubic.bind(this);

        const startPitch = this.targetPitch;
        const startYaw = this.targetYaw;
        const startFov = this.camera.fov;
        const startScale = this.sphere.scale.x || 1;
        const endPitch = typeof pitch === 'number' ? pitch : startPitch;
        const endYaw = typeof yaw === 'number' ? yaw : startYaw;
        const endFov = typeof fov === 'number'
            ? Math.max(this.minFov, Math.min(this.maxFov, fov))
            : startFov;
        const endScale = typeof sphereScale === 'number' ? sphereScale : startScale;

        // Shortest yaw path
        let deltaYaw = endYaw - startYaw;
        while (deltaYaw > 180) deltaYaw -= 360;
        while (deltaYaw < -180) deltaYaw += 360;

        return new Promise((resolve) => {
            if (duration <= 0) {
                this.setLookAt(endPitch, endYaw);
                this.setFov(endFov, true);
                this._setSphereScale(endScale);
                resolve();
                return;
            }

            const startTime = performance.now();
            const step = (now) => {
                const t = Math.min(1, (now - startTime) / duration);
                const e = easeFn(t);
                this.targetPitch = startPitch + (endPitch - startPitch) * e;
                this.targetYaw = startYaw + deltaYaw * e;
                this.pitch = this.targetPitch;
                this.yaw = this.targetYaw;
                const nextFov = startFov + (endFov - startFov) * e;
                this.fov = nextFov;
                this.targetFov = nextFov;
                this.camera.fov = nextFov;
                this.camera.updateProjectionMatrix();
                this._setSphereScale(startScale + (endScale - startScale) * e);

                if (t < 1) {
                    this._cameraAnimRaf = requestAnimationFrame(step);
                } else {
                    this._cameraAnimRaf = null;
                    this.setLookAt(endPitch, endYaw);
                    this.setFov(endFov, true);
                    this._setSphereScale(endScale);
                    resolve();
                }
            };
            this._cameraAnimRaf = requestAnimationFrame(step);
        });
    }

    _resolveMediaUrl(url) {
        // GLB: keep path for GLTFLoader (no blob:). Preserve ?v= cache-bust query.
        const raw = String(url || '');
        const bare = raw.split('?')[0];
        if (/\.glb$/i.test(bare) || /\.gltf$/i.test(bare)) return raw;
        return (window.app && window.app.assets) ? window.app.assets.getUrl(url) : url;
    }

    _disposeCurrentMap(keepVideoTexture = false) {
        const map = this.sphere.material.map;
        if (!map) return;
        if (keepVideoTexture && map === this.activeVideoTexture) return;
        if (map !== this.activeVideoTexture) {
            map.dispose();
        }
    }

    _applyTexture(texture, { opacity = 1, keepOldMedia = false } = {}) {
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        if (!keepOldMedia) {
            this.stopVideo();
            this._disposeCurrentMap();
        }
        this.sphere.material.map = texture;
        this.sphere.material.color.setHex(0xffffff);
        this.sphere.material.transparent = opacity < 1;
        this.sphere.material.opacity = opacity;
        this.sphere.material.depthWrite = opacity >= 1;
        this.sphere.material.needsUpdate = true;
    }

    _applyVideo(video, { opacity = 1, keepOldMedia = false } = {}) {
        if (!keepOldMedia) {
            if (this.sphere.material.map && this.sphere.material.map !== this.activeVideoTexture) {
                this.sphere.material.map.dispose();
            }
            if (this.activeVideo && this.activeVideo !== video) {
                this.activeVideo.pause();
                this.activeVideo.removeAttribute('src');
                this.activeVideo.load();
            }
            if (this.activeVideoTexture) {
                this.activeVideoTexture.dispose();
                this.activeVideoTexture = null;
            }
        }

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        this.activeVideo = video;
        this.activeVideoTexture = texture;
        this.sphere.material.map = texture;
        this.sphere.material.color.setHex(0xffffff);
        this.sphere.material.transparent = opacity < 1;
        this.sphere.material.opacity = opacity;
        this.sphere.material.depthWrite = opacity >= 1;
        this.sphere.material.needsUpdate = true;

        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err) => console.warn('360 video autoplay blocked:', err));
        }
    }

    _animateMaterialOpacity(from, to, duration, easing = 'inOut') {
        const easeFn = easing === 'in'
            ? this._easeInCubic.bind(this)
            : easing === 'out'
                ? this._easeOutCubic.bind(this)
                : this._easeInOutCubic.bind(this);

        return new Promise((resolve) => {
            this.sphere.material.transparent = true;
            this.sphere.material.depthWrite = false;
            this.sphere.material.opacity = from;

            if (duration <= 0) {
                this.sphere.material.opacity = to;
                this.sphere.material.transparent = to < 1;
                this.sphere.material.depthWrite = to >= 1;
                resolve();
                return;
            }

            const start = performance.now();
            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const e = easeFn(t);
                const op = from + (to - from) * e;
                this.sphere.material.opacity = op;
                this.sphere.material.transparent = op < 1;
                this.sphere.material.depthWrite = op >= 1;
                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    this.sphere.material.opacity = to;
                    this.sphere.material.transparent = to < 1;
                    this.sphere.material.depthWrite = to >= 1;
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    /**
     * Transparent merge dissolve: both panoramas overlap and blend together (never black).
     */
    async dissolveToMedia({
        mediaType = 'video',
        media,
        sphereYaw = 0,
        duration = 750,
        targetPitch = null,
        targetYaw = null,
        targetFov = null,
        resetScale = false
    } = {}) {
        if (!media) return;

        const oldVideo = this.activeVideo;
        const oldVideoTexture = this.activeVideoTexture;
        const oldMap = this.sphere.material.map;

        // Outgoing layer stays transparent so the next scene can show through
        const outMat = new THREE.MeshBasicMaterial({
            map: oldMap || null,
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            depthTest: false,
            blending: THREE.NormalBlending,
            side: THREE.FrontSide
        });
        const outgoing = new THREE.Mesh(this.sphere.geometry, outMat);
        outgoing.rotation.copy(this.sphere.rotation);
        outgoing.scale.copy(this.sphere.scale);
        outgoing.renderOrder = 2;
        this.scene.add(outgoing);

        // Incoming starts slightly visible so merge begins immediately
        if (resetScale) this._setSphereScale(1);
        this.setSphereRotationY(sphereYaw || 0);
        if (typeof targetPitch === 'number' && typeof targetYaw === 'number') {
            this.setLookAt(targetPitch, targetYaw);
        }
        if (typeof targetFov === 'number') {
            this.setFov(targetFov, true);
        }
        this.sphere.renderOrder = 1;
        if (mediaType === 'video') {
            this._applyVideo(media, { opacity: 0.15, keepOldMedia: true });
        } else {
            this._applyTexture(media, { opacity: 0.15, keepOldMedia: true });
        }
        this.sphere.material.transparent = true;
        this.sphere.material.depthWrite = false;
        this.sphere.material.depthTest = false;
        this.sphere.material.blending = THREE.NormalBlending;
        this.sphere.material.needsUpdate = true;

        const start = performance.now();
        await new Promise((resolve) => {
            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                // Soft merge curves: both stay transparent & overlapping through the middle
                const fadeOut = Math.cos(t * Math.PI * 0.5);          // 1 → 0
                const fadeIn = 0.15 + 0.85 * Math.sin(t * Math.PI * 0.5); // 0.15 → 1
                outMat.opacity = fadeOut;
                this.sphere.material.opacity = fadeIn;
                this.sphere.material.transparent = true;
                this.sphere.material.depthWrite = false;
                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });

        this.scene.remove(outgoing);
        outMat.map = null;
        outMat.dispose();

        if (oldVideo && oldVideo !== this.activeVideo) {
            oldVideo.pause();
            oldVideo.removeAttribute('src');
            oldVideo.load();
        }
        if (oldVideoTexture && oldVideoTexture !== this.activeVideoTexture) {
            oldVideoTexture.dispose();
        } else if (oldMap && oldMap !== this.activeVideoTexture && oldMap !== this.sphere.material.map) {
            oldMap.dispose();
        }

        this.sphere.material.opacity = 1;
        this.sphere.material.transparent = false;
        this.sphere.material.depthWrite = true;
        this.sphere.material.depthTest = true;
        this.sphere.material.needsUpdate = true;
    }

    preloadVideo(videoUrl, options = {}) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = this._resolveMediaUrl(videoUrl);
            video.crossOrigin = 'anonymous';
            // Ambient 360 loops by default; one-shot transitions set loop: false
            video.loop = options.loop !== false;
            video.muted = options.muted !== false;
            video.playsInline = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.preload = 'auto';

            const onReady = () => {
                video.removeEventListener('loadeddata', onReady);
                video.removeEventListener('error', onError);
                resolve(video);
            };
            const onError = () => {
                video.removeEventListener('loadeddata', onReady);
                video.removeEventListener('error', onError);
                reject(new Error('Error loading 360 video: ' + videoUrl));
            };

            video.addEventListener('loadeddata', onReady);
            video.addEventListener('error', onError);
            video.load();
        });
    }

    preloadTexture(imageUrl) {
        const resolved = this._resolveMediaUrl(imageUrl);
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                resolved,
                (texture) => resolve(texture),
                undefined,
                (err) => reject(err || new Error('Error loading texture: ' + imageUrl))
            );
        });
    }

    _removeFreezeOverlay() {
        if (this._freezeOverlay && this._freezeOverlay.parentNode) {
            this._freezeOverlay.parentNode.removeChild(this._freezeOverlay);
        }
        this._freezeOverlay = null;
    }

    _captureFreezeOverlay() {
        this._removeFreezeOverlay();
        // Force one render so the freeze frame matches the zoomed current view
        this.renderer.render(this.scene, this.camera);
        const dataUrl = this.renderer.domElement.toDataURL('image/jpeg', 0.92);
        const img = document.createElement('img');
        img.className = 'scene-freeze-overlay';
        img.alt = '';
        img.src = dataUrl;
        img.setAttribute('aria-hidden', 'true');
        // Sit above the WebGL canvas, below hotspots/HUD when those are cleared
        this.container.appendChild(img);
        this._freezeOverlay = img;
        return img;
    }

    _fadeFreezeOverlay(duration = 500, { continueZoom = true, peakScale = 1.22 } = {}) {
        const img = this._freezeOverlay;
        if (!img) return Promise.resolve();

        return new Promise((resolve) => {
            const start = performance.now();
            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                // Start transparenting immediately from click; ease out near the end
                const fadeE = this._easeInCubic(t);
                const zoomE = this._easeOutCubic(t);
                img.style.opacity = String(1 - fadeE);
                if (continueZoom) {
                    img.style.transform = `scale(${1 + (peakScale - 1) * zoomE})`;
                }
                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    this._removeFreezeOverlay();
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    /**
     * Portal transition:
     * On hotspot click → current view starts transparent + zooms forward immediately.
     * Next scene is set up still underneath; it never moves.
     */
    async transitionForward({
        mediaType = 'video',
        url,
        lookPitch,
        lookYaw,
        targetPitch = 0,
        targetYaw = 0,
        targetFov = 75,
        sphereYaw = 0,
        duration = 800,
        onSwapped = null
    } = {}) {
        if (this._transitioning) return;
        this._transitioning = true;

        try {
            // Look toward the hotspot instantly so the freeze matches the click target
            if (typeof lookPitch === 'number' && typeof lookYaw === 'number') {
                this.setLookAt(lookPitch, lookYaw);
                this.pitch = lookPitch;
                this.yaw = lookYaw;
            }

            // Transparent starts from the click — freeze current frame and begin fade+zoom now
            this._captureFreezeOverlay();
            const fadePromise = this._fadeFreezeOverlay(duration, { continueZoom: true, peakScale: 1.28 });

            const preloadPromise = mediaType === 'video'
                ? this.preloadVideo(url)
                : this.preloadTexture(url);

            let media = null;
            try {
                media = await preloadPromise;
            } catch (err) {
                console.error(err);
            }

            // Setup next scene still under the fading freeze (no movement on next)
            this._setSphereScale(1);
            this.setSphereRotationY(sphereYaw || 0);
            this.setLookAt(targetPitch, targetYaw);
            this.setFov(targetFov, true);
            this.pitch = targetPitch;
            this.yaw = targetYaw;
            this.targetPitch = targetPitch;
            this.targetYaw = targetYaw;
            this.fov = targetFov;
            this.targetFov = targetFov;
            this.camera.fov = targetFov;
            this.camera.updateProjectionMatrix();

            if (media) {
                if (mediaType === 'video') {
                    this._applyVideo(media, { opacity: 1 });
                } else {
                    this._applyTexture(media, { opacity: 1 });
                }
            }
            this.sphere.material.transparent = false;
            this.sphere.material.opacity = 1;
            this.sphere.material.depthWrite = true;
            this.sphere.material.depthTest = true;
            this.sphere.material.needsUpdate = true;
            this.renderer.render(this.scene, this.camera);

            if (typeof onSwapped === 'function') onSwapped();

            // Wait until click-started transparent fade finishes
            await fadePromise;
        } finally {
            this._removeFreezeOverlay();
            this._setSphereScale(1);
            this.sphere.material.opacity = 1;
            this.sphere.material.transparent = false;
            this.sphere.material.depthWrite = true;
            this.sphere.material.depthTest = true;
            this._transitioning = false;
        }
    }

    loadTexture(imageUrl, onComplete, options = {}) {
        const sphereYaw = typeof options.sphereYaw === 'number' ? options.sphereYaw : this.sphereRotationY;
        const targetPitch = typeof options.targetPitch === 'number' ? options.targetPitch : null;
        const targetYaw = typeof options.targetYaw === 'number' ? options.targetYaw : null;
        const targetFov = typeof options.targetFov === 'number' ? options.targetFov : null;

        this.preloadTexture(imageUrl)
            .then(async (texture) => {
                await this.dissolveToMedia({
                    mediaType: 'image',
                    media: texture,
                    sphereYaw,
                    targetPitch,
                    targetYaw,
                    targetFov,
                    duration: 550
                });
                if (onComplete) onComplete();
            })
            .catch((err) => {
                console.error("Error loading texture:", imageUrl, err);
                this.sphere.material.opacity = 1;
                if (onComplete) onComplete();
            });
    }

    setSphereRotationY(degrees) {
        this.sphereRotationY = ((Number(degrees) % 360) + 360) % 360;
        this.sphere.rotation.y = THREE.MathUtils.degToRad(this.sphereRotationY);
    }

    /**
     * Stick avatar images onto the 360 sphere (true 3D — moves with look like gum on glass).
     * Parent to sphere so sphereYaw keeps them glued to the panorama.
     */
    _disposeSceneAvatar(entry) {
        if (!entry) return;
        if (entry.mixer) {
            try { entry.mixer.stopAllAction(); } catch (e) { /* ignore */ }
            entry.mixer = null;
        }
        if (entry.mesh && entry.mesh.parent) {
            entry.mesh.parent.remove(entry.mesh);
        }
        if (entry.mesh) {
            entry.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                const mats = child.material
                    ? (Array.isArray(child.material) ? child.material : [child.material])
                    : [];
                mats.forEach((mat) => {
                    if (!mat) return;
                    if (mat.map) mat.map.dispose();
                    mat.dispose();
                });
            });
        }
    }

    clearSceneAvatars() {
        (this._sceneAvatars || []).forEach((entry) => this._disposeSceneAvatar(entry));
        this._sceneAvatars = [];
    }

    /** Placement/appearance fingerprint — identical → the live avatar can be kept as is. */
    _avatarSignature(h) {
        return JSON.stringify([
            h.type, h.model || null, h.image || null, h.glue || null, h.anchor || null,
            h.pitch, h.yaw, h.radius, h.worldHeight, h.worldWidth, h.modelScale,
            h.worldRot, h.worldRotX, h.worldRotZ, h.offsetY, !!h.flipX
        ]);
    }

    /**
     * Diff-based sync: avatars whose data did not change are KEPT (no dispose / GLB
     * reload / idle restart), so unlocking hotspots mid-narration doesn't make the
     * guide vanish, T-pose or snap back to frame 0 of his animation.
     */
    syncSceneAvatars(hotspotList = []) {
        const wanted = (hotspotList || []).filter((h) => h && !h.hidden
            && (h.type === 'avatar' || (h.glue && h.image)));
        const existing = this._sceneAvatars || [];
        const kept = new Set();
        const toAdd = [];

        wanted.forEach((h) => {
            const sig = this._avatarSignature(h);
            const match = existing.find((e) => !kept.has(e) && e.id === h.id && e.sig === sig);
            if (match) {
                kept.add(match);
                if (match.mesh) match.mesh.visible = match.isModel ? (!!match.modelRoot && !h.hidden) : !h.hidden;
            } else {
                toAdd.push({ h, sig });
            }
        });

        existing.forEach((e) => { if (!kept.has(e)) this._disposeSceneAvatar(e); });
        this._sceneAvatars = existing.filter((e) => kept.has(e));

        toAdd.forEach(({ h, sig }) => {
            const entry = this.addSceneAvatar(h);
            if (entry) entry.sig = sig;
        });
        // Rebuilt avatar → ease gestures in instead of popping to full pose
        if (toAdd.length && this.gestures && this.gestures.resetBlend) this.gestures.resetBlend();
    }

    addSceneAvatar(data) {
        const entry = this._addSceneAvatarImpl(data);
        if (entry && data) entry.sig = this._avatarSignature(data);
        return entry;
    }

    _addSceneAvatarImpl(data) {
        if (!data || !this.scene || !window.THREE) return null;

        const modelUrl = data.model
            ? this._resolveMediaUrl(data.model)
            : null;
        if (modelUrl) {
            return this._addSceneAvatarModel(data, modelUrl);
        }

        const imageUrl = this._resolveMediaUrl(data.image || 'assets/images/welcome_tip_avatar.png');
        const pitch = typeof data.pitch === 'number' ? data.pitch : 0;
        const yaw = typeof data.yaw === 'number' ? data.yaw : 0;
        const radius = typeof data.radius === 'number' ? data.radius : 430;
        const isGluedProp = !!data.glue && data.type !== 'avatar';
        // Tall full-body plate; aspect ~516×1458 — monitors use landscape worldWidth
        const height = typeof data.worldHeight === 'number'
            ? data.worldHeight
            : (isGluedProp ? 72 : 150);
        const width = typeof data.worldWidth === 'number'
            ? data.worldWidth
            : (isGluedProp ? height * 1.376 : height * 0.35);

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            alphaTest: 0.05,
            depthWrite: false,
            // Must not depth-test against the panorama sphere or the plate vanishes
            depthTest: false,
            side: THREE.DoubleSide,
            opacity: 1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = isGluedProp ? 9 : 10;
        mesh.frustumCulled = false;
        mesh.visible = !data.hidden;
        mesh.name = `scene-avatar-${data.id || 'unknown'}`;

        const entry = {
            id: data.id,
            pitch,
            yaw,
            radius,
            height,
            width,
            isModel: false,
            // Monitors / props: center on pitch/yaw. Avatars: feet on mark.
            anchor: data.anchor || (isGluedProp ? 'center' : 'feet'),
            worldRot: typeof data.worldRot === 'number' ? data.worldRot : 0,
            flipX: !!data.flipX,
            mesh
        };

        // World space (same pitch/yaw as hotspots) — sticks in the 360 view
        this.scene.add(mesh);
        this._placeSceneAvatar(entry);
        this._sceneAvatars.push(entry);

        this.textureLoader.load(
            imageUrl,
            (texture) => {
                // Keep original PNG colors (same path as 360 video — no sRGB re-encode tint)
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                if (THREE.LinearEncoding !== undefined) {
                    texture.encoding = THREE.LinearEncoding;
                }
                if ('colorSpace' in texture && THREE.NoColorSpace !== undefined) {
                    texture.colorSpace = THREE.NoColorSpace;
                } else if ('colorSpace' in texture && THREE.LinearSRGBColorSpace !== undefined) {
                    texture.colorSpace = THREE.LinearSRGBColorSpace;
                }
                // Horizontal mirror for glued props (e.g. Level 2 kiosk)
                if (entry.flipX) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.repeat.x = -1;
                    texture.offset.x = 1;
                }
                material.color.set(0xffffff);
                material.map = texture;
                material.needsUpdate = true;
                mesh.visible = !data.hidden;
            },
            undefined,
            (err) => console.warn('Scene avatar texture failed:', imageUrl, err)
        );

        return entry;
    }

    _addSceneAvatarModel(data, modelUrl) {
        if (!this.gltfLoader) {
            console.warn('GLTFLoader missing — falling back to image avatar');
            if (data.image) {
                const fallback = { ...data, model: null };
                return this.addSceneAvatar(fallback);
            }
            return null;
        }

        const pitch = typeof data.pitch === 'number' ? data.pitch : 0;
        const yaw = typeof data.yaw === 'number' ? data.yaw : 0;
        const radius = typeof data.radius === 'number' ? data.radius : 430;
        const height = typeof data.worldHeight === 'number' ? data.worldHeight : 162;
        const width = typeof data.worldWidth === 'number' ? data.worldWidth : height * 0.4;

        const root = new THREE.Group();
        root.name = `scene-avatar-${data.id || 'model'}`;
        root.frustumCulled = false;
        root.visible = false;
        root.renderOrder = 10;
        // Root faces the camera (and carries the perspective width fix);
        // the pivot holds the avatar's own worldRot turn.
        const pivot = new THREE.Group();
        pivot.rotation.order = 'YXZ';
        root.add(pivot);

        const entry = {
            id: data.id,
            pitch,
            yaw,
            radius,
            height,
            width,
            isModel: true,
            // Ground = model feet sit on pitch/yaw mark (local y=0 after fit)
            anchor: data.anchor || 'ground',
            worldRot: typeof data.worldRot === 'number' ? data.worldRot : 0,
            worldRotX: typeof data.worldRotX === 'number' ? data.worldRotX : 0,
            worldRotZ: typeof data.worldRotZ === 'number' ? data.worldRotZ : 0,
            modelScale: typeof data.modelScale === 'number' ? data.modelScale : 1,
            offsetY: typeof data.offsetY === 'number' ? data.offsetY : 0,
            mesh: root,
            pivot,
            modelRoot: null,
            mixer: null,
            baseModelHeight: 1
        };

        this.scene.add(root);
        this._placeSceneAvatar(entry);
        this._sceneAvatars.push(entry);

        this.gltfLoader.load(
            modelUrl,
            (gltf) => {
                // Drop if this avatar was cleared while loading
                if (!(this._sceneAvatars || []).includes(entry)) {
                    if (gltf.scene && gltf.scene.parent) gltf.scene.parent.remove(gltf.scene);
                    return;
                }
                const model = gltf.scene || gltf.scenes?.[0];
                if (!model) {
                    console.warn('GLB had no scene:', modelUrl);
                    return;
                }

                model.traverse((child) => {
                    if (!child.isMesh) return;
                    child.frustumCulled = false;
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.renderOrder = 10;
                    const meshHint = child.name || '';
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map((m) => this._prepareAvatarMaterial(m, meshHint));
                    } else {
                        child.material = this._prepareAvatarMaterial(child.material, meshHint);
                    }
                });

                entry.modelRoot = model;
                pivot.add(model);
                this._fitAvatarModel(entry);
                this._placeSceneAvatar(entry);
                root.visible = !data.hidden;

                if (gltf.animations && gltf.animations.length) {
                    entry.mixer = new THREE.AnimationMixer(model);
                    // Prefer a calm idle if named; otherwise first clip
                    const clip = gltf.animations.find((c) => /idle|stand|avaturn/i.test(c.name))
                        || gltf.animations[0];
                    const action = entry.mixer.clipAction(clip);
                    action.reset();
                    action.play();
                }
            },
            undefined,
            (err) => {
                console.warn('Scene avatar GLB failed:', modelUrl, err);
                // Fall back to PNG plate if provided
                if (data.image) {
                    const idx = (this._sceneAvatars || []).indexOf(entry);
                    if (idx >= 0) this._sceneAvatars.splice(idx, 1);
                    if (root.parent) root.parent.remove(root);
                    const fallback = { ...data };
                    delete fallback.model;
                    this.addSceneAvatar(fallback);
                }
            }
        );

        return entry;
    }

    /**
     * Body + cloth + shoes: lit Standard (keeps base/normal/metal/rough maps).
     * Head / eyes / teeth stay unlit MeshBasic.
     */
    _prepareAvatarMaterial(mat, meshHint = '') {
        if (!mat) return mat;
        const needsSkin = !!mat.skinning;
        const needsMorph = !!mat.morphTargets;
        const map = mat.map || null;
        const color = mat.color ? mat.color.clone() : new THREE.Color(0xffffff);
        const opacity = typeof mat.opacity === 'number' ? mat.opacity : 1;
        const alphaTest = typeof mat.alphaTest === 'number' ? mat.alphaTest : 0;
        const nameHint = `${mat.name || ''} ${meshHint}`;
        const isCloth = /look|cloth|outfit|garment|shoe|avaturn_look|avaturn_shoes/i.test(nameHint);
        const isBody = /(^|[^a-z])body([^a-z]|$)|Body_Mesh/i.test(nameHint);
        const useLit = isCloth || isBody;
        const isTransparent = !!mat.transparent || opacity < 0.98
            || /eyelash|eyeao|hair|alpha/i.test(nameHint);
        const isHair = /hair/i.test(nameHint);

        if (map) {
            if (THREE.sRGBEncoding !== undefined) map.encoding = THREE.sRGBEncoding;
            if (!isHair && !useLit) {
                map.generateMipmaps = false;
                map.minFilter = THREE.LinearFilter;
            }
            map.needsUpdate = true;
        }

        // Body / cloth / shoes — keep lit PBR so all authored maps are used
        if (useLit) {
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                // Skin / fabric should not read as metal
                if (isBody) {
                    mat.metalness = 0;
                    mat.roughness = Math.max(typeof mat.roughness === 'number' ? mat.roughness : 0.85, 0.7);
                } else {
                    mat.metalness = Math.min(typeof mat.metalness === 'number' ? mat.metalness : 0, 0.15);
                    mat.roughness = Math.max(typeof mat.roughness === 'number' ? mat.roughness : 0.75, 0.55);
                }
                mat.envMapIntensity = 0;
                mat.depthTest = true;
                mat.depthWrite = !isTransparent;
                mat.side = isTransparent ? THREE.DoubleSide : (isBody ? THREE.DoubleSide : THREE.FrontSide);
                mat.transparent = isTransparent;
                if (isTransparent && alphaTest < 0.01) mat.alphaTest = 0.12;
                mat.needsUpdate = true;
                return mat;
            }
            const lit = new THREE.MeshStandardMaterial({
                map,
                color,
                metalness: 0,
                roughness: isBody ? 0.85 : 0.78,
                transparent: isTransparent,
                opacity,
                alphaTest: isTransparent ? Math.max(alphaTest, 0.12) : alphaTest,
                side: isTransparent || isBody ? THREE.DoubleSide : THREE.FrontSide,
                depthTest: true,
                depthWrite: !isTransparent,
                skinning: needsSkin,
                morphTargets: needsMorph
            });
            if (mat.normalMap) lit.normalMap = mat.normalMap;
            if (mat.roughnessMap) lit.roughnessMap = mat.roughnessMap;
            if (mat.metalnessMap) lit.metalnessMap = mat.metalnessMap;
            if (mat.aoMap) {
                lit.aoMap = mat.aoMap;
                lit.aoMapIntensity = typeof mat.aoMapIntensity === 'number' ? mat.aoMapIntensity : 1;
            }
            lit.name = mat.name || (isBody ? 'avatar-body-lit' : 'avatar-cloth-lit');
            try { mat.dispose(); } catch (e) { /* ignore */ }
            return lit;
        }

        if (mat.isMeshBasicMaterial) {
            mat.depthTest = true;
            mat.depthWrite = !isTransparent;
            mat.side = isTransparent ? THREE.DoubleSide : THREE.FrontSide;
            mat.transparent = isTransparent;
            if (isTransparent && alphaTest < 0.01) mat.alphaTest = 0.12;
            mat.needsUpdate = true;
            return mat;
        }

        const basic = new THREE.MeshBasicMaterial({
            map,
            color,
            transparent: isTransparent,
            opacity,
            alphaTest: isTransparent ? Math.max(alphaTest, 0.12) : alphaTest,
            side: isTransparent ? THREE.DoubleSide : THREE.FrontSide,
            depthTest: true,
            depthWrite: !isTransparent,
            skinning: needsSkin,
            morphTargets: needsMorph
        });
        basic.name = mat.name || 'avatar-unlit';
        try { mat.dispose(); } catch (e) { /* ignore */ }
        return basic;
    }

    /** Aim cloth key/fill at the avatar chest so fabric shading stays on-character. */
    _aimAvatarLights(entry) {
        if (!entry || !entry.mesh || !this.avatarKeyLight) return;
        const chest = entry.mesh.position.clone();
        chest.y += (entry.height || 160) * 0.55;
        this.avatarKeyLight.target.position.copy(chest);
        this.avatarKeyLight.target.updateMatrixWorld();
        if (this.avatarFillLight) {
            this.avatarFillLight.target.position.copy(chest);
            this.avatarFillLight.target.updateMatrixWorld();
        }
        // Keep lights near the avatar so intensity doesn't fall off oddly
        const root = entry.mesh.position;
        this.avatarKeyLight.position.set(root.x + 40, root.y + 120, root.z + 70);
        this.avatarFillLight.position.set(root.x - 55, root.y + 50, root.z - 40);
    }

    _fitAvatarModel(entry) {
        if (!entry || !entry.modelRoot || !entry.mesh) return;
        const model = entry.modelRoot;
        const root = entry.mesh;

        // Measure in root-local space. Root may already sit on the pin — never
        // subtract raw world XZ into model.position (that drifts the avatar off-pin).
        const prevPos = root.position.clone();
        const prevRot = root.rotation.clone();
        const prevScale = root.scale.clone();
        const pivot = entry.pivot;
        const prevPivotRot = pivot ? pivot.rotation.clone() : null;
        root.position.set(0, 0, 0);
        root.rotation.set(0, 0, 0);
        root.scale.set(1, 1, 1);
        if (pivot) pivot.rotation.set(0, 0, 0);
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        root.updateMatrixWorld(true);

        // Skinned Avaturn meshes: geometry AABB is bind-pose junk (~cube).
        // Prefer Hips height → standing height (~1.75–1.85 m).
        let srcH = 1.8;
        const hips = model.getObjectByName('Hips');
        if (hips) {
            const hp = new THREE.Vector3();
            hips.getWorldPosition(hp);
            if (hp.y > 0.3) srcH = Math.max(1.55, Math.min(2.05, hp.y / 0.55));
        } else {
            model.traverse((child) => {
                if (child.isSkinnedMesh && child.skeleton) child.skeleton.update();
            });
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            if (size.y > 0.8 && size.y < 2.6) srcH = size.y;
        }
        entry.baseModelHeight = srcH;

        const targetH = entry.height || 162;
        const scaleMul = typeof entry.modelScale === 'number' ? entry.modelScale : 1;
        const s = (targetH / srcH) * scaleMul;
        model.scale.setScalar(s);
        model.updateMatrixWorld(true);

        // Center on XZ using Hips; keep feet at local y=0 (Avaturn armature is already grounded)
        if (hips) {
            const hp = new THREE.Vector3();
            hips.getWorldPosition(hp);
            model.position.x -= hp.x;
            model.position.z -= hp.z;
        }
        model.updateMatrixWorld(true);

        root.position.copy(prevPos);
        root.rotation.copy(prevRot);
        root.scale.copy(prevScale);
        if (pivot) pivot.rotation.copy(prevPivotRot);
        root.updateMatrixWorld(true);
    }

    _placeSceneAvatar(entry) {
        if (!entry || !entry.mesh) return;
        const pos = this.coordsToVector3(entry.pitch, entry.yaw);
        const scale = (entry.radius || 430) / 500;
        pos.multiplyScalar(scale);

        // Feet/plate: lift so mark is under feet. Ground (GLB): position is feet.
        if (entry.anchor === 'feet') {
            pos.y += (entry.height || 150) * 0.48;
        } else if (entry.anchor !== 'center' && entry.anchor !== 'ground') {
            pos.y += (entry.height || 150) * 0.48;
        }

        if (typeof entry.offsetY === 'number') {
            pos.y += entry.offsetY;
        }
        entry.mesh.position.copy(pos);

        const rotX = typeof entry.worldRotX === 'number' ? entry.worldRotX : 0;
        const rotY = typeof entry.worldRot === 'number' ? entry.worldRot : 0;
        const rotZ = typeof entry.worldRotZ === 'number' ? entry.worldRotZ : 0;

        if (entry.isModel) {
            // Upright only — yaw toward camera. Never pitch/roll via lookAt.
            const faceYaw = Math.atan2(pos.x, pos.z) + Math.PI;
            entry.mesh.rotation.order = 'YXZ';
            const own = [THREE.MathUtils.degToRad(rotX), THREE.MathUtils.degToRad(rotY), THREE.MathUtils.degToRad(rotZ)];
            if (entry.pivot) {
                entry.mesh.rotation.set(0, faceYaw, 0);
                entry.pivot.rotation.set(own[0], own[1], own[2]);
            } else {
                entry.mesh.rotation.set(own[0], faceYaw + own[1], own[2]);
            }
            this._aimAvatarLights(entry);
        } else {
            // Flat PNG / tablet plates still billboard toward the camera
            entry.mesh.lookAt(0, 0, 0);
            entry.mesh.rotateY(Math.PI);
            if (rotX) entry.mesh.rotateX(THREE.MathUtils.degToRad(rotX));
            if (rotY) entry.mesh.rotateY(THREE.MathUtils.degToRad(rotY));
            if (rotZ) entry.mesh.rotateZ(THREE.MathUtils.degToRad(rotZ));
        }
        entry.mesh.updateMatrixWorld(true);
    }

    setSceneAvatarCoords(id, pitch, yaw) {
        const entry = (this._sceneAvatars || []).find((a) => a.id === id);
        if (!entry) return false;
        entry.pitch = pitch;
        entry.yaw = yaw;
        this._placeSceneAvatar(entry);
        return true;
    }

    setSceneAvatarSize(id, {
        worldHeight, worldWidth, radius, worldRot, worldRotX, worldRotZ, modelScale, offsetY
    } = {}) {
        const entry = (this._sceneAvatars || []).find((a) => a.id === id);
        if (!entry || !entry.mesh) return false;

        if (typeof radius === 'number') entry.radius = radius;
        if (typeof worldHeight === 'number') entry.height = worldHeight;
        // Never auto-derive width from height — keep the set worldWidth as-is
        // (auto height×0.35 made plates look warped while looking around the 360).
        if (typeof worldWidth === 'number') {
            entry.width = worldWidth;
        }
        if (typeof worldRot === 'number') entry.worldRot = worldRot;
        if (typeof worldRotX === 'number') entry.worldRotX = worldRotX;
        if (typeof worldRotZ === 'number') entry.worldRotZ = worldRotZ;
        if (typeof modelScale === 'number') entry.modelScale = modelScale;
        if (typeof offsetY === 'number') entry.offsetY = offsetY;

        if (entry.isModel) {
            // GLB uses uniform height/modelScale only — do not stretch by worldWidth
            if (entry.modelRoot) this._fitAvatarModel(entry);
            this._placeSceneAvatar(entry);
            return true;
        }

        const nextW = typeof entry.width === 'number' ? entry.width : (entry.height || 150) * 0.35;
        const nextH = entry.height || 150;
        const oldGeo = entry.mesh.geometry;
        entry.mesh.geometry = new THREE.PlaneGeometry(nextW, nextH);
        if (oldGeo) oldGeo.dispose();

        this._placeSceneAvatar(entry);
        return true;
    }

    setSceneAvatarTransform(id, opts = {}) {
        const entry = (this._sceneAvatars || []).find((a) => a.id === id);
        if (!entry || !entry.mesh) return false;
        if (typeof opts.pitch === 'number') entry.pitch = opts.pitch;
        if (typeof opts.yaw === 'number') entry.yaw = opts.yaw;
        return this.setSceneAvatarSize(id, opts);
    }

    setSceneAvatarRotation(id, worldRot) {
        const entry = (this._sceneAvatars || []).find((a) => a.id === id);
        if (!entry || !entry.mesh) return false;
        entry.worldRot = typeof worldRot === 'number' ? worldRot : 0;
        this._placeSceneAvatar(entry);
        return true;
    }

    getSceneAvatarSettings(id) {
        const entry = (this._sceneAvatars || []).find((a) => a.id === id);
        if (!entry) return null;
        return {
            id: entry.id,
            pitch: entry.pitch,
            yaw: entry.yaw,
            radius: entry.radius,
            worldHeight: entry.height,
            worldWidth: entry.width || entry.height * 0.35,
            worldRot: typeof entry.worldRot === 'number' ? entry.worldRot : 0,
            worldRotX: typeof entry.worldRotX === 'number' ? entry.worldRotX : 0,
            worldRotZ: typeof entry.worldRotZ === 'number' ? entry.worldRotZ : 0,
            modelScale: typeof entry.modelScale === 'number' ? entry.modelScale : 1,
            offsetY: typeof entry.offsetY === 'number' ? entry.offsetY : 0,
            isModel: !!entry.isModel
        };
    }

    setSceneAvatarHidden(id, hidden) {
        const entry = (this._sceneAvatars || []).find((a) => a.id === id);
        if (!entry || !entry.mesh) return false;
        entry.mesh.visible = !hidden;
        return true;
    }

    /**
     * Glue a flat image onto a TV / screen in the 360 by pinning four pitch/yaw corners.
     * Corners: tl, tr, br, bl — each { pitch, yaw }.
     */
    clearScreenOverlays() {
        if (!this._screenOverlays || !this._screenOverlays.length) {
            this._screenOverlays = [];
            return;
        }
        this._screenOverlays.forEach((entry) => {
            if (entry.mesh && entry.mesh.parent) entry.mesh.parent.remove(entry.mesh);
            if (entry.mesh) {
                if (entry.mesh.geometry) entry.mesh.geometry.dispose();
                if (entry.mesh.material) {
                    if (entry.mesh.material.map) entry.mesh.material.map.dispose();
                    entry.mesh.material.dispose();
                }
            }
        });
        this._screenOverlays = [];
    }

    syncScreenOverlays(overlayList = []) {
        this.clearScreenOverlays();
        (overlayList || []).forEach((data) => {
            if (data && data.image) this.addScreenOverlay(data);
        });
    }

    addScreenOverlay(data) {
        if (!data || !this.scene || !window.THREE) return null;

        const corners = {
            tl: { ...(data.corners && data.corners.tl ? data.corners.tl : { pitch: 10, yaw: 0 }) },
            tr: { ...(data.corners && data.corners.tr ? data.corners.tr : { pitch: 10, yaw: 14 }) },
            br: { ...(data.corners && data.corners.br ? data.corners.br : { pitch: 2, yaw: 14 }) },
            bl: { ...(data.corners && data.corners.bl ? data.corners.bl : { pitch: 2, yaw: 0 }) }
        };
        const radius = typeof data.radius === 'number' ? data.radius : 480;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(12);
        const uvs = new Float32Array([
            0, 1, // tl
            1, 1, // tr
            1, 0, // br
            0, 0  // bl
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex([0, 1, 2, 0, 2, 3]);

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: null,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
            opacity: 1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = 8;
        mesh.frustumCulled = false;
        mesh.visible = !data.hidden;
        mesh.name = `screen-overlay-${data.id || 'unknown'}`;

        const entry = {
            id: data.id || 'screen',
            image: data.image,
            corners,
            radius,
            mesh
        };

        this.scene.add(mesh);
        this._updateScreenOverlayGeometry(entry);
        this._screenOverlays.push(entry);

        this.textureLoader.load(
            this._resolveMediaUrl(data.image),
            (texture) => {
                // Large posters shown small need mipmaps + anisotropy to stay crisp
                texture.generateMipmaps = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                if (THREE.LinearEncoding !== undefined) {
                    texture.encoding = THREE.LinearEncoding;
                }
                if ('colorSpace' in texture && THREE.NoColorSpace !== undefined) {
                    texture.colorSpace = THREE.NoColorSpace;
                } else if ('colorSpace' in texture && THREE.LinearSRGBColorSpace !== undefined) {
                    texture.colorSpace = THREE.LinearSRGBColorSpace;
                }
                material.map = texture;
                material.needsUpdate = true;
                mesh.visible = !data.hidden;
            },
            undefined,
            (err) => console.warn('Screen overlay texture failed:', data.image, err)
        );

        return entry;
    }

    _updateScreenOverlayGeometry(entry) {
        if (!entry || !entry.mesh || !entry.mesh.geometry) return;
        const scale = (entry.radius || 480) / 500;
        const order = ['tl', 'tr', 'br', 'bl'];
        const posAttr = entry.mesh.geometry.attributes.position;
        order.forEach((key, i) => {
            const c = entry.corners[key] || { pitch: 0, yaw: 0 };
            const v = this.coordsToVector3(c.pitch, c.yaw);
            v.multiplyScalar(scale);
            posAttr.setXYZ(i, v.x, v.y, v.z);
        });
        posAttr.needsUpdate = true;
        entry.mesh.geometry.computeBoundingSphere();
    }

    setScreenOverlayCorner(id, cornerKey, pitch, yaw) {
        const entry = (this._screenOverlays || []).find((o) => o.id === id);
        if (!entry || !entry.corners[cornerKey]) return false;
        const round1 = (n) => Math.round(Number(n) * 10) / 10;
        entry.corners[cornerKey] = {
            pitch: round1(pitch),
            yaw: round1(((yaw % 360) + 360) % 360)
        };
        this._updateScreenOverlayGeometry(entry);
        return true;
    }

    setScreenOverlayRadius(id, radius) {
        const entry = (this._screenOverlays || []).find((o) => o.id === id);
        if (!entry) return false;
        entry.radius = Math.round(Number(radius) * 10) / 10;
        this._updateScreenOverlayGeometry(entry);
        return true;
    }

    getScreenOverlaySettings(id) {
        const entry = (this._screenOverlays || []).find((o) => o.id === id);
        if (!entry) return null;
        return {
            id: entry.id,
            image: entry.image,
            radius: entry.radius,
            corners: {
                tl: { ...entry.corners.tl },
                tr: { ...entry.corners.tr },
                br: { ...entry.corners.br },
                bl: { ...entry.corners.bl }
            }
        };
    }

    listScreenOverlays() {
        return (this._screenOverlays || []).map((o) => o.id);
    }

    getOrientation() {
        const yaw = ((this.targetYaw % 360) + 360) % 360;
        return {
            sphereYaw: Math.round(this.sphereRotationY),
            initialPitch: Math.round(this.targetPitch),
            initialYaw: Math.round(yaw)
        };
    }

    loadVideo(videoUrl, onComplete, options = {}) {
        // Dissolve into the next video once it is ready (no black cut)
        const sphereYaw = typeof options.sphereYaw === 'number' ? options.sphereYaw : this.sphereRotationY;
        const targetPitch = typeof options.targetPitch === 'number' ? options.targetPitch : null;
        const targetYaw = typeof options.targetYaw === 'number' ? options.targetYaw : null;
        const targetFov = typeof options.targetFov === 'number' ? options.targetFov : null;

        this.preloadVideo(videoUrl, {
            loop: options.loop !== false,
            muted: options.muted !== false
        })
            .then(async (video) => {
                await this.dissolveToMedia({
                    mediaType: 'video',
                    media: video,
                    sphereYaw,
                    targetPitch,
                    targetYaw,
                    targetFov,
                    duration: 550
                });
                if (onComplete) onComplete(video);
            })
            .catch((err) => {
                console.error(err);
                this.sphere.material.opacity = 1;
                if (onComplete) onComplete(null);
            });
    }

    bindEvents() {
        const dom = this.renderer.domElement;
        const startLook = (e) => this.onPointerDown(e);

        this.container.style.touchAction = 'none';
        if (dom) dom.style.touchAction = 'none';

        this.container.addEventListener('pointerdown', startLook);
        dom.addEventListener('pointerdown', startLook);
        window.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
        window.addEventListener('pointerup', () => this.onPointerUp());
        window.addEventListener('pointercancel', () => this.onPointerUp());

        this.container.addEventListener('wheel', (e) => this.onWheel(e), { passive: true });
        window.addEventListener('resize', () => this.onWindowResize());

        // Gyroscope handler
        if (this.hasGyroSupport) {
            window.addEventListener('deviceorientation', (e) => this.onDeviceOrientation(e));
        }
    }

    /**
     * Raycast click against 3D scene avatars (GLB / plates).
     * Returns hotspot id or null.
     */
    pickSceneAvatar(clientX, clientY) {
        if (!this.camera || !this.renderer || !(this._sceneAvatars || []).length) return null;
        const rect = this.renderer.domElement.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return null;
        this._pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this._pointerNdc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
        this._raycaster.setFromCamera(this._pointerNdc, this.camera);

        let best = null;
        let bestDist = Infinity;
        (this._sceneAvatars || []).forEach((entry) => {
            if (!entry || !entry.mesh || entry.mesh.visible === false) return;
            const hits = this._raycaster.intersectObject(entry.mesh, true);
            if (!hits.length) return;
            const dist = hits[0].distance;
            if (dist < bestDist) {
                bestDist = dist;
                best = entry;
            }
        });
        return best ? best.id : null;
    }

    onPointerDown(event) {
        if (event.isPrimary === false || this._transitioning) return;
        if (event.button != null && event.button > 0) return;

        // DEV: click 3D model to drag-place it (blocks look-drag)
        if (this.avatarDragEnabled) {
            const hitId = this.pickSceneAvatar(event.clientX, event.clientY);
            if (hitId) {
                this._avatarDragId = hitId;
                this.isUserInteracting = false;
                this._lookMoved = false;
                if (event.cancelable) event.preventDefault();
                if (typeof event.stopPropagation === 'function') event.stopPropagation();
                document.body.classList.add('is-dragging-avatar');
                return;
            }
        }

        this._avatarDragId = null;
        this.isUserInteracting = true;
        this._lookMoved = false;
        this.onPointerDownPointerX = event.clientX;
        this.onPointerDownPointerY = event.clientY;
        this.onPointerDownYaw = this.yaw;
        this.onPointerDownPitch = this.pitch;
    }

    onPointerMove(event) {
        // Drag 3D avatar to a new pitch/yaw on the sphere
        if (this._avatarDragId) {
            const coords = this.screenToPitchYaw(event.clientX, event.clientY);
            if (coords) {
                this.setSceneAvatarCoords(this._avatarDragId, coords.pitch, coords.yaw);
                if (typeof this.onAvatarDrag === 'function') {
                    this.onAvatarDrag(this._avatarDragId, coords.pitch, coords.yaw);
                }
            }
            if (event.cancelable) event.preventDefault();
            return;
        }

        if (!this.isUserInteracting) return;
        const dx = event.clientX - this.onPointerDownPointerX;
        const dy = event.clientY - this.onPointerDownPointerY;
        if (Math.abs(dx) + Math.abs(dy) > 6) this._lookMoved = true;
        const deltaX = (this.onPointerDownPointerX - event.clientX) * 0.15;
        const deltaY = (event.clientY - this.onPointerDownPointerY) * 0.15;
        this.targetYaw = this.onPointerDownYaw + deltaX;
        this.targetPitch = Math.max(-85, Math.min(85, this.onPointerDownPitch + deltaY));
        if (this._lookMoved && event.cancelable) event.preventDefault();
    }

    onPointerUp() {
        if (this._avatarDragId) {
            const id = this._avatarDragId;
            const entry = (this._sceneAvatars || []).find((a) => a.id === id);
            this._avatarDragId = null;
            document.body.classList.remove('is-dragging-avatar');
            if (entry && typeof this.onAvatarDragEnd === 'function') {
                this.onAvatarDragEnd(id, entry.pitch, entry.yaw);
            }
            return;
        }
        this.isUserInteracting = false;
    }

    didLookDrag() {
        return !!this._lookMoved;
    }

    onWheel(event) {
        if (this._transitioning) return;
        this.targetFov = Math.max(this.minFov, Math.min(this.maxFov, this.camera.fov + event.deltaY * 0.05));
    }

    onWindowResize() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    toggleGyroscope() {
        if (!this.hasGyroSupport) {
            alert("Device orientation not available on this hardware.");
            return false;
        }

        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ permission request
            DeviceOrientationEvent.requestPermission()
                .then(res => {
                    if (res === 'granted') {
                        this.gyroEnabled = !this.gyroEnabled;
                    } else {
                        alert("Permission denied for motion sensors.");
                    }
                })
                .catch(err => console.error(err));
        } else {
            this.gyroEnabled = !this.gyroEnabled;
        }
        return this.gyroEnabled;
    }

    onDeviceOrientation(event) {
        if (!this.gyroEnabled || !event.alpha) return;
        this.deviceOrientation.alpha = event.alpha;
        this.deviceOrientation.beta = event.beta;
        this.deviceOrientation.gamma = event.gamma;
    }

    setLookAt(pitch, yaw) {
        this.pitch = pitch;
        this.yaw = yaw;
        this.targetPitch = pitch;
        this.targetYaw = yaw;
    }

    setFov(fov, immediate = true) {
        const next = Math.max(this.minFov, Math.min(this.maxFov, Number(fov)));
        this.targetFov = next;
        if (immediate) {
            this.fov = next;
            this.camera.fov = next;
            this.camera.updateProjectionMatrix();
        }
    }

    setMaxZoom() {
        this.setFov(this.minFov, true);
    }

    setMinZoom() {
        this.setFov(this.maxFov, true);
    }

    /**
     * Converts spherical pitch/yaw (in degrees) to 3D unit vector
     */
    coordsToVector3(pitch, yaw) {
        const phi = THREE.MathUtils.degToRad(90 - pitch);
        const theta = THREE.MathUtils.degToRad(yaw);
        const target = new THREE.Vector3();
        target.x = 500 * Math.sin(phi) * Math.cos(theta);
        target.y = 500 * Math.cos(phi);
        target.z = 500 * Math.sin(phi) * Math.sin(theta);
        return target;
    }

    /**
     * Projects 3D pitch/yaw coordinates to 2D screen coordinates (pixels)
     */
    projectToScreen(pitch, yaw) {
        const v = this.coordsToVector3(pitch, yaw);
        v.project(this.camera);

        const width = this.renderer.domElement.clientWidth;
        const height = this.renderer.domElement.clientHeight;

        const isBehind = v.z > 1; // Behind camera view plane
        const x = (v.x * 0.5 + 0.5) * width;
        const y = (-(v.y * 0.5) + 0.5) * height;

        return { x, y, visible: !isBehind };
    }

    /**
     * Convert a click on the canvas to pitch/yaw on the 360 sphere.
     * clientX/clientY = event.clientX / event.clientY
     */
    screenToPitchYaw(clientX, clientY) {
        if (!this.renderer || !this.camera) return null;
        const rect = this.renderer.domElement.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return null;
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
        const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
        vec.unproject(this.camera);
        const dir = vec.sub(this.camera.position).normalize();
        // Match coordsToVector3: y = cos(phi), phi = 90° - pitch
        const clampedY = Math.max(-1, Math.min(1, dir.y));
        const phi = Math.acos(clampedY);
        let pitch = 90 - THREE.MathUtils.radToDeg(phi);
        pitch = Math.max(-85, Math.min(85, pitch));
        let yaw = THREE.MathUtils.radToDeg(Math.atan2(dir.z, dir.x));
        yaw = ((yaw % 360) + 360) % 360;
        return {
            pitch: Math.round(pitch * 10) / 10,
            yaw: Math.round(yaw * 10) / 10
        };
    }

    animate() {
        if (!this.renderer.xr.isPresenting) {
            // Smooth dampening
            this.yaw += (this.targetYaw - this.yaw) * 0.12;
            this.pitch += (this.targetPitch - this.pitch) * 0.12;
            this.camera.fov += (this.targetFov - this.camera.fov) * 0.15;
            this.camera.updateProjectionMatrix();

            // Calculate camera target
            const phi = THREE.MathUtils.degToRad(90 - this.pitch);
            const theta = THREE.MathUtils.degToRad(this.yaw);

            this.camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
            this.camera.target.y = 500 * Math.cos(phi);
            this.camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);

            this.camera.lookAt(this.camera.target);
        }

        const dt = this._avatarClock ? this._avatarClock.getDelta() : 0;
        const flatView = !this.renderer.xr.isPresenting;
        if (flatView) this.camera.updateMatrixWorld();
        const avatars = this._sceneAvatars || [];
        // Pose bones on an unsquashed rig — gestures rotate in world space and
        // a non-uniform parent scale would skew the arms into the body.
        avatars.forEach((entry) => {
            if (entry.isModel && entry.mesh) entry.mesh.scale.x = 1;
            if (entry.mixer) entry.mixer.update(dt);
        });
        // Narration lip-sync (after the idle mixer so morph weights win)
        if (this.lipsync) this.lipsync.update(dt);
        // "Explaining" hand gestures while narrating (after mixer so offsets sit on the idle pose)
        if (this.gestures) {
            this.gestures.update(dt, !!(this.lipsync && this.lipsync.speaking), this.lipsync ? this.lipsync.level : 0);
        }
        // Perspective widens avatars toward the screen edges; counter it so width stays constant
        if (flatView) {
            const p = this._avatarCamPos || (this._avatarCamPos = new THREE.Vector3());
            avatars.forEach((entry) => {
                if (!entry.isModel || !entry.mesh) return;
                p.copy(entry.mesh.position).applyMatrix4(this.camera.matrixWorldInverse);
                if (p.z < 0) entry.mesh.scale.x = Math.max(0.6, Math.cos(Math.atan2(p.x, -p.z)));
            });
        }

        this.renderer.render(this.scene, this.camera);

        if (this.onSceneRendered) {
            this.onSceneRendered();
        }
    }
}

window.PanoramaViewer = PanoramaViewer;
