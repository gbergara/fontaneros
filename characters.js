const characters = [
  {
    id: "urko",
    name: "Urko",
    title: "El Velocista",
    cap: "#ffd51f",
    overalls: "#151515",
    accent: "#ffd51f",
    speedMod: 1.3,
    repairMod: 0.8,
    jumpMod: 1,
    floodMod: 1,
    notes: ["30% más rápido", "Repara un 20% más lento", "Gorra amarilla y peto negro"]
  },
  {
    id: "gari",
    name: "Gari",
    title: "El Maestro Fontanero",
    cap: "#ff3048",
    overalls: "#2377ff",
    accent: "#ff5a6d",
    speedMod: 1,
    repairMod: 2,
    jumpMod: 0.9,
    floodMod: 1,
    notes: ["Velocidad equilibrada", "Repara el doble de rápido", "Salta un poco menos"]
  },
  {
    id: "david",
    name: "David",
    title: "El Tanque",
    cap: "#30d970",
    overalls: "#8b5a2b",
    accent: "#73ff9f",
    speedMod: 0.86,
    repairMod: 1,
    jumpMod: 1.28,
    floodMod: 0.85,
    notes: ["Un poco más lento", "Super Salto", "La inundación base baja un 15%"]
  },
  {
    id: "pedro",
    name: "Pedro",
    title: "El Técnico de Guardia",
    cap: "#ff8a2a",
    overalls: "#6d4cff",
    accent: "#ffb35c",
    speedMod: 1.08,
    repairMod: 1.18,
    jumpMod: 1.04,
    floodMod: 1,
    notes: ["Rápido y preciso", "Repara un 18% más rápido", "Salto ligeramente mejor"]
  },
  {
    id: "eider",
    name: "Eider",
    title: "La Ingeniera Ágil",
    cap: "#d85cff",
    overalls: "#2ad4ff",
    accent: "#f0a6ff",
    speedMod: 1.16,
    repairMod: 1.08,
    jumpMod: 1.12,
    floodMod: 1,
    notes: ["Muy ágil", "Salta mejor", "Repara un poco más rápido"]
  },
  {
    id: "usoa",
    name: "Usoa",
    title: "La Especialista Serena",
    cap: "#ffffff",
    overalls: "#ff6fae",
    accent: "#ffd6e8",
    speedMod: 0.96,
    repairMod: 1.35,
    jumpMod: 1,
    floodMod: 0.94,
    notes: ["Reparación excelente", "Reduce un poco la inundación", "Movimiento estable"]
  }
];

const tools = [
  { id: "wrench", name: "Llave inglesa", key: "1", description: "Golpe cercano fuerte", damage: 2, cooldown: 0.42, range: 62 },
  { id: "plunger", name: "Desatascador", key: "2", description: "Disparo a distancia", damage: 1, cooldown: 0.7, range: 420 },
  { id: "tape", name: "Cinta aislante", key: "3", description: "Aturde y ayuda a reparar", damage: 0, cooldown: 1.1, range: 92 }
];
const toolSets = {
  urko: [
    { id: "wrench", name: "Llave ultraligera", key: "1", description: "Golpe rapidísimo cercano", damage: 1.6, cooldown: 0.28, range: 58 },
    { id: "plunger", name: "Desatascador sprint", key: "2", description: "Disparo rápido medio", damage: 0.9, cooldown: 0.48, range: 390 },
    { id: "tape", name: "Brida exprés", key: "3", description: "Aturde poco, recarga veloz", damage: 0, cooldown: 0.78, range: 82 }
  ],
  gari: [
    { id: "wrench", name: "Llave maestra", key: "1", description: "Golpe equilibrado fiable", damage: 2, cooldown: 0.42, range: 62 },
    { id: "plunger", name: "Desatascador clásico", key: "2", description: "Disparo recto a distancia", damage: 1, cooldown: 0.7, range: 420 },
    { id: "tape", name: "Cinta pro", key: "3", description: "Aturde y repara bien", damage: 0, cooldown: 1.1, range: 92 }
  ],
  david: [
    { id: "wrench", name: "Maza de obra", key: "1", description: "Golpe lento demoledor", damage: 3.2, cooldown: 0.78, range: 70 },
    { id: "plunger", name: "Ventosa pesada", key: "2", description: "Disparo lento y potente", damage: 1.8, cooldown: 1.05, range: 360 },
    { id: "tape", name: "Cinta industrial", key: "3", description: "Gran aturdimiento cercano", damage: 0, cooldown: 1.35, range: 122 }
  ],
  pedro: [
    { id: "wrench", name: "Carraca técnica", key: "1", description: "Combo corto preciso", damage: 2.1, cooldown: 0.38, range: 66 },
    { id: "plunger", name: "Pistola de ventosa", key: "2", description: "Disparo estable", damage: 1.15, cooldown: 0.62, range: 440 },
    { id: "tape", name: "Sellador rápido", key: "3", description: "Repara más al usarlo", damage: 0, cooldown: 0.95, range: 96 }
  ],
  eider: [
    { id: "wrench", name: "Llave telescópica", key: "1", description: "Más alcance cuerpo a cuerpo", damage: 1.8, cooldown: 0.4, range: 82 },
    { id: "plunger", name: "Dron ventosa", key: "2", description: "Disparo largo y rápido", damage: 1, cooldown: 0.56, range: 520 },
    { id: "tape", name: "Gel aislante", key: "3", description: "Aturde en área amplia", damage: 0, cooldown: 1.0, range: 130 }
  ],
  usoa: [
    { id: "wrench", name: "Llave silenciosa", key: "1", description: "Golpe seguro cercano", damage: 1.7, cooldown: 0.48, range: 62 },
    { id: "plunger", name: "Paloma ventosa", key: "2", description: "Disparo suave con control", damage: 0.9, cooldown: 0.74, range: 430 },
    { id: "tape", name: "Kit de sellado", key: "3", description: "Repara mucho y aturde", damage: 0, cooldown: 1.15, range: 104 }
  ]
};
