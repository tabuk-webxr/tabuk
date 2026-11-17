/**
 * AvatarGestures — procedural "explaining" hand/arm motion for the Welcome Guide
 * while he is narrating (driven by AvatarLipSync.speaking / .level).
 *
 * Layered on top of the idle clip: the idle animation keys every arm / hand /
 * head bone each frame, so the offsets below are re-applied from a clean pose
 * every frame and never accumulate.
 *
 * All rotations are done around the CHARACTER's axes (side / up / forward),
 * derived from the skeleton each frame, so they stay correct whatever yaw /
 * pitch / rotation the avatar is placed with in the 360 scene.
 */
(function () {
    'use strict';

    const D = Math.PI / 180;
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    // Arm pose = { raise, out, elbow, roll } in degrees (per side)
    //   raise : upper arm swing forward from hanging at the side
    //   out   : upper arm swing away from the body (yaw)
    //   elbow : forearm bend
    //   roll  : forearm/palm rotation (palm turning up / open)
    const POSES = [
        // relaxed conversational
        { R: { raise: 28, out: 10, elbow: 58, roll: 18 }, L: { raise: 16, out: 8, elbow: 40, roll: 10 } },
        // welcoming — both hands open
        { R: { raise: 38, out: 30, elbow: 78, roll: 45 }, L: { raise: 38, out: 30, elbow: 78, roll: 45 } },
        // explaining with the right hand
        { R: { raise: 52, out: 16, elbow: 88, roll: 35 }, L: { raise: 10, out: 6, elbow: 28, roll: 8 } },
        // explaining with the left hand
        { R: { raise: 12, out: 6, elbow: 30, roll: 8 }, L: { raise: 50, out: 18, elbow: 85, roll: 35 } },
        // emphasis — both hands in front
        { R: { raise: 44, out: 10, elbow: 98, roll: 25 }, L: { raise: 44, out: 10, elbow: 98, roll: 25 } }
    ];

    const ZERO_ARM = { raise: 0, out: 0, elbow: 0, roll: 0 };

    class AvatarGestures {
        constructor(viewer, options = {}) {
            this.viewer = viewer;
            this.avatarId = options.avatarId || 'welcome_guide';
            this.strength = typeof options.strength === 'number' ? options.strength : 1;

            this.g = 0;           // 0..1 "is gesturing" blend
            this.time = 0;
            this.poseIdx = -1;
            this.poseTimer = 0;
            this.beat = 0;
            this.beatTarget = 0;
            this._holdT = 0;
            this.prevLevel = 0;
            this.cur = { R: { ...ZERO_ARM }, L: { ...ZERO_ARM } };

            this._root = null;
            this._bones = null;

            // scratch
            this._q = new THREE.Quaternion();
            this._pq = new THREE.Quaternion();
            this._r = new THREE.Quaternion();
            this._v1 = new THREE.Vector3();
            this._v2 = new THREE.Vector3();
            this._s = new THREE.Vector3();
            this._u = new THREE.Vector3();
            this._f = new THREE.Vector3();
            this._h = new THREE.Vector3();
        }

        /* ---------- binding ---------- */

        _bind() {
            const avatars = (this.viewer && this.viewer._sceneAvatars) || [];
            const entry = avatars.find((a) => a.isModel && a.modelRoot && a.id === this.avatarId)
                || avatars.find((a) => a.isModel && a.modelRoot);
            const root = entry && entry.modelRoot;
            if (root === this._root) return !!this._bones;
            this._root = root || null;
            this._bones = null;
            this._saved = null;
            this.resetBlend(); // new model instance → fade gestures in from rest
            if (!root) return false;

            const get = (n) => root.getObjectByName(n);
            const bones = {
                hips: get('Hips'), head: get('Head'), spine2: get('Spine2'),
                R: {
                    arm: get('RightArm'), fore: get('RightForeArm'), hand: get('RightHand')
                },
                L: {
                    arm: get('LeftArm'), fore: get('LeftForeArm'), hand: get('LeftHand')
                }
            };
            const ok = bones.hips && bones.head
                && bones.R.arm && bones.R.fore && bones.R.hand
                && bones.L.arm && bones.L.fore && bones.L.hand;
            this._bones = ok ? bones : null;
            return !!this._bones;
        }

        /**
         * three.js' AnimationMixer only writes a bone when its animated value CHANGED
         * since the previous frame. On "held" frames our offset from last frame would
         * therefore stay on the bone and be applied AGAIN (stacking → arm flicks).
         * So: remember each bone's clean pose + what we wrote; if the mixer did not
         * overwrite our value this frame, put the clean pose back before re-applying.
         */
        _restoreBones() {
            const saved = this._saved;
            if (!saved) return;
            for (let i = 0; i < saved.length; i += 1) {
                const s = saved[i];
                if (s.bone.quaternion.equals(s.out)) s.bone.quaternion.copy(s.base);
            }
            this._saved = null;
        }

        _snapshotBones() {
            const B = this._bones;
            const list = [B.head, B.spine2, B.R.arm, B.R.fore, B.R.hand, B.L.arm, B.L.fore, B.L.hand]
                .filter(Boolean);
            this._saved = list.map((bone) => ({
                bone, base: bone.quaternion.clone(), out: bone.quaternion.clone()
            }));
        }

        _commitBones() {
            if (!this._saved) return;
            this._saved.forEach((s) => { s.out.copy(s.bone.quaternion); });
        }

        /** Drop back to the rest pose so the next gesture eases in (no pop). */
        resetBlend() {
            this.g = 0;
            this.beat = 0;
            this.beatTarget = 0;
            this.cur = { R: { ...ZERO_ARM }, L: { ...ZERO_ARM } };
            this.poseTimer = 0;
        }

        /* ---------- helpers ---------- */

        /** Rotate `bone` by `angle` around a WORLD-space axis. */
        _rotWorld(bone, axis, angle) {
            if (!bone || !bone.parent || Math.abs(angle) < 1e-5) return;
            bone.parent.updateWorldMatrix(true, false);
            bone.parent.getWorldQuaternion(this._pq);
            this._r.setFromAxisAngle(axis, angle);
            // local' = parentWorld⁻¹ · R · parentWorld · local
            bone.quaternion
                .premultiply(this._pq)
                .premultiply(this._r)
                .premultiply(this._pq.invert());
            bone.updateMatrix();
            bone.updateWorldMatrix(false, true);
        }

        _pos(bone, out) {
            return bone.getWorldPosition(out);
        }

        /* ---------- per-frame ---------- */

        update(dt, speaking, level) {
            dt = clamp(dt || 0, 0, 0.05);
            this._restoreBones(); // undo last frame's offsets if the mixer left them in place
            // Hold "speaking" briefly so a one-frame dropout (buffering, TTS hand-off)
            // can't yank the arms back toward rest and forward again.
            if (speaking) this._holdT = 0.35;
            else if (this._holdT > 0) { this._holdT -= dt; speaking = true; }
            const target = speaking ? 1 : 0;
            this.g += (target - this.g) * (1 - Math.exp(-(speaking ? 3 : 2.2) * dt));
            if (this.g < 0.004 && !speaking) {
                this.g = 0;
                return;
            }
            if (!this._bind()) return;

            this.time += dt;
            level = clamp(level || 0, 0, 1);

            // Pick a new gesture every ~2–3.5s while talking
            this.poseTimer -= dt;
            if (speaking && this.poseTimer <= 0) {
                let next = this.poseIdx;
                while (next === this.poseIdx) next = Math.floor(Math.random() * POSES.length);
                this.poseIdx = next;
                this.poseTimer = 1.8 + Math.random() * 1.7;
            }
            const pose = speaking && this.poseIdx >= 0 ? POSES[this.poseIdx] : null;

            // Emphasis beat on speech-energy onsets
            // (attack is eased — a hard 0→1 step would snap the arm a few degrees in one frame)
            if (level - this.prevLevel > 0.18) this.beatTarget = 1;
            this.prevLevel = level;
            if (this.beatTarget > 0.001) {
                this.beat += (this.beatTarget - this.beat) * (1 - Math.exp(-16 * dt));
                if (this.beat > 0.95) this.beatTarget = 0;
            } else {
                this.beat *= Math.exp(-4 * dt);
            }

            // Ease current arm params toward the pose (or back to rest)
            const k = 1 - Math.exp(-4 * dt);
            ['R', 'L'].forEach((side) => {
                const tgt = pose ? pose[side] : ZERO_ARM;
                const c = this.cur[side];
                c.raise += (tgt.raise - c.raise) * k;
                c.out += (tgt.out - c.out) * k;
                c.elbow += (tgt.elbow - c.elbow) * k;
                c.roll += (tgt.roll - c.roll) * k;
            });

            this._snapshotBones();
            this._applyPose(level);
            this._commitBones();
        }

        _applyPose(level) {
            const B = this._bones;
            const g = this.g * this.strength;
            const t = this.time;

            // Character frame from the skeleton
            this._pos(B.hips, this._v1);
            this._pos(B.head, this._v2);
            this._u.copy(this._v2).sub(this._v1).normalize();                 // up
            this._pos(B.R.arm, this._v1);
            this._pos(B.L.arm, this._v2);
            this._s.copy(this._v1).sub(this._v2);                              // toward char's right
            this._s.addScaledVector(this._u, -this._s.dot(this._u)).normalize();
            this._f.crossVectors(this._u, this._s).normalize();               // forward

            const u = this._u;
            const s = this._s;
            const f = this._f;
            const beat = this.beat;

            // Subtle head nod + spine turn toward the more active hand
            this._rotWorld(B.head, s, (0.03 + 0.05 * level) * Math.sin(t * 2.3) * g + beat * 0.03 * g);
            if (B.spine2) {
                const lean = (this.cur.R.raise - this.cur.L.raise) * D * 0.004;
                this._rotWorld(B.spine2, u, -lean * g);
            }

            ['R', 'L'].forEach((side, idx) => {
                const sign = side === 'R' ? 1 : -1;
                const c = this.cur[side];
                const bn = B[side];
                const phase = idx * 1.7;

                // Gentle "talking hands" motion + beat accent
                const sway = Math.sin(t * 2.1 + phase) * 4 * D;
                const bob = Math.sin(t * 3.4 + phase) * 3 * D;

                const raise = (c.raise * D + sway * 0.6 + beat * 7 * D * (c.raise > 20 ? 1 : 0.3)) * g;
                const out = (c.out * D) * g;
                const elbow = (c.elbow * D + bob + beat * 9 * D * (c.elbow > 40 ? 1 : 0.3)) * g;
                const roll = (c.roll * D + Math.sin(t * 2.8 + phase) * 6 * D) * g;

                // 1) small abduction so the arm clears the torso, 2) raise forward,
                // 3) yaw outward (away from the body)
                this._rotWorld(bn.arm, f, -sign * Math.min(out, 18 * D) * 0.6);
                this._rotWorld(bn.arm, s, raise);
                this._rotWorld(bn.arm, u, -sign * out);

                // Elbow hinge = side axis, yawed with the upper arm
                this._h.copy(s);
                this._r.setFromAxisAngle(u, -sign * out);
                this._h.applyQuaternion(this._r).normalize();
                this._rotWorld(bn.fore, this._h, elbow);

                // Palm roll about the forearm direction
                this._pos(bn.fore, this._v1);
                this._pos(bn.hand, this._v2);
                this._v2.sub(this._v1);
                if (this._v2.lengthSq() > 1e-8) {
                    this._v2.normalize();
                    this._rotWorld(bn.hand, this._v2, sign * roll);
                }
            });
        }
    }

    window.AvatarGestures = AvatarGestures;
})();
