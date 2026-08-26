// Master curriculum scaffold for the whole PHYS 211 course (Cutnell &
// Johnson 12e, algebra/trig based). This module is PURE METADATA — chapter
// and skill titles/ordering only. It knows nothing about how problems are
// generated; that lives in archetypeRegistry.js, keyed by these same skill
// ids. Only Chapter 1's skills currently have archetypes registered — the
// rest are scaffolding for later chapters, per the build-order agreed with
// the user (architecture + Chapter 1 first).
//
// IDs are stable strings — safe to reference from mastery records, saved
// games, and dev tools without breaking when content is reordered.

export const CHAPTERS = [
  {
    id: 'ch1', order: 1, title: 'Mathematical Concepts',
    skills: [
      { id: 'ch1.units', title: 'Units, SI System & Dimensional Analysis' },
      { id: 'ch1.sci-notation', title: 'Scientific Notation' },
      { id: 'ch1.sigfigs', title: 'Significant Figures' },
      { id: 'ch1.unit-conversion', title: 'Unit Conversions' },
      { id: 'ch1.trig', title: 'Right-Triangle Trigonometry' },
      { id: 'ch1.vector-basics', title: 'Scalars, Vectors & Direction' },
      { id: 'ch1.vector-components', title: 'Resolving Vectors into Components' },
      { id: 'ch1.vector-addition', title: 'Vector Addition & Subtraction' },
    ],
  },
  {
    id: 'ch2', order: 2, title: '1D Kinematics',
    skills: [
      { id: 'ch2.position-displacement', title: 'Position & Displacement' },
      { id: 'ch2.speed-velocity', title: 'Speed & Velocity' },
      { id: 'ch2.acceleration', title: 'Acceleration' },
      { id: 'ch2.kinematic-equations', title: 'Kinematic Equations' },
      { id: 'ch2.motion-graphs', title: 'Motion Graphs' },
      { id: 'ch2.free-fall', title: 'Free Fall' },
      { id: 'ch2.multistage-motion', title: 'Multi-Stage 1D Motion' },
    ],
  },
  {
    id: 'ch3', order: 3, title: '2D Kinematics',
    skills: [
      { id: 'ch3.vector-motion', title: '2D Displacement, Velocity & Acceleration Vectors' },
      { id: 'ch3.projectile-horizontal', title: 'Horizontal Launches' },
      { id: 'ch3.projectile-angled', title: 'Angled Launches' },
      { id: 'ch3.projectile-range', title: 'Max Height, Time of Flight & Range' },
      { id: 'ch3.projectile-velocity', title: 'Velocity at a Point in Flight' },
    ],
  },
  {
    id: 'ch4', order: 4, title: "Forces & Newton's Laws",
    skills: [
      { id: 'ch4.newtons-laws', title: "Newton's Three Laws & Inertia" },
      { id: 'ch4.weight-normal', title: 'Mass, Weight & Normal Force' },
      { id: 'ch4.friction', title: 'Static & Kinetic Friction' },
      { id: 'ch4.tension-pulleys', title: 'Tension & Pulley Systems' },
      { id: 'ch4.free-body-diagrams', title: 'Free-Body Diagrams' },
      { id: 'ch4.inclines', title: 'Inclined Surfaces' },
      { id: 'ch4.equilibrium', title: 'Equilibrium & Multiple Forces' },
    ],
  },
  {
    id: 'ch5', order: 5, title: 'Uniform Circular Motion',
    skills: [
      { id: 'ch5.centripetal-acceleration', title: 'Centripetal Acceleration' },
      { id: 'ch5.centripetal-force', title: 'Centripetal Force' },
      { id: 'ch5.circular-applications', title: 'Curves & Gravitational Applications' },
    ],
  },
  {
    id: 'ch6', order: 6, title: 'Work & Energy',
    skills: [
      { id: 'ch6.work', title: 'Work' },
      { id: 'ch6.kinetic-energy', title: 'Kinetic Energy' },
      { id: 'ch6.potential-energy', title: 'Gravitational & Elastic Potential Energy' },
      { id: 'ch6.work-energy-theorem', title: 'Work-Energy Theorem' },
      { id: 'ch6.conservation-energy', title: 'Conservation of Mechanical Energy' },
      { id: 'ch6.power', title: 'Power' },
    ],
  },
  {
    id: 'ch7', order: 7, title: 'Impulse & Momentum',
    skills: [
      { id: 'ch7.momentum-impulse', title: 'Momentum & Impulse-Momentum Theorem' },
      { id: 'ch7.conservation-momentum', title: 'Conservation of Momentum' },
      { id: 'ch7.collisions-elastic', title: 'Elastic Collisions' },
      { id: 'ch7.collisions-inelastic', title: 'Inelastic Collisions & Recoil' },
      { id: 'ch7.momentum-2d', title: 'Basic 2D Momentum Problems' },
    ],
  },
  {
    id: 'ch8', order: 8, title: 'Rotational Kinematics',
    skills: [
      { id: 'ch8.angular-displacement', title: 'Angular Displacement & Radians' },
      { id: 'ch8.angular-velocity-acceleration', title: 'Angular Velocity & Acceleration' },
      { id: 'ch8.rotational-kinematic-equations', title: 'Rotational Kinematic Equations' },
      { id: 'ch8.angular-linear-relationships', title: 'Angular ↔ Linear Relationships' },
    ],
  },
  {
    id: 'ch9', order: 9, title: 'Rotational Dynamics',
    skills: [
      { id: 'ch9.torque', title: 'Torque & Lever Arm' },
      { id: 'ch9.moment-of-inertia', title: 'Moment of Inertia & Center of Mass' },
      { id: 'ch9.rotational-newtons-second', title: "Rotational Form of Newton's Second Law" },
      { id: 'ch9.rotational-energy', title: 'Rotational Kinetic Energy' },
      { id: 'ch9.angular-momentum', title: 'Angular Momentum & Its Conservation' },
      { id: 'ch9.static-equilibrium', title: 'Static Rotational Equilibrium' },
    ],
  },
  {
    id: 'ch10', order: 10, title: 'SHM & Elasticity',
    skills: [
      { id: 'ch10.hookes-law', title: "Hooke's Law & Spring Constant" },
      { id: 'ch10.shm-kinematics', title: 'Amplitude, Period & Frequency' },
      { id: 'ch10.shm-energy', title: 'Energy in Simple Harmonic Motion' },
      { id: 'ch10.stress-strain', title: 'Elastic Deformation, Stress & Strain' },
    ],
  },
  {
    id: 'ch11', order: 11, title: 'Fluids',
    skills: [
      { id: 'ch11.density-pressure', title: 'Density & Pressure' },
      { id: 'ch11.pressure-depth-pascal', title: "Pressure with Depth & Pascal's Principle" },
      { id: 'ch11.buoyancy', title: "Buoyancy & Archimedes' Principle" },
      { id: 'ch11.fluid-flow', title: "Continuity & Bernoulli's Principle" },
    ],
  },
  {
    id: 'ch12', order: 12, title: 'Temperature & Heat',
    skills: [
      { id: 'ch12.temperature-scales', title: 'Temperature Scales & Thermal Equilibrium' },
      { id: 'ch12.thermal-expansion', title: 'Thermal Expansion' },
      { id: 'ch12.specific-heat-calorimetry', title: 'Specific Heat & Calorimetry' },
      { id: 'ch12.phase-changes', title: 'Phase Changes & Latent Heat' },
    ],
  },
  {
    id: 'ch13', order: 13, title: 'Transfer of Heat',
    skills: [
      { id: 'ch13.conduction', title: 'Conduction & Thermal Conductivity' },
      { id: 'ch13.convection', title: 'Convection' },
      { id: 'ch13.radiation', title: 'Radiation' },
      { id: 'ch13.combined-heat-transfer', title: 'Combined Heat-Transfer Situations' },
    ],
  },
  {
    id: 'ch14', order: 14, title: 'Ideal Gas Law',
    skills: [
      { id: 'ch14.ideal-gas-law', title: 'Ideal Gas Law (P, V, T, n)' },
      { id: 'ch14.gas-processes', title: 'Gas Processes' },
      { id: 'ch14.kinetic-theory', title: 'Basic Kinetic Theory Connections' },
    ],
  },
  {
    id: 'ch15', order: 15, title: 'Thermodynamics',
    skills: [
      { id: 'ch15.internal-energy-work', title: 'Internal Energy & Thermodynamic Work' },
      { id: 'ch15.first-law', title: 'First Law of Thermodynamics' },
      { id: 'ch15.thermodynamic-processes', title: 'Isobaric, Isochoric, Isothermal & Adiabatic Processes' },
      { id: 'ch15.heat-engines-efficiency', title: 'Heat Engines & Efficiency' },
      { id: 'ch15.second-law', title: 'Second Law of Thermodynamics' },
    ],
  },
];

export function getChapters() {
  return CHAPTERS;
}

export function getChapter(chapterId) {
  return CHAPTERS.find((c) => c.id === chapterId) || null;
}

export function getSkill(skillId) {
  for (const chapter of CHAPTERS) {
    const skill = chapter.skills.find((s) => s.id === skillId);
    if (skill) return { chapter, skill };
  }
  return null;
}

export function allSkillIds() {
  return CHAPTERS.flatMap((c) => c.skills.map((s) => s.id));
}
