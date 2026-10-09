// Game content: goods, economies, sectors, ships, ranks, event variants,
// civilizations and artifacts. Rules that use them live in game.js.

export const GOODS = [
  { id: 'humanFood', name: 'Human Food', base: 20, color: '#8fe388' },
  { id: 'alienFood', name: 'Alien Food', base: 30, color: '#e58cff' },
  { id: 'substances', name: 'Substances', base: 40, color: '#ffc04d' },
  { id: 'humanTech', name: 'Human Tech', base: 80, color: '#62b6ff' },
  { id: 'alienTech', name: 'Alien Tech', base: 120, color: '#9d8cff' },
];

export const GOOD_IDS = GOODS.map((good) => good.id);
export const goodById = Object.fromEntries(GOODS.map((good) => [good.id, good]));

export const SECTORS = [
  { id: 'human', name: 'Human Sector', short: 'Human', color: '#5b9dff' },
  { id: 'alien', name: 'Alien Sector', short: 'Alien', color: '#b77dff' },
  { id: 'frontier', name: 'Frontier', short: 'Frontier', color: '#ffb24d' },
];
export const sectorById = Object.fromEntries(SECTORS.map((sector) => [sector.id, sector]));

// How a market relates to each good (GDD 6.3): P produces, N neutral,
// D demand, E exotic (the other side's goods).
export const ECONOMIES = [
  {
    id: 'humanAgricultural',
    name: 'Human Agricultural',
    side: 'human',
    produces: 'humanFood',
    relations: { humanFood: 'P', alienFood: 'E', substances: 'N', humanTech: 'D', alienTech: 'E' },
    blurb: 'Terraced farm worlds feeding the human colonies.',
  },
  {
    id: 'humanIndustrial',
    name: 'Human Industrial',
    side: 'human',
    produces: 'humanTech',
    relations: { humanFood: 'D', alienFood: 'E', substances: 'D', humanTech: 'P', alienTech: 'E' },
    blurb: 'Foundry cities that never sleep, hungry for ore and grain.',
  },
  {
    id: 'alienBiological',
    name: 'Alien Biological',
    side: 'alien',
    produces: 'alienFood',
    relations: { humanFood: 'E', alienFood: 'P', substances: 'N', humanTech: 'E', alienTech: 'D' },
    blurb: 'Living worlds that grow food, medicine and stranger things.',
  },
  {
    id: 'alienTechnological',
    name: 'Alien Technological',
    side: 'alien',
    produces: 'alienTech',
    relations: { humanFood: 'E', alienFood: 'D', substances: 'D', humanTech: 'E', alienTech: 'P' },
    blurb: 'Crystal megastructures whose makers trade in incomprehensible devices.',
  },
  {
    id: 'frontierMining',
    name: 'Frontier Mining',
    side: 'frontier',
    produces: 'substances',
    relations: { humanFood: 'D', alienFood: 'D', substances: 'P', humanTech: 'D', alienTech: 'D' },
    blurb: 'Rock, dust and drills. Everyone out here needs everything.',
  },
];
export const economyById = Object.fromEntries(ECONOMIES.map((economy) => [economy.id, economy]));

// Image file names follow the ids in kebab case.
export const kebab = (id) => id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export const SHIPS = [
  { id: 'shuttle', name: 'Shuttle', hold: 10, price: 0, tagline: 'Small, stubborn and paid off.' },
  { id: 'courier', name: 'Courier', hold: 20, price: 3000, tagline: 'Swept wings, twin engines, twice the hold. Outruns its own invoices.' },
  { id: 'hauler', name: 'Hauler', hold: 40, price: 15000, tagline: 'A cargo spine, four pods and three engines. Work ship, no apologies.' },
  { id: 'freighter', name: 'Freighter', hold: 80, price: 80000, tagline: 'A small moon of containers that answers to you.' },
];

// Trade ranks by lifetime profit (GDD 7.5).
export const RANKS = [
  { name: 'Stowaway', profit: 0 },
  { name: 'Drifter', profit: 1000 },
  { name: 'Haggler', profit: 5000 },
  { name: 'Trader', profit: 15000 },
  { name: 'Merchant', profit: 40000 },
  { name: 'Shipowner', profit: 100000 },
  { name: 'Magnate', profit: 200000 },
  { name: 'Tycoon', profit: 400000 },
  { name: 'Elite', profit: 650000 },
];

