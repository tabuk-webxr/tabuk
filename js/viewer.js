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
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                imageUrl,
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
    clearSceneAvatars() {
        if (!this._sceneAvatars || !this._sceneAvatars.length) {
            this._sceneAvatars = [];
            return;
        }
        this._sceneAvatars.forEach((entry) => {
            if (entry.mesh && entry.mesh.parent) {
                entry.mesh.parent.remove(entry.mesh);
            }
            if (entry.mesh) {
                if (entry.mesh.geometry) entry.mesh.geometry.dispose();
                if (entry.mesh.material) {
                    if (entry.mesh.material.map) entry.mesh.material.map.dispose();
                    entry.mesh.material.dispose();
                }
            }
        });
        this._sceneAvatars = [];
    }

    syncSceneAvatars(hotspotList = []) {
        this.clearSceneAvatars();
        (hotspotList || []).forEach((h) => {
            if (!h || h.hidden) return;
            // Full-body guides + glued props (e.g. CEO/CHRO monitors)
            if (h.type === 'avatar' || (h.glue && h.image)) {
                this.addSceneAvatar(h);
            }
        });
    }

    addSceneAvatar(data) {
        if (!data || !this.scene || !window.THREE) return null;

        const imageUrl = data.image || 'assets/images/welcome_tip_avatar.png';
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
            // Monitors / props: center on pitch/yaw. Avatars: feet on mark.
            anchor: data.anchor || (isGluedProp ? 'center' : 'feet'),
            worldRot: typeof data.worldRot === 'number' ? data.worldRot : 0,
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

    _placeSceneAvatar(entry) {
        if (!entry || !entry.mesh) return;
        const pos = this.coordsToVector3(entry.pitch, entry.yaw);
        const scale = (entry.radius || 430) / 500;
        pos.multiplyScalar(scale);

        // Feet anchor: pitch/yaw = standing mark. Center anchor: pitch/yaw = plate center.
        if (entry.anchor !== 'center') {
            pos.y += (entry.height || 150) * 0.48;
        }

        entry.mesh.position.copy(pos);
        // Face the camera at the origin (inside the panorama)
        entry.mesh.lookAt(0, 0, 0);
        entry.mesh.rotateY(Math.PI);
        // Extra turn around vertical (DEV rotation) — 180 flips front/back
        const rot = typeof entry.worldRot === 'number' ? entry.worldRot : 0;
        if (rot) {
            entry.mesh.rotateY(THREE.MathUtils.degToRad(rot));
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

    setSceneAvatarSize(id, { worldHeight, worldWidth, radius, worldRot } = {}) {
        const entry = (this._sceneAvatars || []).find((a) => a.id === id);
        if (!entry || !entry.mesh) return false;

        if (typeof radius === 'number') entry.radius = radius;
        if (typeof worldHeight === 'number') entry.height = worldHeight;
        if (typeof worldWidth === 'number') {
            entry.width = worldWidth;
        } else if (typeof worldHeight === 'number') {
            entry.width = worldHeight * 0.35;
        }
        if (typeof worldRot === 'number') entry.worldRot = worldRot;

        const nextW = entry.width || entry.height * 0.35;
        const nextH = entry.height || 150;
        const oldGeo = entry.mesh.geometry;
        entry.mesh.geometry = new THREE.PlaneGeometry(nextW, nextH);
        if (oldGeo) oldGeo.dispose();

        this._placeSceneAvatar(entry);
        return true;
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
            worldRot: typeof entry.worldRot === 'number' ? entry.worldRot : 0
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
            data.image,
            (texture) => {
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
        return {
            sphereYaw: Math.round(this.sphereRotationY),
            initialPitch: Math.round(this.targetPitch),
            initialYaw: Math.round(this.targetYaw)
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

        dom.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', () => this.onPointerUp());
        
        dom.addEventListener('wheel', (e) => this.onWheel(e), { passive: true });
        window.addEventListener('resize', () => this.onWindowResize());

        // Gyroscope handler
        if (this.hasGyroSupport) {
            window.addEventListener('deviceorientation', (e) => this.onDeviceOrientation(e));
        }
    }

    onPointerDown(event) {
        if (event.isPrimary === false || this._transitioning) return;
        this.isUserInteracting = true;
        this.onPointerDownPointerX = event.clientX;
        this.onPointerDownPointerY = event.clientY;
        this.onPointerDownYaw = this.yaw;
        this.onPointerDownPitch = this.pitch;
    }

    onPointerMove(event) {
        if (!this.isUserInteracting) return;
        const deltaX = (this.onPointerDownPointerX - event.clientX) * 0.15;
        const deltaY = (event.clientY - this.onPointerDownPointerY) * 0.15;
        this.targetYaw = this.onPointerDownYaw + deltaX;
        this.targetPitch = Math.max(-85, Math.min(85, this.onPointerDownPitch + deltaY));
    }

    onPointerUp() {
        this.isUserInteracting = false;
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

        this.renderer.render(this.scene, this.camera);

        if (this.onSceneRendered) {
            this.onSceneRendered();
        }
    }
}

window.PanoramaViewer = PanoramaViewer;
