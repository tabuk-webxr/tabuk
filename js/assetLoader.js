/**
 * Preloads video/audio into Cache Storage + in-memory blob URLs.
 * Skips assets already cached; only retries failed URLs.
 */
(function () {
    const CACHE_NAME = 'tabuk-webxr-media-v1';

    const MEDIA_ASSETS = [
        { url: 'Videos/far_from_building_4k.mov', type: 'video', label: 'Approach 360' },
        { url: 'Videos/welcome_360_4k.mov', type: 'video', label: 'Welcome 360' },
        { url: 'Videos/51_D_4k.mov', type: 'video', label: 'Reception 360' },
        { url: 'Videos/welcome_tip_avatar.mp4', type: 'video', label: 'Welcome avatar' },
        { url: 'Audios/Welcome_Enter.mp3', type: 'audio', label: 'Welcome enter' },
        { url: 'Audios/CHRO_Intro.mp3', type: 'audio', label: 'CHRO intro' },
        { url: 'Audios/Welcome Notes.mp3', type: 'audio', label: 'CEO welcome notes' },
        { url: 'Audios/CHRO_Notes.mp3', type: 'audio', label: 'CHRO notes' }
    ];

    function normalizeUrl(url) {
        if (!url) return url;
        try {
            return decodeURIComponent(url);
        } catch (e) {
            return url;
        }
    }

    class AssetLoader {
        constructor(assets = MEDIA_ASSETS) {
            this.assets = assets.map((a) => ({ ...a, url: normalizeUrl(a.url) }));
            this.blobUrls = new Map(); // normalized url -> object URL
            this.ready = new Set();
            this.failed = new Map(); // url -> error message
            this._progress = { loadedBytes: 0, totalBytes: 0, completed: 0, total: this.assets.length, percent: 0 };
            this._onProgress = null;
            this._sizes = new Map();
        }

        onProgress(cb) {
            this._onProgress = cb;
        }

        getUrl(url) {
            const key = normalizeUrl(url);
            if (this.blobUrls.has(key)) return this.blobUrls.get(key);
            // Also try encoded form used in modal profiles
            const encoded = encodeURI(key);
            if (this.blobUrls.has(encoded)) return this.blobUrls.get(encoded);
            return url;
        }

        getProgress() {
            return { ...this._progress };
        }

        getFailed() {
            return Array.from(this.failed.entries()).map(([url, error]) => ({ url, error }));
        }

        _emit() {
            if (typeof this._onProgress === 'function') {
                this._onProgress(this.getProgress());
            }
        }

        _recomputePercent() {
            const { loadedBytes, totalBytes, completed, total } = this._progress;
            if (totalBytes > 0) {
                // Blend byte progress with file completion so last file finishing hits 100%
                const bytePct = (loadedBytes / totalBytes) * 100;
                const countPct = (completed / Math.max(1, total)) * 100;
                this._progress.percent = Math.min(100, Math.round(bytePct * 0.85 + countPct * 0.15));
            } else {
                this._progress.percent = Math.round((completed / Math.max(1, total)) * 100);
            }
            if (completed >= total && this.failed.size === 0) {
                this._progress.percent = 100;
            }
        }

        async _openCache() {
            if (!('caches' in window)) return null;
            try {
                return await caches.open(CACHE_NAME);
            } catch (e) {
                return null;
            }
        }

        async _probeSize(url) {
            try {
                const res = await fetch(url, { method: 'HEAD', cache: 'force-cache' });
                if (!res.ok) return 0;
                const len = Number(res.headers.get('content-length') || 0);
                return Number.isFinite(len) ? len : 0;
            } catch (e) {
                return 0;
            }
        }

        async _readCachedBlob(cache, url) {
            if (!cache) return null;
            const match = await cache.match(url);
            if (!match) return null;
            try {
                return await match.blob();
            } catch (e) {
                return null;
            }
        }

        async _storeBlob(cache, url, blob) {
            if (!cache) return;
            try {
                const headers = new Headers({
                    'Content-Type': blob.type || 'application/octet-stream',
                    'Content-Length': String(blob.size)
                });
                await cache.put(url, new Response(blob, { status: 200, headers }));
            } catch (e) {
                // Quota exceeded — keep in-memory blob URL only
                console.warn('[AssetLoader] Cache put failed:', url, e);
            }
        }

        async _fetchWithProgress(url, knownSize, onChunk) {
            const res = await fetch(url, { cache: 'force-cache' });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const total = Number(res.headers.get('content-length') || knownSize || 0);
            if (!res.body || !res.body.getReader) {
                const blob = await res.blob();
                if (onChunk) onChunk(blob.size, total || blob.size);
                return blob;
            }

            const reader = res.body.getReader();
            const chunks = [];
            let received = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.byteLength;
                if (onChunk) onChunk(received, total || received);
            }
            return new Blob(chunks, {
                type: res.headers.get('content-type') || 'application/octet-stream'
            });
        }

        _registerBlob(url, blob) {
            const prev = this.blobUrls.get(url);
            if (prev) {
                try { URL.revokeObjectURL(prev); } catch (e) { /* ignore */ }
            }
            const objectUrl = URL.createObjectURL(blob);
            this.blobUrls.set(url, objectUrl);
            // Alias encoded path (e.g. spaces → %20) for callers that encode URLs
            try {
                const encoded = encodeURI(url);
                if (encoded !== url) this.blobUrls.set(encoded, objectUrl);
            } catch (e) { /* ignore */ }
            this.ready.add(url);
            this.failed.delete(url);
            return objectUrl;
        }

        async _loadOne(asset, cache, byteOffsets) {
            const { url } = asset;
            if (this.ready.has(url) && this.blobUrls.has(url)) {
                return;
            }

            // Prefer Cache Storage (skip network if already cached)
            let blob = await this._readCachedBlob(cache, url);
            if (blob && blob.size > 0) {
                this._registerBlob(url, blob);
                const size = this._sizes.get(url) || blob.size;
                byteOffsets.set(url, size);
                this._progress.loadedBytes = Array.from(byteOffsets.values()).reduce((a, b) => a + b, 0);
                this._progress.completed = this.ready.size;
                this._recomputePercent();
                this._emit();
                return;
            }

            const knownSize = this._sizes.get(url) || 0;
            blob = await this._fetchWithProgress(url, knownSize, (received, total) => {
                if (total && total !== this._sizes.get(url)) {
                    this._sizes.set(url, total);
                    this._progress.totalBytes = Array.from(this._sizes.values()).reduce((a, b) => a + b, 0);
                }
                byteOffsets.set(url, received);
                this._progress.loadedBytes = Array.from(byteOffsets.values()).reduce((a, b) => a + b, 0);
                this._recomputePercent();
                this._emit();
            });

            await this._storeBlob(cache, url, blob);
            this._registerBlob(url, blob);
            byteOffsets.set(url, blob.size);
            if (!this._sizes.get(url)) this._sizes.set(url, blob.size);
            this._progress.totalBytes = Array.from(this._sizes.values()).reduce((a, b) => a + b, 0);
            this._progress.loadedBytes = Array.from(byteOffsets.values()).reduce((a, b) => a + b, 0);
            this._progress.completed = this.ready.size;
            this._recomputePercent();
            this._emit();
        }

        async preload({ onlyFailed = false } = {}) {
            const queue = onlyFailed
                ? this.assets.filter((a) => this.failed.has(a.url))
                : this.assets.filter((a) => !this.ready.has(a.url));

            if (!onlyFailed) {
                this.failed.clear();
            } else {
                queue.forEach((a) => this.failed.delete(a.url));
            }

            this._progress.total = this.assets.length;
            this._progress.completed = this.ready.size;

            // Probe sizes for assets still pending (skip cached when possible)
            const cache = await this._openCache();
            let totalBytes = 0;
            for (const asset of this.assets) {
                if (this.ready.has(asset.url) && this.blobUrls.has(asset.url)) {
                    const size = this._sizes.get(asset.url) || 0;
                    totalBytes += size;
                    continue;
                }
                const cached = await this._readCachedBlob(cache, asset.url);
                if (cached && cached.size > 0) {
                    this._sizes.set(asset.url, cached.size);
                    totalBytes += cached.size;
                    continue;
                }
                const size = await this._probeSize(asset.url);
                this._sizes.set(asset.url, size);
                totalBytes += size;
            }
            this._progress.totalBytes = totalBytes;

            // Seed loadedBytes from already-ready assets
            let loaded = 0;
            const byteOffsets = new Map();
            this.ready.forEach((url) => {
                const size = this._sizes.get(url) || 0;
                byteOffsets.set(url, size);
                loaded += size;
            });
            this._progress.loadedBytes = loaded;
            this._recomputePercent();
            this._emit();

            // Load sequentially to avoid saturating bandwidth / memory spikes
            for (const asset of queue) {
                try {
                    await this._loadOne(asset, cache, byteOffsets);
                } catch (err) {
                    const message = (err && err.message) ? err.message : 'Load failed';
                    this.failed.set(asset.url, message);
                    console.error('[AssetLoader] Failed:', asset.url, err);
                    this._recomputePercent();
                    this._emit();
                }
            }

            this._progress.completed = this.ready.size;
            this._recomputePercent();
            this._emit();

            return {
                ok: this.failed.size === 0,
                failed: this.getFailed(),
                progress: this.getProgress()
            };
        }
    }

    window.AssetLoader = AssetLoader;
    window.MEDIA_ASSETS = MEDIA_ASSETS;
})();