// Each event comes in a few variants (GDD 8.6): a character, a line, and
// small changes to the numbers. The player never picks the variant.
export const EVENT_VARIANTS = {
  dice: [
    {
      id: 'alien-gambler',
      name: 'Sile Six-Eyes',
      title: 'Alien gambler',
      weight: 2,
      stakeFactor: 1,
      line: 'Two dice each, one throw, and I promise to watch with only two of my eyes. Care to wager?',
    },
    {
      id: 'bored-dockhand',
      name: 'Dex of Bay Nine',
      title: 'Bored dockhand',
      weight: 2,
      stakeFactor: 0.5,
      line: "Shift's dead, pilot. Roll me for a few credits, it keeps us both awake.",
    },
    {
      id: 'high-roller',
      name: 'Her Radiance Ossu-Ren',
      title: 'High roller',
      weight: 1,
      stakeFactor: 2,
      line: 'You may play against me, little trader. Do try to lose with some dignity.',
    },
  ],
  container: [
    {
      id: 'shady-dealer',
      name: 'The Lantern',
      title: 'Shady dealer',
      weight: 2,
      price: 300,
      units: [2, 6],
      line: "Sealed crate, no manifest, no questions. Fair price, if you don't ask what hums inside.",
    },
    {
      id: 'scrap-merchant',
      name: 'Rusk Halloran',
      title: 'Scrap merchant',
      weight: 2,
      price: 150,
      units: [1, 3],
      line: 'Pulled this box off a dead freighter, still sealed. Could be gold, could be gas. Want it?',
    },
    {
      id: 'smuggler',
      name: 'Ziss Calloran',
      title: 'Smuggler',
      weight: 1,
      price: 600,
      units: [4, 12],
      line: "Customs never saw this one, and neither did you. Cash only, and I'm gone before you open it.",
    },
  ],
  mission: [
    {
      id: 'dispatcher',
      name: 'Officer Imra Taal',
      title: 'Dispatcher',
      weight: 2,
      units: 5,
      rewardFactor: 1,
      deadlines: [24, 48, 72],
      line: 'Priority parcel, clean route, fair pay. I just need a pilot who shows up.',
    },
    {
      id: 'medic',
      name: 'Medic Joss Arendt',
      title: 'Medic',
      weight: 1,
      units: 5,
      rewardFactor: 1.2,
      deadlines: [24],
      line: 'Cold-packed serum, and the clock is already running. Get it there fast and people live.',
    },
    {
      id: 'foreman',
      name: 'Big Haldor',
      title: 'Foreman',
      weight: 1.5,
      units: 10,
      rewardFactor: 2,
      deadlines: [24, 48, 72],
      line: 'Drill heads for the deep camp, heavy as sin. Haul them out and the whole crew owes you.',
    },
  ],
};

export const CIVILIZATIONS = [
  { id: 'vael', name: 'Vael', motif: 'Crystal and song', color: '#8fe9ff', blurb: 'Crystal-singers who grew their cities like choirs and left the galaxy one long, fading note.' },
  { id: 'orrim', name: 'Orrim', motif: 'War and metal', color: '#ff7a59', blurb: 'Forge-born warriors bound by oath and rank, who fought every war to the last rivet.' },
  { id: 'lumenari', name: 'Lumenari', motif: 'Light and navigation', color: '#ffd479', blurb: 'Starfaring cartographers who navigated by light itself, and left their lanterns burning long after they were gone.' },
  { id: 'kethu', name: 'Kethu', motif: 'Life and biotechnology', color: '#6dffa8', blurb: 'Gardeners of flesh and bone who grew their tools, ships and children, and whose seeds may still be sleeping.' },
  { id: 'thal', name: 'Thal', motif: 'Death and stone', color: '#b3a6d9', blurb: 'Keepers of tombs and black stars, the Thal carved silence into basalt and buried their dead facing the dark.' },
  { id: 'ys', name: 'Ys', motif: 'Time and mathematics', color: '#7aa2ff', blurb: 'Mathematicians of time, the Ys counted everything, wove the hours, and finally solved for their own end.' },
];
export const civById = Object.fromEntries(CIVILIZATIONS.map((civ) => [civ.id, civ]));

