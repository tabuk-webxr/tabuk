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

    _fadeInMaterial(onComplete) {
        let op = 0.4;
        this.sphere.material.opacity = op;
        const fadeIn = setInterval(() => {
            op += 0.1;
            if (op >= 1) {
                this.sphere.material.opacity = 1;
                clearInterval(fadeIn);
                if (onComplete) onComplete();
            } else {
                this.sphere.material.opacity = op;
            }
        }, 20);
    }

    loadTexture(imageUrl, onComplete) {
        this.stopVideo();
        this.sphere.material.opacity = 0.4;

        this.textureLoader.load(
            imageUrl,
            (texture) => {
                texture.minFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                if (this.sphere.material.map && this.sphere.material.map !== this.activeVideoTexture) {
                    this.sphere.material.map.dispose();
                }
                this.sphere.material.map = texture;
                this.sphere.material.color.setHex(0xffffff);
                this.sphere.material.needsUpdate = true;
                this._fadeInMaterial(onComplete);
            },
            undefined,
            (err) => {
                console.error("Error loading texture:", imageUrl, err);
                this.sphere.material.opacity = 1;
                if (onComplete) onComplete();
            }
        );
    }

    setSphereRotationY(degrees) {
        this.sphereRotationY = ((Number(degrees) % 360) + 360) % 360;
        this.sphere.rotation.y = THREE.MathUtils.degToRad(this.sphereRotationY);
    }

    getOrientation() {
        return {
            sphereYaw: Math.round(this.sphereRotationY),
            initialPitch: Math.round(this.targetPitch),
            initialYaw: Math.round(this.targetYaw)
        };
    }

    loadVideo(videoUrl, onComplete) {
        this.stopVideo();

        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.preload = 'auto';

        const applyVideoTexture = () => {
            if (this.sphere.material.map && this.sphere.material.map !== this.activeVideoTexture) {
                this.sphere.material.map.dispose();
            }

            const texture = new THREE.VideoTexture(video);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;

            this.activeVideo = video;
            this.activeVideoTexture = texture;
            this.sphere.material.map = texture;
            // Full brightness — original video, no fade / tint
            this.sphere.material.color.setHex(0xffffff);
            this.sphere.material.transparent = false;
            this.sphere.material.opacity = 1;
            this.sphere.material.needsUpdate = true;

            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch((err) => console.warn('360 video autoplay blocked:', err));
            }

            if (onComplete) onComplete();
        };

        const onReady = () => {
            video.removeEventListener('loadeddata', onReady);
            applyVideoTexture();
        };

        video.addEventListener('loadeddata', onReady);
        video.addEventListener('error', () => {
            console.error('Error loading 360 video:', videoUrl);
            this.sphere.material.opacity = 1;
            if (onComplete) onComplete();
        });
        video.load();
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
        if (event.isPrimary === false) return;
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
        this.targetFov = Math.max(30, Math.min(95, this.camera.fov + event.deltaY * 0.05));
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
