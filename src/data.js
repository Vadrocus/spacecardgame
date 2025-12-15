/**
 * Card Database
 */

export const cardDatabase = [
    // Creatures (with attack/defense stats)
    {
        name: "PIXEL WARRIOR",
        type: "creature",
        cost: 3,
        attack: 3,
        defense: 2,
        effect: "A reliable fighter.",
        flavor: "\"My sword is 8-bit, but the pain is real.\""
    },
    {
        name: "BYTE DRAGON",
        type: "creature",
        cost: 5,
        attack: 5,
        defense: 4,
        flying: true,
        effect: "Flying.",
        flavor: "It breathes fire in 256 colors."
    },
    {
        name: "CODE SLIME",
        type: "creature",
        cost: 1,
        attack: 1,
        defense: 1,
        effect: "Cheap blocker.",
        flavor: "Born from forgotten semicolons."
    },
    {
        name: "CYBER KNIGHT",
        type: "creature",
        cost: 4,
        attack: 4,
        defense: 3,
        effect: "Strong and balanced.",
        flavor: "Honor.exe has been loaded."
    },
    {
        name: "GLITCH GOLEM",
        type: "creature",
        cost: 6,
        attack: 6,
        defense: 6,
        effect: "Massive stats.",
        flavor: "It exists between frames of reality."
    },
    {
        name: "SPRITE FAIRY",
        type: "creature",
        cost: 2,
        attack: 2,
        defense: 1,
        haste: true,
        effect: "Haste.",
        flavor: "Too fast for the garbage collector."
    },
    {
        name: "BIT BEAST",
        type: "creature",
        cost: 3,
        attack: 3,
        defense: 3,
        lifelink: true,
        effect: "Lifelink. Heals you when attacking.",
        flavor: "It feeds on ones and zeros alike."
    },
    {
        name: "RAM KNIGHT",
        type: "creature",
        cost: 2,
        attack: 2,
        defense: 2,
        effect: "Early fighter.",
        flavor: "First in, never out."
    },
    {
        name: "CACHE HYDRA",
        type: "creature",
        cost: 7,
        attack: 7,
        defense: 7,
        trample: true,
        effect: "Trample. Excess damage hits enemy.",
        flavor: "Seven heads, seven threads, infinite terror."
    },
    {
        name: "KERNEL PANTHER",
        type: "creature",
        cost: 4,
        attack: 4,
        defense: 2,
        effect: "High attack, low defense.",
        flavor: "Runs at ring zero with no protection."
    },
    {
        name: "CLOUD SPRITE",
        type: "creature",
        cost: 2,
        attack: 1,
        defense: 3,
        flying: true,
        effect: "Flying.",
        flavor: "Hosted on someone else's computer."
    },
    {
        name: "FIREWALL PHOENIX",
        type: "creature",
        cost: 4,
        attack: 3,
        defense: 3,
        flying: true,
        effect: "Flying.",
        flavor: "Blocks malicious traffic and claws."
    },

    // Spells (with spellEffect for functionality)
    {
        name: "FIREBALL.EXE",
        type: "spell",
        cost: 2,
        spellEffect: "damage",
        damage: 3,
        effect: "Deal 3 damage to enemy.",
        flavor: "Warming up the CPU one target at a time."
    },
    {
        name: "LIGHTNING BOLT",
        type: "spell",
        cost: 1,
        spellEffect: "damage",
        damage: 2,
        effect: "Deal 2 damage to enemy.",
        flavor: "Faster than a context switch."
    },
    {
        name: "HEAL.SYS",
        type: "spell",
        cost: 2,
        spellEffect: "heal",
        healAmount: 4,
        effect: "Restore 4 health.",
        flavor: "Have you tried turning it off and on?"
    },
    {
        name: "POWER SURGE",
        type: "spell",
        cost: 3,
        spellEffect: "damage",
        damage: 5,
        effect: "Deal 5 damage to enemy.",
        flavor: "Warning: May void warranty."
    },
    {
        name: "DEBUG MODE",
        type: "spell",
        cost: 1,
        spellEffect: "draw",
        drawCount: 2,
        effect: "Draw 2 cards.",
        flavor: "printf('found you');"
    },
    {
        name: "SYSTEM RESTORE",
        type: "spell",
        cost: 3,
        spellEffect: "heal",
        healAmount: 6,
        effect: "Restore 6 health.",
        flavor: "Rolling back to a better time."
    },
    {
        name: "FORK BOMB",
        type: "spell",
        cost: 4,
        spellEffect: "damage",
        damage: 6,
        effect: "Deal 6 damage to enemy.",
        flavor: ":(){ :|:& };:"
    },
    {
        name: "OVERCLOCK",
        type: "spell",
        cost: 2,
        spellEffect: "draw",
        drawCount: 3,
        effect: "Draw 3 cards.",
        flavor: "Speed now, regret later."
    },
    // Extra copies of draw spells
    {
        name: "DEBUG MODE",
        type: "spell",
        cost: 1,
        spellEffect: "draw",
        drawCount: 2,
        effect: "Draw 2 cards.",
        flavor: "printf('found you');"
    },
    {
        name: "DEBUG MODE",
        type: "spell",
        cost: 1,
        spellEffect: "draw",
        drawCount: 2,
        effect: "Draw 2 cards.",
        flavor: "printf('found you');"
    },
    {
        name: "STACK OVERFLOW",
        type: "spell",
        cost: 3,
        spellEffect: "draw",
        drawCount: 4,
        effect: "Draw 4 cards.",
        flavor: "Just copy-paste from the top answer."
    },
    {
        name: "MEMORY LEAK",
        type: "spell",
        cost: 0,
        spellEffect: "draw",
        drawCount: 1,
        effect: "Draw 1 card. Free!",
        flavor: "Where did all my RAM go?"
    },
    {
        name: "MEMORY LEAK",
        type: "spell",
        cost: 0,
        spellEffect: "draw",
        drawCount: 1,
        effect: "Draw 1 card. Free!",
        flavor: "Where did all my RAM go?"
    },

    // Lands (more copies for better draw rate)
    { name: "DATA CENTER", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "99.99% uptime guaranteed." },
    { name: "DATA CENTER", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "99.99% uptime guaranteed." },
    { name: "DATA CENTER", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "99.99% uptime guaranteed." },
    { name: "SERVER FARM", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "Where the cloud touches ground." },
    { name: "SERVER FARM", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "Where the cloud touches ground." },
    { name: "SERVER FARM", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "Where the cloud touches ground." },
    { name: "MEMORY BANK", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "Savings with zero interest." },
    { name: "MEMORY BANK", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "Savings with zero interest." },
    { name: "MEMORY BANK", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "Savings with zero interest." },
    { name: "POWER GRID", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "The source of all computation." },
    { name: "POWER GRID", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "The source of all computation." },
    { name: "POWER GRID", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "The source of all computation." },
    { name: "NETWORK HUB", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "All packets lead here." },
    { name: "NETWORK HUB", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "All packets lead here." },
    { name: "NETWORK HUB", type: "land", cost: 0, manaProduction: 1, effect: "Tap: Add 1 mana.", flavor: "All packets lead here." },
];

// Shuffle utility
export function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