// The 36 artifacts, six per civilization, in Codex order. Each has an
// illustration in img/artifacts/<id>.svg.
export const ARTIFACTS = [
  { id: 'singing-egg', name: 'Singing Egg', civ: 'vael', text: 'A crystal egg that has hummed one unbroken note for nine thousand years. Vael midwives sang it to sleep, and nothing has ever hatched.' },
  { id: 'choir-shard', name: 'Choir Shard', civ: 'vael', text: 'Three spires of living crystal, grown to sing in harmony. Strike one and the others answer, finishing a hymn no Vael remains to hear.' },
  { id: 'resonance-bowl', name: 'Resonance Bowl', civ: 'vael', text: 'Vael pilgrims filled this bowl with a single tone and drank the silence after. The ripples inside it have not stopped moving since.' },
  { id: 'glass-feather', name: 'Glass Feather', civ: 'vael', text: 'Shed by no bird anyone has found, it whistles in the faintest wind. The Vael believed songs left feathers behind when they flew.' },
  { id: 'echo-mask', name: 'Echo Mask', civ: 'vael', text: 'Worn by Vael cantors who sang for the dead. Speak into it and it answers a moment later, in a voice that is not yours.' },
  { id: 'seed-of-hymns', name: 'Seed of Hymns', civ: 'vael', text: 'A gem-cut Vael seed, bred to grow choirs instead of forests. No world has yet proven quiet enough to plant it in.' },
  { id: 'siege-blade', name: 'Siege Blade', civ: 'orrim', text: 'Too heavy for one arm, it was swung by a crew of six. Each tooth on its spine marks a fortress gate that opened for it.' },
  { id: 'oath-gauntlet', name: 'Oath Gauntlet', civ: 'orrim', text: 'An Orrim swore on a clenched fist and never opened it again until the oath was kept. This one is still closed.' },
  { id: 'starbreaker-shell', name: 'Starbreaker Shell', civ: 'orrim', text: 'Armor torn from an Orrim dreadnought, scarred where a star-killing lance struck it. The plate held, and the lance was the thing that broke.' },
  { id: 'war-drum', name: 'War Drum', civ: 'orrim', text: 'Orrim fleets marched to this drum, whole battle lines moving as one hand. Strike it once and old engines in the hull flicker, waiting for orders.' },
  { id: 'iron-banner', name: 'Iron Banner', civ: 'orrim', text: 'Orrim banners were forged, not woven, so that no wind could lower them. This one was holed in its last battle and still never fell.' },
  { id: 'tacticians-die', name: "Tactician's Die", civ: 'orrim', text: 'Orrim strategists rolled it before every battle, not to choose a plan but to test one. A plan that could not survive a bad roll was abandoned.' },
  { id: 'ninth-spiral-starchart', name: 'Ninth Spiral Starchart', civ: 'lumenari', text: 'A film of frozen light charting nine turns of a galaxy the Lumenari never finished crossing. The marked star at its edge has no name in any living catalog.' },
  { id: 'lantern-of-still-light', name: 'Lantern of Still Light', civ: 'lumenari', text: 'Its flame has not flickered in a hundred thousand years. Lumenari pilots hung one in every cockpit, so that one thing aboard would always stay still.' },
  { id: 'prism-crown', name: 'Prism Crown', civ: 'lumenari', text: 'Lumenari navigator-queens wore it to split starlight into the hundred hues they read like scripture. The central prism still warms in a sunbeam.' },
  { id: 'sun-compass', name: 'Sun Compass', civ: 'lumenari', text: 'It points to no pole, only toward the nearest living sun. In the void between systems its points go dark, waiting for a light worth following.' },
  { id: 'mirror-of-elsewhere', name: 'Mirror of Elsewhere', civ: 'lumenari', text: 'The glass shows a sky that is not yours, under a moon no one has found. Lumenari scouts used it to look before they leapt.' },
  { id: 'lightglass-lens', name: 'Lightglass Lens', civ: 'lumenari', text: 'Ground from a single cooled ray of light, it gathers starglow into one burning point. The Lumenari lit whole cities with lenses like this.' },
  { id: 'sleeping-larva', name: 'Sleeping Larva', civ: 'kethu', text: 'A Kethu larva, curled tight and breathing once a century. It was grown to wake when its world was ready, and it is still waiting.' },
  { id: 'bone-flute', name: 'Bone Flute', civ: 'kethu', text: 'Carved from a bone that was grown, not taken, to sing a single song. Its holes still glow faintly, as if something inside remembers how to breathe.' },
  { id: 'living-map', name: 'Living Map', civ: 'kethu', text: 'A leaf whose veins grew along the trade routes of its makers. Lay it in sunlight and a new vein creeps toward somewhere it has never been.' },
  { id: 'spore-censer', name: 'Spore Censer', civ: 'kethu', text: 'Kethu priests swung it through new colonies to seed them with life. A few dormant spores still drift from its pores, patient as stone.' },
  { id: 'mothers-coil', name: "Mother's Coil", civ: 'kethu', text: 'The paired coil from which every Kethu body was grown. Kept warm, it hums with an inheritance no one is left to claim.' },
  { id: 'amber-heart', name: 'Amber Heart', civ: 'kethu', text: 'A Kethu heart sealed in living resin, its pulse slowed to one beat a year. Hold it long enough and you will feel it.' },
  { id: 'basalt-mask', name: 'Basalt Mask', civ: 'thal', text: 'Carved for a face no living eye has seen. The sculptor closed its eyes in stone, so the dead would not have to watch the long dark.' },
  { id: 'funeral-barge', name: 'Funeral Barge', civ: 'thal', text: 'The Thal set their dead adrift toward a star that gave no light. This barge came back empty, and no one knows who steered it home.' },
  { id: 'ash-urn', name: 'Ash Urn', civ: 'thal', text: 'The ash inside still reads warm, a million years on. Thal custom kept the lid sealed until the dead had finished remembering.' },
  { id: 'black-star-seal', name: 'Black Star Seal', civ: 'thal', text: 'Pressed into the door of every Thal tomb, its star is cut clean through the stone. Look through it and you will see no stars at all.' },
  { id: 'silent-bell', name: 'Silent Bell', civ: 'thal', text: 'Cast to toll for the last of the Thal. The clapper has never moved, so either it is still waiting, or no one was left to ring it.' },
  { id: 'tomb-key', name: 'Tomb Key', civ: 'thal', text: 'Its bit is cut in the stepped outline of the door it opens. That door is on no chart, yet the key grows cold when pointed home.' },
  { id: 'clock-without-hands', name: 'Clock Without Hands', civ: 'ys', text: 'Its gears have turned since before the Ys were born, counting in sixes. It has no hands, because the Ys never agreed on what now meant.' },
  { id: 'infinite-knot', name: 'Infinite Knot', civ: 'ys', text: 'One band, knotted, with no seam anywhere. Ys students traced it with a finger until they understood that nothing truly ends.' },
  { id: 'number-stone', name: 'Number Stone', civ: 'ys', text: 'Each row is the sum of the two above it. The stone ends before the count does, as if the carver expected someone to go on.' },
  { id: 'folded-cube', name: 'Folded Cube', civ: 'ys', text: 'A cube holding a smaller copy of itself, folded through a direction we cannot point to. Measured from inside, it is larger.' },
  { id: 'loom-of-hours', name: 'Loom of Hours', civ: 'ys', text: 'Every thread passes through one point, the present. Below it hang the hours already woven, above it the ones still loose.' },
  { id: 'last-equation', name: 'Last Equation', civ: 'ys', text: 'One pan holds every number the Ys ever counted, the other holds zero. The beam is level, and that was their final proof.' },
];
export const artifactById = Object.fromEntries(ARTIFACTS.map((artifact) => [artifact.id, artifact]));

// Syllables for the names of planets, which the player doesn't name.
export const PLANET_SYLLABLES = {
  start: ['Ka', 'Ve', 'Or', 'Ty', 'Sel', 'Mar', 'Quo', 'Ae', 'Bri', 'Dra', 'Ix', 'Lu', 'No', 'Ze', 'Hal', 'Cyr', 'Eon', 'Fa', 'Gor', 'Ul'],
  middle: ['ra', 'li', 'ven', 'do', 'sha', 'ta', 'ri', 'mo', 'ne', 'xa', 'lo', 'thi', 'ka', 'su', 'ver', ''],
  end: ['th', 'n', 'ra', 'x', 'os', 'is', 'on', 'ae', 'ys', 'ar', 'um', 'el', 'ia', 'or', 'ex', 'yr'],
};
