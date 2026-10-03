# Implementation Plan: Tabuk Pharmaceuticals WebXR Induction Experience

## Overview
Develop a fully interactive, production-ready **WebXR Learning Experience** for **Tabuk Pharmaceuticals' Employee Induction**, compliant with the **Service Provider Agreement SOW** and based on the approved storyboard (`Tabuk Pharma_Induction Module_Sample Deck_27Mar2026.pptx`). The module features 4 immersive environments, interactive hotspots with rich informational modals, directional spatial navigation, an end-of-module assessment, and full **SCORM 1.2 packaging** for LMS integration.

---

## User Review Required

> [!IMPORTANT]
> **Client Assets & Media**:
> - We will use the extracted high-resolution mockups from the client storyboard (`image1.jpeg` through `image20.jpeg`) as the core photographic environment and modal textures.
> - When client-produced 360° equirectangular video files are delivered, they will be drop-in replacements via the configuration manifest without altering any interaction logic.

> [!NOTE]
> **Offline SCORM 1.2 Compliance**:
> LMS firewalls often restrict internet access for SCORM packages. All core dependencies (Three.js 3D/XR engine, icons, fonts) will be bundled locally inside the project package so the course operates 100% offline inside any LMS iframe or offline learning app.

---

## Architecture & Interaction Design

### 1. The 4 Distinct Environments
1. **Environment 1: Riyadh HQ (Arrival & Welcome)**
   - Welcome intro card & audio narrative introduction.
   - Hotspot 1: *Who We Are* (Interactive digital display: Founded 1994, Largest Private Pharma in KSA, 2,400+ Professionals, 17+ MENA Countries).
   - Hotspot 2: *Vision, Mission & Values* (Interactive Iceberg model: Integrity, Respect for People, Results, Stakeholder-Centric).
   - Hotspot 3 / Portal: Elevator portal transition ("Follow arrow to lift. Next stop: Dammam Plant").

2. **Environment 2: Dammam Plant (Work in Action)**
   - Elevator opening sequence transitioning to Dammam reception and QC & Formulation Laboratory.
   - Hotspot 1: *Scale & Sites* (Manufacturing footprint: Tabuk, Dammam, Algeria, Sudan supplying MENA).
   - Hotspot 2: *Quality Control & Research* (Microscope / Laboratory testing standards).
   - Hotspot 3: *Packaging & Formulations* (Safe dispensing & regional logistics).
   - Hotspot 4 / Portal: Transition arrow to Tabuk Plant.

3. **Environment 3: Tabuk Plant & Boardroom (People, Leadership & Culture)**
   - Arrival at Tabuk flagship facility & executive boardroom.
   - Hotspot 1: *Leadership Team Grid* (CEO Ismail Shehada and executive directors with bios/quotes).
   - Hotspot 2: *People & Culture* ("Great Place To Work" certification & 2,400+ people purpose).
   - Hotspot 3 / Portal: Transition to Final Assessment Hub.

4. **Environment 4: Assessment & Induction Certification Hub**
   - 4-question interactive induction assessment verifying core knowledge.
   - Real-time score calculation, immediate explanatory feedback, and pass/fail determination (80% passing grade).
   - SCORM 1.2 state recording: `cmi.core.lesson_status` (`passed` / `failed`), `cmi.core.score.raw`, and `cmi.core.session_time`.
   - Completion screen: *"Welcome to the team"* certificate card.

---

## Proposed Changes

### Core Engine & Architecture

#### [NEW] [index.html](file:///Users/romitpatil/Documents/GitHub/WEBXR/index.html)
- Main WebXR entry container with responsive canvas, glassmorphic HUD, scene title cards, hotspot overlay layer, accessibility drawer, and VR headset button (`Enter XR`).

#### [NEW] [css/style.css](file:///Users/romitpatil/Documents/GitHub/WEBXR/css/style.css)
- Premium styling adhering to Tabuk brand identity (Navy `#004B87`, Emerald `#00A859`, frosted glassmorphism cards, pulsating circular hotspot animations, directional chevrons, and mobile-responsive overlays).

#### [NEW] [js/courseData.js](file:///Users/romitpatil/Documents/GitHub/WEBXR/js/courseData.js)
- Central data configuration defining scenes, 360 spherical coordinates for hotspots, modal dialog content, image references, and the 4 assessment questions.

#### [NEW] [js/viewer.js](file:///Users/romitpatil/Documents/GitHub/WEBXR/js/viewer.js)
- High-performance Three.js 360° panorama & WebXR engine.
- Supports desktop mouse drag/scroll, touch swipe, device orientation/gyroscope on mobile, and immersive WebXR VR on headsets (Meta Quest, Apple Vision Pro, Cardboard).

#### [NEW] [js/hotspots.js](file:///Users/romitpatil/Documents/GitHub/WEBXR/js/hotspots.js)
- 3D spatial hotspot projection and raycasting engine with custom vector SVG icons (Information, Values, Team, Video, Portal).

#### [NEW] [js/modal.js](file:///Users/romitpatil/Documents/GitHub/WEBXR/js/modal.js)
- Responsive modal manager supporting slide popups (Who We Are, Iceberg Values, Leadership Team grid, Scale & Sites).

#### [NEW] [js/assessment.js](file:///Users/romitpatil/Documents/GitHub/WEBXR/js/assessment.js)
- Interactive quiz engine featuring question pagination, answer selection, explanation feedback, retry mechanics, and LMS grade synchronization.

#### [NEW] [js/scorm.js](file:///Users/romitpatil/Documents/GitHub/WEBXR/js/scorm.js)
- Robust SCORM 1.2 API wrapper with auto-discovery of parent/opener LMS API, fallback offline mode, and error handling.

#### [NEW] [imsmanifest.xml](file:///Users/romitpatil/Documents/GitHub/WEBXR/imsmanifest.xml)
- SCORM 1.2 package manifest with metadata, resource references, and launch configuration.

#### [NEW] [package_scorm.py](file:///Users/romitpatil/Documents/GitHub/WEBXR/package_scorm.py)
- Packaging script that validates SCORM assets and compiles a clean `Tabuk_Pharma_WebXR_Induction_SCORM1.2.zip` deliverable.

---

## Verification Plan

### Automated & Structural Checks
- Verify SCORM 1.2 manifest XML validation (`xmllint` or Python `xml.etree`).
- Verify asset integrity and image paths.
- Verify SCORM package ZIP creation.

### Interactive Browser Verification
- Start local HTTP server (`python3 -m http.server 8080`).
- Test via browser subagent:
  1. Initial induction launch & instructions.
  2. 360° panoramic navigation across all 4 environments.
  3. Clicking hotspots and verifying modal popups (Who We Are, Values, Leadership).
  4. Completing the end-of-module assessment with 100% score.
  5. Inspecting SCORM API calls in console log (`LMSInitialize`, `LMSSetValue(cmi.core.lesson_status, passed)`, `LMSCommit`, `LMSFinish`).
