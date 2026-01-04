/**
 * Space Card Game - Card Database
 */

// Generate blank player cards (40 per deck)
function generateBlankDeck() {
    const cards = [];
    for (let i = 0; i < 40; i++) {
        cards.push({
            id: i,
            name: `CARD ${i + 1}`,
            type: 'ship',
            cost: Math.floor(i / 10) + 1, // Cost 1-4 based on position
            attack: 0,
            defense: 1,
            effect: 'Blank card.',
            flavor: ''
        });
    }
    return cards;
}

// Planet deck - drawn at game start
export const planetDeck = [
    { name: 'TERRA NOVA', type: 'planet', effect: 'Earthlike world.', resources: 3, color: '#22c55e' },
    { name: 'CRIMSON DUST', type: 'planet', effect: 'Desert planet.', resources: 2, color: '#ef4444' },
    { name: 'FROZEN DEEP', type: 'planet', effect: 'Ice giant.', resources: 2, color: '#60a5fa' },
    { name: 'GAS TITAN', type: 'planet', effect: 'Gas giant.', resources: 4, color: '#f97316' },
    { name: 'VOID ROCK', type: 'planet', effect: 'Barren asteroid.', resources: 1, color: '#888888' },
    { name: 'JUNGLE MOON', type: 'planet', effect: 'Overgrown moon.', resources: 3, color: '#84cc16' },
    { name: 'CRYSTAL WORLD', type: 'planet', effect: 'Crystalline surface.', resources: 5, color: '#a855f7' },
    { name: 'OCEAN PLANET', type: 'planet', effect: 'Global ocean.', resources: 3, color: '#06b6d4' },
];

// Artifact deck - drawn at game start
export const artifactDeck = [
    { name: 'STAR FORGE', type: 'artifact', effect: 'Ancient factory.', power: 2, color: '#fbbf24' },
    { name: 'WARP GATE', type: 'artifact', effect: 'Teleportation hub.', power: 3, color: '#8b5cf6' },
    { name: 'VOID CRYSTAL', type: 'artifact', effect: 'Energy source.', power: 2, color: '#ec4899' },
    { name: 'TITAN WRECK', type: 'artifact', effect: 'Crashed warship.', power: 4, color: '#6b7280' },
    { name: 'DATA SPIRE', type: 'artifact', effect: 'Knowledge archive.', power: 1, color: '#14b8a6' },
    { name: 'SHIELD ARRAY', type: 'artifact', effect: 'Defense network.', power: 3, color: '#3b82f6' },
];

// Natives deck - drawn at game start
export const nativesDeck = [
    { name: 'SILICON HIVE', type: 'natives', effect: 'Hive mind.', hostility: 2, color: '#84cc16' },
    { name: 'VOID WALKERS', type: 'natives', effect: 'Phase beings.', hostility: 3, color: '#8b5cf6' },
    { name: 'CRYSTAL SINGERS', type: 'natives', effect: 'Peaceful traders.', hostility: 1, color: '#06b6d4' },
    { name: 'IRON LEGION', type: 'natives', effect: 'Machine army.', hostility: 4, color: '#ef4444' },
    { name: 'SPORE MIND', type: 'natives', effect: 'Fungal network.', hostility: 2, color: '#22c55e' },
    { name: 'STAR WHALES', type: 'natives', effect: 'Space fauna.', hostility: 1, color: '#60a5fa' },
    { name: 'ANCIENT ONES', type: 'natives', effect: 'Elder race.', hostility: 3, color: '#fbbf24' },
];

// Player card database (blank for now)
export const cardDatabase = generateBlankDeck();

// Shuffle utility
export function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Pick random from array
export function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}
