/**
 * Tabuk Pharmaceuticals - WebXR Induction Course Data Configuration
 * Defines environments, spherical coordinates, hotspot metadata, modals, and assessment questions.
 */

window.COURSE_DATA = {
    meta: {
        title: "TABUK PHARMACEUTICALS · INDUCTION",
        subtitle: "25 Years of Purpose. 2,400+ People. One Shared Mission.",
        author: "Tabuk Pharmaceuticals Learning & Development",
        passingScore: 75,
        version: "1.0.0"
    },
    scenes: {
        "approach": {
            id: "approach",
            title: "Approaching Campus",
            subtitle: "Far from Building",
            envType: "intro",
            bgVideo: "Videos/far_from_building_4k.mov",
            bgImage: "assets/images/scene0_exterior.jpg",
            initialPitch: 1,
            initialYaw: 188,
            sphereYaw: 0,
            cardText: "Approach Campus\nFind the marker to enter",
            hotspots: [
                {
                    id: "enter_welcome",
                    type: "portal",
                    icon: "arrow",
                    label: "Enter Tabuk",
                    pitch: -10,
                    yaw: 184,
                    arrowYaw: 0,
                    targetScene: "welcome"
                }
            ]
        },
        "welcome": {
            id: "welcome",
            title: "Induction Welcome",
            subtitle: "Your First Day at Tabuk",
            envType: "intro",
            bgVideo: "Videos/welcome_360_4k.mov",
            bgImage: "assets/images/scene0_exterior.jpg",
            initialPitch: 3,
            initialYaw: 165,
            sphereYaw: 0,
            cardText: "Arrival & Welcome\nRiyadh HQ",
            hotspots: [
                {
                    id: "enter_reception",
                    type: "portal",
                    icon: "arrow",
                    label: "Enter Reception",
                    pitch: -10,
                    yaw: 165,
                    arrowYaw: 0,
                    targetScene: "reception"
                }
            ]
        },
        "reception": {
            id: "reception",
            title: "Corporate Reception",
            subtitle: "Riyadh HQ Arrival",
            envType: "intro",
            bgVideo: "Videos/51_D_4k.mov",
            bgImage: "assets/images/scene0_exterior.jpg",
            initialPitch: -1,
            initialYaw: 176,
            sphereYaw: 0,
            cardText: "Corporate Reception\nFind the marker to continue",
            // Glue panels onto screens in the 360 — pin 4 corners in DEV
            screenOverlays: [
                {
                    id: "who_we_are_tv",
                    image: "assets/images/modal_who_we_are.jpg",
                    radius: 370.0,
                    corners: {
                        tl: { pitch: 2.2, yaw: 207.0 },
                        tr: { pitch: 2.1, yaw: 216.2 },
                        br: { pitch: -3.9, yaw: 216.3 },
                        bl: { pitch: -4.6, yaw: 207.0 }
                    }
                },
                {
                    // Behind Vision / Mission / Values play hotspot (lift area)
                    id: "vmv_board",
                    image: "assets/images/vmv_iceberg_board.png",
                    radius: 272.5,
                    corners: {
                        tl: { pitch: 5.8, yaw: 137.4 },
                        tr: { pitch: 6.2, yaw: 193.3 },
                        br: { pitch: -31.0, yaw: 194.8 },
                        bl: { pitch: -31.6, yaw: 137.7 }
                    }
                }
            ],
            hotspots: [
                {
                    id: "welcome_guide",
                    type: "avatar",
                    model: "assets/models/welcome_guide.glb?v=6",
                    // PNG fallback if GLB fails to load
                    image: "assets/images/welcome_tip_avatar.png?v=4",
                    label: "Welcome Guide",
                    // Level 1 — centered on welcome-guide spot
                    pitch: -27.5,
                    yaw: 118.5,
                    // Level 2 start — feet on floor by reception desk
                    level2Pitch: -27.5,
                    level2Yaw: 126.5,                    interactive: false,
                    radius: 291,
                    offsetY: 3,
                    worldHeight: 128,
                    worldWidth: 20,
                    modelScale: 0.89,
                    worldRotX: 0,
                    worldRot: 26,
                    worldRotZ: 0
                },
                {
                    id: "welcome_guide_name",
                    type: "nametag",
                    label: "Tariq",
                    // Floating HTML name pill — follows look L/R like hotspots
                    pitch: -18,
                    yaw: 124,
                    level2Pitch: -18,
                    level2Yaw: 130,                    rot: 0,
                    interactive: false
                },
                {
                    id: "video_welcome",
                    type: "portal",
                    icon: "arrow",
                    label: "CEO Welcome",
                    prompt: "Follow the arrow to view the CEO message",
                    pitch: -23,
                    yaw: 153,
                    arrowYaw: 0,
                    promptOffsetY: 6,
                    arrowScale: 0.7,
                    modalId: "modal_video_welcome"
                },
                {
                    id: "video_chro_welcome",
                    type: "portal",
                    icon: "arrow",
                    label: "CHRO Welcome",
                    prompt: "Follow the arrow to view the CHRO message",
                    pitch: -23,
                    yaw: 199,
                    arrowYaw: 0,
                    promptOffsetY: 6,
                    arrowScale: 0.7,
                    modalId: "modal_video_chro"
                },
                {
                    id: "enter_hq",
                    type: "portal",
                    icon: "arrow",
                    label: "Next to reception on left",
                    pitch: -17,
                    yaw: 132,
                    arrowYaw: 0,
                    targetScene: "riyadh_hq"
                },
                {
                    // After CHRO close — placeholder 360 until the real right-reception video lands
                    id: "next_reception_right",
                    type: "portal",
                    icon: "arrow",
                    label: "Next to reception on right",
                    prompt: "Follow the arrow to discover who we are",
                    pitch: -11,
                    yaw: 217,
                    arrowYaw: 0,
                    promptOffsetY: 6,
                    arrowScale: 0.7,
                    // Stay on reception 51_D — no white_360 swap
                    stayInScene: true,
                    lookPitch: -1,
                    lookYaw: 212
                },
                {
                    // Play control on the reception TV — Slide 9 Who We Are entry
                    id: "reception_right_video",
                    type: "modal",
                    icon: "monitor",
                    hideLabel: true,
                    label: "Who We Are",
                    prompt: "Click Play to discover who we are.",
                    pitch: -1,
                    yaw: 212,
                    playOffsetY: 0
                },
                {
                    // After Who We Are — turn to VMV board in reception 51_D_4k
                    id: "discover_what_guides",
                    type: "portal",
                    icon: "arrow",
                    label: "Discover what guides us",
                    prompt: "Follow the arrow to discover what guides us.",
                    pitch: -3,
                    yaw: 177,
                    arrowYaw: 0,
                    promptOffsetY: 6,
                    arrowScale: 0.7,
                    // Play lift 360, then show VMV board + play hotspot
                    transitionVideo: "Videos/Lift_4k.mov",
                    transitionIs360: true,
                    arriveLiftVmv: true,
                    // Camera when this arrow appears (after Who We Are)
                    revealPitch: -1,
                    revealYaw: 176,
                    // Camera after click — lift / VMV board view
                    lookPitch: 1,
                    lookYaw: 164
                },
                {
                    // At the lift area — single entry into Vision → Mission → Values
                    id: "vision_mission_values",
                    type: "portal",
                    icon: "arrow",
                    label: "Vision, Mission & Values",
                    prompt: "Tap to explore Vision, Mission & Values",
                    pitch: -15,
                    yaw: 127,
                    arrowYaw: 0,
                    promptOffsetY: 6,
                    arrowScale: 0.7,
                    showPlay: true,
                    hideArrow: true,
                    openValuesExperience: true
                },
                {
                    // Level 2 reception — digital kiosk (journey ends here for now)
                    id: "level2_kiosk",
                    type: "portal",
                    glue: true,
                    image: "assets/images/level2_kiosk.png",
                    label: "Level 2",
                    prompt: "Select the marked location to move to Level 2.",
                    pitch: -19.5,
                    yaw: 268,
                    // Scene 360 look when Level 2 / kiosk is active
                    revealPitch: 0,
                    revealYaw: -92,
                    radius: 266,
                    offsetY: -20,
                    worldHeight: 150,
                    worldWidth: 127,
                    modelScale: 1.92,
                    worldRotX: 0,
                    worldRot: 0,
                    worldRotZ: 0,
                    flipX: true,
                    promptOffsetX: -74,
                    promptOffsetY: -32
                }
            ]
        },
        "riyadh_hq": {
            id: "riyadh_hq",
            title: "Riyadh Headquarters",
            subtitle: "Arrival & Welcome",
            envIndex: 1,
            bgImage: "assets/images/image4.jpeg",
            initialPitch: -2,
            initialYaw: 0,
            cardText: "Arrival & Welcome\nRiyadh HQ",
            // Glue image onto the TV / screen in the 360 — pin all 4 corners (DEV)
            screenOverlays: [
                {
                    id: "who_we_are_tv",
                    image: "assets/images/modal_who_we_are.jpg",
                    radius: 480,
                    corners: {
                        tl: { pitch: 12, yaw: 0 },
                        tr: { pitch: 12, yaw: 14 },
                        br: { pitch: 2, yaw: 14 },
                        bl: { pitch: 2, yaw: 0 }
                    }
                }
            ],
            hotspots: [
                {
                    id: "video_welcome",
                    type: "portal",
                    icon: "arrow",
                    label: "CEO Welcome",
                    prompt: "Follow the arrow to view the CEO message",
                    pitch: -2,
                    yaw: 0,
                    arrowYaw: 0,
                    promptOffsetY: 6,
                    arrowScale: 0.7,
                    modalId: "modal_video_welcome"
                },
                {
                    id: "who_we_are",
                    type: "modal",
                    icon: "info",
                    label: "Who We Are",
                    pitch: 7,
                    yaw: 7,
                    modalId: "modal_who_we_are"
                },
                {
                    id: "reception_desk",
                    type: "info",
                    icon: "building",
                    label: "Corporate Reception",
                    pitch: -6,
                    yaw: -28,
                    title: "Corporate Reception",
                    text: "Welcome to Tabuk Pharmaceuticals Headquarters in Riyadh. From this central hub, Tabuk coordinates strategic operations, healthcare partnerships, and regulatory leadership across the MENA region.",
                    bullets: ["Founded in Riyadh (1994)", "Headquarters & Regional Leadership", "Serving 17+ MENA Countries"]
                },
                {
                    id: "nav_to_elevator",
                    type: "portal",
                    icon: "arrow",
                    label: "Enter Corridor & Lift",
                    pitch: -20,
                    yaw: 18,
                    targetScene: "riyadh_elevator"
                }
            ]
        },
        "riyadh_elevator": {
            id: "riyadh_elevator",
            title: "Vision & Values Hub",
            subtitle: "Riyadh Foyer & Elevator",
            envIndex: 1,
            bgImage: "assets/images/scene1_elevator_values.jpg",
            initialPitch: -4,
            initialYaw: 76,
            sphereYaw: 0,
            cardText: "Next stop: The Dammam Plant.\nLet’s see where Tabuk’s medicines are made.",
            // Level 2 onward (Dammam / quizzes) removed from active path
            hotspots: []
        },
        "dammam_reception": {
            id: "dammam_reception",
            title: "Dammam Manufacturing Plant",
            subtitle: "Work in Action",
            envIndex: 2,
            bgImage: "assets/images/scene2_dammam_reception.jpg",
            initialPitch: -1,
            initialYaw: 0,
            cardText: "Work in Action\nDammam Plant",
            // Level 2 drop — reception area with 3D guide + name only
            hotspots: [
                {
                    id: "dammam_guide",
                    type: "avatar",
                    model: "assets/models/welcome_guide.glb?v=6",
                    image: "assets/images/welcome_tip_avatar.png?v=4",
                    label: "Site Guide",
                    pitch: -22,
                    yaw: 8,
                    interactive: false,
                    radius: 280,
                    offsetY: 3,
                    worldHeight: 128,
                    worldWidth: 20,
                    modelScale: 0.89,
                    worldRotX: 0,
                    worldRot: 0,
                    worldRotZ: 0
                },
                {
                    id: "dammam_guide_name",
                    type: "nametag",
                    label: "Tariq",
                    pitch: -12,
                    yaw: 10,
                    rot: 0,
                    interactive: false
                }
            ]
        },
        "dammam_lab": {
            id: "dammam_lab",
            title: "QC & Formulation Laboratory",
            subtitle: "Research & Manufacturing Standards",
            envIndex: 2,
            bgImage: "assets/images/scene2_dammam_lab.jpg",
            initialPitch: -5,
            initialYaw: 0,
            cardText: "Quality Control & Formulation\nModern Analytical Labs",
            hotspots: [
                {
                    id: "scale_sites_monitor",
                    type: "modal",
                    icon: "globe",
                    label: "Scale & Sites Network",
                    pitch: 12,
                    yaw: -28,
                    modalId: "modal_scale_sites"
                },
                {
                    id: "quality_microscope",
                    type: "info",
                    icon: "check",
                    label: "Quality & Compliance",
                    pitch: 6,
                    yaw: 15,
                    title: "Quality Assurance & Standards",
                    text: "Every batch of raw material and finished medicine undergoes multi-stage chromatographic, microbiological, and stability testing ensuring 100% compliance with SFDA and international regulatory guidelines.",
                    bullets: ["Chromatographic testing", "Microbiological assays", "100% SFDA compliance"]
                },
                {
                    id: "meds_packaging",
                    type: "info",
                    icon: "dropper",
                    label: "Formulation Portfolio",
                    pitch: -3,
                    yaw: 52,
                    title: "Medicine Portfolio & Formulation",
                    text: "Tabuk manufactures essential therapies spanning cardiology, anti-infectives, neurology, gastroenterology, and pain management for millions of patients across 17+ countries.",
                    bullets: ["Cardiology & Neurology", "Anti-infectives & Antibiotics", "Gastroenterology & Pain Care"]
                },
                {
                    id: "nav_to_tabuk_plant",
                    type: "portal",
                    icon: "arrow",
                    label: "Proceed to Tabuk Campus",
                    pitch: -20,
                    yaw: 0,
                    targetScene: "tabuk_plant"
                }
            ]
        },
        "tabuk_plant": {
            id: "tabuk_plant",
            title: "Tabuk Campus & Facilities",
            subtitle: "People, Leadership & Next Steps",
            envIndex: 3,
            bgImage: "assets/images/scene3_tabuk_plant.jpg",
            initialPitch: -2,
            initialYaw: 0,
            cardText: "People, Leadership & Next Steps\nTabuk Plant",
            hotspots: [
                {
                    id: "tabuk_campus_info",
                    type: "info",
                    icon: "factory",
                    label: "Flagship Manufacturing Site",
                    pitch: 4,
                    yaw: -2,
                    title: "Flagship Tabuk Campus",
                    text: "Located in Tabuk, this facility forms the bedrock of Tabuk's industrial manufacturing. It houses high-volume production, research facilities, and sustainable green initiatives supporting Saudi Vision 2030.",
                    bullets: ["Flagship manufacturing campus", "High-volume solids & liquids", "Saudi Vision 2030 alignment"]
                },
                {
                    id: "great_place_work",
                    type: "info",
                    icon: "award",
                    label: "Great Place to Work",
                    pitch: -12,
                    yaw: -15,
                    title: "Great Place to Work® Certified",
                    text: "Tabuk Pharmaceuticals is proudly certified as a 'Great Place To Work', fostering an inclusive, empowering environment for over 2,400 professionals across the MENA region.",
                    bullets: ["Certified employer of choice", "2,400+ talented professionals", "Continuous career development"]
                },
                {
                    id: "nav_to_boardroom",
                    type: "portal",
                    icon: "arrow",
                    label: "Enter Executive Boardroom",
                    pitch: -14,
                    yaw: 28,
                    targetScene: "tabuk_boardroom"
                }
            ]
        },
        "tabuk_boardroom": {
            id: "tabuk_boardroom",
            title: "Executive Boardroom",
            subtitle: "Leadership & Strategic Vision",
            envIndex: 3,
            bgImage: "assets/images/scene3_tabuk_boardroom.jpg",
            initialPitch: 0,
            initialYaw: 0,
            cardText: "Strategic Leadership\nExecutive Suite",
            hotspots: [
                {
                    id: "leadership_team",
                    type: "modal",
                    icon: "users",
                    label: "Our Leadership Team",
                    pitch: 5,
                    yaw: 0,
                    modalId: "modal_leadership"
                },
                {
                    id: "nav_to_assessment",
                    type: "portal",
                    icon: "arrow",
                    label: "Proceed to Induction Assessment",
                    pitch: -15,
                    yaw: 0,
                    targetScene: "assessment_hub"
                }
            ]
        },
        "assessment_hub": {
            id: "assessment_hub",
            title: "Knowledge Assessment",
            subtitle: "Induction Evaluation Hub",
            envIndex: 4,
            bgImage: "assets/images/scene4_summary.jpg",
            initialPitch: 0,
            initialYaw: 0,
            cardText: "Induction Assessment\nKnowledge Check",
            isAssessment: true,
            hotspots: []
        },
        "completion": {
            id: "completion",
            title: "Induction Complete",
            subtitle: "Welcome to Tabuk Pharmaceuticals",
            envIndex: 4,
            bgImage: "assets/images/scene4_completion.jpg",
            initialPitch: 0,
            initialYaw: 0,
            cardText: "Welcome to the Team\nTabuk Pharmaceuticals",
            isCompletion: true,
            hotspots: []
        }
    },

    modals: {
        "modal_who_we_are": {
            title: "WHO WE ARE",
            image: "assets/images/modal_who_we_are.jpg"
        },
        "modal_values": {
            title: "OUR CORE VALUES",
            subtitle: "The Iceberg Model: What Drives the One Tabuk Team",
            values: [
                {
                    name: "INTEGRITY",
                    icon: "⚖️",
                    desc: "Upholding uncompromising ethical standards, clinical transparency, and scientific honesty."
                },
                {
                    name: "RESPECT FOR PEOPLE",
                    icon: "🤝",
                    desc: "Valuing our 2,400+ diverse colleagues, listening actively, and treating all patients with empathy."
                },
                {
                    name: "RESULTS",
                    icon: "📋",
                    desc: "Executing with urgency and holding ourselves accountable to the highest milestones."
                },
                {
                    name: "STAKEHOLDER CENTRIC",
                    icon: "🎯",
                    desc: "Placing patients, healthcare providers, communities, and regulators at the center."
                }
            ]
        },
        "modal_scale_sites": {
            title: "Scale & Sites"
        },
        "modal_leadership": {
            title: "Our Leadership Team"
        }
    },

    assessment: [
        {
            id: "q1",
            question: "In what year was Tabuk Pharmaceuticals founded in Riyadh, Saudi Arabia?",
            options: [
                "1994",
                "2002",
                "1985",
                "2010"
            ],
            correctIndex: 0,
            feedback: "Correct! Tabuk Pharmaceuticals was founded in 1994 with a vision to create a national pharmaceutical champion in KSA."
        },
        {
            id: "q2",
            question: "How many manufacturing facilities make up Tabuk's regional production network across MENA?",
            options: [
                "2 facilities (Riyadh and Jeddah)",
                "4 facilities (Tabuk, Dammam, Algeria, Sudan)",
                "6 facilities across Europe",
                "1 single facility in Tabuk"
            ],
            correctIndex: 1,
            feedback: "Correct! Tabuk's manufacturing footprint spans 4 key production sites: Tabuk, Dammam, Algeria, and Sudan."
        },
        {
            id: "q3",
            question: "Which of the following is NOT one of Tabuk's core values under the 'One Tabuk Team' framework?",
            options: [
                "Integrity",
                "Respect for People",
                "Immediate Short-term Profits",
                "Stakeholder Centric"
            ],
            correctIndex: 2,
            feedback: "Correct! Tabuk's 4 core values are Integrity, Respect for People, Results, and Stakeholder Centric."
        },
        {
            id: "q4",
            question: "Who serves as the Chief Executive Officer (CEO) of Tabuk Pharmaceuticals?",
            options: [
                "Ismail Shehada",
                "Dr. Khalid Al-Faisal",
                "Tariq Mansoor",
                "Fahad Al-Rasheed"
            ],
            correctIndex: 0,
            feedback: "Correct! Ismail Shehada leads Tabuk Pharmaceuticals as Chief Executive Officer."
        }
    ]
};
