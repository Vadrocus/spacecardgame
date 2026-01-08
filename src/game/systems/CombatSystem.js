/**
 * CombatSystem - Handles all combat logic
 * Manages attack targeting, damage calculation, and combat resolution
 */

export class CombatSystem {
    constructor(game) {
        this.game = game;
    }

    // Get valid attack targets for a unit
    getValidAttackTargets(attacker) {
        const g = this.game;
        const isMyP1 = attacker.isPlayer1;
        const enemyOrbit = isMyP1 ? g.p2Orbit : g.p1Orbit;
        const enemyPlanet = isMyP1 ? g.p2Planet : g.p1Planet;

        const inOrbit = g.p1Orbit.includes(attacker) || g.p2Orbit.includes(attacker);
        const onGround = g.p1Planet.includes(attacker) || g.p2Planet.includes(attacker);

        let targets = [];

        if (inOrbit) {
            // Orbital units can attack other orbital units (except artifacts)
            targets = targets.concat(enemyOrbit.filter(c => !this.isArtifact(c)));
            // And ground units if they have orbital strike
            if (g.hasOrbitalStrike(attacker)) {
                targets = targets.concat(enemyPlanet.filter(c => !this.isArtifact(c)));
                // Can also attack enemy generator with orbital strike
                if (g.planetaryGenerator && g.planetaryGenerator.isPlayer1 !== isMyP1) {
                    targets.push(g.planetaryGenerator);
                }
            }
        }

        if (onGround) {
            // Ground units can attack other ground units (except artifacts)
            targets = targets.concat(enemyPlanet.filter(c => !this.isArtifact(c)));
            // Ground units can attack the enemy generator
            if (g.planetaryGenerator && g.planetaryGenerator.isPlayer1 !== isMyP1) {
                targets.push(g.planetaryGenerator);
            }
            // And orbital units if they have anti-air (except artifacts)
            if (g.hasAntiAir(attacker)) {
                targets = targets.concat(enemyOrbit.filter(c => !this.isArtifact(c)));
            }
        }

        return targets;
    }

    // Perform combat between two units
    performCombat(attacker, defender) {
        const g = this.game;
        // Calculate effective stats with buffs
        const attackerPower = this.getEffectiveAttack(attacker);
        const defenderPower = this.getEffectiveAttack(defender);

        // Deal damage to each other
        defender.dealDamage(attackerPower);
        attacker.dealDamage(defenderPower);

        g.showMessage(`${attacker.data.name} attacks ${defender.data.name}!`);

        // Check for deaths
        g._checkUnitDeaths();
    }

    // Perform orbital strike (attacker takes no counter damage)
    performOrbitalStrike(attacker, defender) {
        const g = this.game;
        // Orbital strike has -1 attack penalty
        const attackerPower = Math.max(0, this.getEffectiveAttack(attacker) - 1);

        defender.dealDamage(attackerPower);
        g.showMessage(`${attacker.data.name} orbital strikes ${defender.data.name}!`);

        // Check for deaths
        g._checkUnitDeaths();
    }

    // Get effective attack with buffs
    getEffectiveAttack(card) {
        let attack = card.power || 0;

        // Add equipment bonuses
        if (card.equipment) {
            for (const equip of card.equipment) {
                const ability = (equip.ability || '').toLowerCase();
                const match = ability.match(/\+(\d+)\s*attack/i);
                if (match) attack += parseInt(match[1]);
            }
        }

        // Add passive buffs from other cards (Defense Grid, etc.)
        attack += this.getPassiveAttackBonus(card);

        return attack;
    }

    // Get effective defense with buffs
    getEffectiveDefense(card) {
        let defense = card.toughness || 1;

        // Add equipment bonuses
        if (card.equipment) {
            for (const equip of card.equipment) {
                const ability = (equip.ability || '').toLowerCase();
                const match = ability.match(/\+(\d+)\s*defense/i);
                if (match) defense += parseInt(match[1]);
            }
        }

        // Add passive buffs from other cards
        defense += this.getPassiveDefenseBonus(card);

        return defense;
    }

    // Get passive attack bonus from other cards
    getPassiveAttackBonus(card) {
        let bonus = 0;
        // Add bonuses from cards with passive abilities
        return bonus;
    }

