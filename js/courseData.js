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
            initialPitch: 0,
            initialYaw: 178,
            sphereYaw: 0,
            cardText: "Corporate Reception\nFind the marker to continue",
            hotspots: [
                {
                    id: "welcome_guide",
                    type: "avatar",
                    image: "assets/images/welcome_tip_avatar.png",
                    label: "Welcome Guide",
                    // Glued to 360 sphere at pitch/yaw (3D plane — sticks like gum)
                    pitch: -31,
                    yaw: 123,
                    interactive: false,
                    radius: 400,
                    worldHeight: 222,
                    worldWidth: 56
                },
                {
                    id: "video_welcome",
                    type: "modal",
                    icon: "play",
                    label: "CEO Welcome — tap to play",
                    pitch: -8,
                    yaw: 153,
                    modalId: "modal_video_welcome"
                },
                {
                    id: "video_chro_welcome",
                    type: "modal",
                    icon: "play",
                    label: "CHRO Welcome — Tap to play",
                    pitch: -3,
                    yaw: 201,
                    modalId: "modal_video_chro"
                },
                {
                    id: "enter_hq",
                    type: "portal",
                    icon: "arrow",
                    label: "Enter Headquarters",
                    pitch: -22,
                    yaw: 130,
                    arrowYaw: 0,
                    targetScene: "riyadh_hq"
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
            hotspots: [
                {
                    id: "video_welcome",
                    type: "modal",
                    icon: "play",
                    label: "CEO Welcome — tap to play",
                    pitch: -2,
                    yaw: 0,
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
            initialPitch: 0,
            initialYaw: 0,
            cardText: "Next stop: The Dammam Plant.\nLet’s see where Tabuk’s medicines are made.",
            hotspots: [
                {
                    id: "vision_hotspot",
                    type: "info",
                    icon: "eye",
                    label: "Our Vision",
                    pitch: 18,
                    yaw: -32,
                    title: "Tabuk Vision",
                    text: "To be a leading pharmaceutical company valued for its trusted and diversified products across regional and global markets.",
                    bullets: ["Trusted healthcare partner", "Diversified therapeutic portfolio", "Regional and global reach"]
                },
                {
                    id: "mission_hotspot",
                    type: "info",
                    icon: "target",
                    label: "Our Mission",
                    pitch: 18,
                    yaw: 35,
                    title: "Tabuk Mission",
                    text: "Investing in differentiated technologies to deliver high quality, affordable generic medicines for better global healthcare.",
                    bullets: ["Differentiated technologies", "High quality & affordability", "Better healthcare outcomes"]
                },
                {
                    id: "values_iceberg",
                    type: "modal",
                    icon: "diamond",
                    label: "Core Values",
                    pitch: -8,
                    yaw: -28,
                    modalId: "modal_values"
                },
                {
                    id: "nav_to_dammam",
                    type: "portal",
                    icon: "arrow",
                    label: "Board Lift to Dammam Plant",
                    pitch: -12,
                    yaw: -48,
                    targetScene: "dammam_reception"
                }
            ]
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
            hotspots: [
                {
                    id: "dammam_overview",
                    type: "info",
                    icon: "factory",
                    label: "Dammam Facility",
                    pitch: -4,
                    yaw: 0,
                    title: "Dammam Production Center",
                    text: "The Dammam site is a state-of-the-art pharmaceutical manufacturing and testing hub equipped with high-speed sterile filling, solids, and semi-solids lines meeting rigorous international GMP standards.",
                    bullets: ["High-speed sterile filling", "International GMP compliance", "Rapid packaging lines"]
                },
                {
                    id: "nav_to_lab",
                    type: "portal",
                    icon: "arrow",
                    label: "Enter QC & Formulation Lab",
                    pitch: -18,
                    yaw: -25,
                    targetScene: "dammam_lab"
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