    // Get passive defense bonus from other cards
    getPassiveDefenseBonus(card) {
        const g = this.game;
        let bonus = 0;
        const isMyP1 = card.isPlayer1;
        const myOrbit = isMyP1 ? g.p1Orbit : g.p2Orbit;
        const myPlanet = isMyP1 ? g.p1Planet : g.p2Planet;

        // Defense Grid: All Terran structures gain +1 Defense
        for (const c of myOrbit) {
            if (c.data?.name === 'Defense Grid') {
                const type = (card.data?.type || '').toLowerCase();
                if (type.includes('structure') || type.includes('station')) {
                    bonus += 1;
                }
            }
        }

        // Crystal Guardians: Adjacent Crystalline structures gain +1 Defense
        for (const c of myPlanet) {
            if (c.data?.name === 'Crystal Guardians' && c !== card) {
                const type = (card.data?.type || '').toLowerCase();
                if (type.includes('structure')) {
                    bonus += 1;
                }
            }
        }

        return bonus;
    }

    // Check if unit has double attack ability
    hasDoubleAttack(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const name = (card.data?.name || '').toLowerCase();
        return ability.includes('attack twice') || name.includes('vanguard elite');
    }

    // Check if unit cannot counter-attack
    cannotCounterAttack(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('cannot counter');
    }

    // Check if unit reflects damage
    reflectsDamage(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const name = (card.data?.name || '').toLowerCase();
        return ability.includes('redirect') || ability.includes('reflect') ||
               name.includes('prismatic deflector');
    }

    // Get reflected damage amount
    getReflectedDamage(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        // "Redirects 1 damage" or similar
        const match = ability.match(/redirect[s]?\s*(\d+)/i);
        return match ? parseInt(match[1]) : 1;
    }

    // Enhanced performCombat with abilities
    performCombatWithAbilities(attacker, defender) {
        const g = this.game;
        const attackerPower = this.getEffectiveAttack(attacker);
        const defenderPower = this.getEffectiveAttack(defender);

        // Deal damage to defender
        defender.dealDamage(attackerPower);

        // Check if attacker can counter-attack
        if (!this.cannotCounterAttack(attacker)) {
            // Defender deals counter damage to attacker
            attacker.dealDamage(defenderPower);
        }

        // Check for damage reflection (Prismatic Deflector)
        if (this.reflectsDamage(defender)) {
            const reflectedDamage = this.getReflectedDamage(defender);
            attacker.dealDamage(reflectedDamage);
            g.showMessage(`${defender.data.name} reflects ${reflectedDamage} damage!`);
        }

        g.showMessage(`${attacker.data.name} attacks ${defender.data.name}!`);
        g._checkUnitDeaths();

        // Handle double attack
        if (this.hasDoubleAttack(attacker) && !attacker.attackedTwice) {
            attacker.attackedTwice = true;
            return true; // Can attack again
        }

        return false; // Attack finished
    }

    // Cancel combat selection
    cancelCombatSelection() {
        const g = this.game;
        // Unmark all attackers
        for (const attacker of g.combatAttackers) {
            attacker.isSelectedAttacker = false;
        }
        g.combatAttackers = [];
        g.combatTarget = null;
        g.inCombatSelection = false;
        g.showMessage('Combat cancelled');
    }

    // Add unit to combat stack
    addToCombatStack(unit) {
        const g = this.game;
        // Check multiplayer permissions
        if (g.isMultiplayer && !g.canAct()) {
            g.showMessage("Wait for your turn!");
            return false;
        }

        if (g.combatAttackers.includes(unit)) {
            // Remove from stack if already in it
            const idx = g.combatAttackers.indexOf(unit);
            g.combatAttackers.splice(idx, 1);
            unit.isSelectedAttacker = false;
            g.showMessage(`${unit.data.name} removed from attack`);
        } else {
            // Add to stack
            g.combatAttackers.push(unit);
            unit.isSelectedAttacker = true;
            g.showMessage(`${unit.data.name} added to attack (${g.combatAttackers.length} attackers)`);
        }
        return true;
    }

    // Execute combat stack attack
    executeCombatStack(defender, remote = false) {
        const g = this.game;
        // Check multiplayer permissions (skip if remote action)
        if (!remote && g.isMultiplayer && !g.canAct()) {
            g.showMessage("Wait for your turn!");
            return;
        }

        if (g.combatAttackers.length === 0) {
            g.showMessage('No attackers selected!');
            return;
        }

        // Send action to multiplayer (if not a remote action)
        if (!remote && g.isMultiplayer && g.multiplayer) {
            const isPlayer1 = g.combatAttackers[0].isPlayer1;
            const attackerIndices = g.combatAttackers.map(a => {
                const inOrbit = (isPlayer1 ? g.p1Orbit : g.p2Orbit).indexOf(a);
                if (inOrbit >= 0) return { zone: 'orbit', idx: inOrbit };
                const inPlanet = (isPlayer1 ? g.p1Planet : g.p2Planet).indexOf(a);
                return { zone: 'planet', idx: inPlanet };
            });

            // Find defender index and zone
            let defenderZone = 'orbit';
            let defenderIndex = g.p1Orbit.indexOf(defender);
            if (defenderIndex < 0) { defenderIndex = g.p2Orbit.indexOf(defender); }
            if (defenderIndex < 0) { defenderZone = 'planet'; defenderIndex = g.p1Planet.indexOf(defender); }
            if (defenderIndex < 0) { defenderIndex = g.p2Planet.indexOf(defender); }

            g.multiplayer.sendAction('attack', {
                attackerIndices,
                targetIndex: defenderIndex,
                attackerZone: attackerIndices[0]?.zone || 'orbit',
                targetZone: defenderZone,
                isPlayer1
            });
        }

        // Calculate total attacker power
        let totalAttackerPower = 0;
        for (const attacker of g.combatAttackers) {
            totalAttackerPower += this.getEffectiveAttack(attacker);
        }

        // Sort attackers by power (lowest first for defender targeting)
        const sortedAttackers = [...g.combatAttackers].sort((a, b) =>
            this.getEffectiveAttack(a) - this.getEffectiveAttack(b)
        );

        // Defender deals damage to attackers (lowest power first)
        let defenderPower = this.getEffectiveAttack(defender);
        for (const attacker of sortedAttackers) {
            if (defenderPower <= 0) break;

            const attackerHP = attacker.currentToughness - attacker.damage;
            const damageToAttacker = Math.min(defenderPower, attackerHP);
            attacker.dealDamage(damageToAttacker);
            defenderPower -= damageToAttacker;
        }

        // All attackers deal their combined damage to defender
        defender.dealDamage(totalAttackerPower);

        // Check for damage reflection
        if (this.reflectsDamage(defender)) {
            const reflectedDamage = this.getReflectedDamage(defender);
            // Reflect damage to first attacker
            if (sortedAttackers.length > 0) {
                sortedAttackers[0].dealDamage(reflectedDamage);
            }
        }

        // Tap all attackers
        for (const attacker of g.combatAttackers) {
            attacker.tap();
            attacker.isSelectedAttacker = false;
        }

        g.showMessage(`${g.combatAttackers.length} units attack ${defender.data.name} for ${totalAttackerPower} damage!`);

        // Clear combat state
        g.combatAttackers = [];
        g.combatTarget = null;
        g.inCombatSelection = false;

        // Check for deaths
        g._checkUnitDeaths();
        g.checkGeneratorDeath();
    }

    // Get all cards that can be attacked (including generator)
    getAllAttackableCards(isPlayer1) {
        const g = this.game;
        const enemyOrbit = isPlayer1 ? g.p2Orbit : g.p1Orbit;
        const enemyPlanet = isPlayer1 ? g.p2Planet : g.p1Planet;

        let targets = [...enemyOrbit, ...enemyPlanet];

        // Add generator if enemy controls it
        if (g.planetaryGenerator && g.planetaryGenerator.isPlayer1 !== isPlayer1) {
            targets.push(g.planetaryGenerator);
        }

        return targets;
    }

    // Check if card is an artifact (can't be attacked except Planetary Consciousness)
    isArtifact(card) {
        const type = (card.data?.type || '').toLowerCase();
        const name = (card.data?.name || '').toLowerCase();
        return type.includes('artifact') && !name.includes('planetary consciousness');
    }
}
