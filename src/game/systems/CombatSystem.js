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

    // ==================== ABILITY DETECTION ====================
    // Based on triggers.md ability list

    // Check if unit has double attack ability (Barrage)
    hasDoubleAttack(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const name = (card.data?.name || '').toLowerCase();
        return ability.includes('attack twice') || ability.includes('barrage') ||
               name.includes('vanguard elite');
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
        const match = ability.match(/redirect[s]?\s*(\d+)/i);
        return match ? parseInt(match[1]) : 1;
    }

    // Quick - Deals damage before opponent (First Strike)
    hasQuick(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('quick') || ability.includes('first strike') ||
               ability.includes('strikes first') || ability.includes('deals damage first');
    }

    // Fatal - Any damage destroys target (Deathtouch)
    hasFatal(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('fatal') || ability.includes('deathtouch') ||
               ability.includes('any damage destroys') || ability.includes('lethal');
    }

    // Pierce - Excess damage carries through (Trample)
    hasPierce(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('pierce') || ability.includes('trample') ||
               ability.includes('excess damage');
    }

    // Rush - Can act immediately when deployed (Haste)
    hasRush(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('rush') || ability.includes('haste') ||
               ability.includes('act immediately') || ability.includes('no summoning sickness');
    }

    // Elevated - Can only be attacked by elevated units (Flying)
    hasElevated(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const type = (card.data?.type || '').toLowerCase();
        return ability.includes('elevated') || ability.includes('flying') ||
               ability.includes('only attacked by elevated') ||
               type.includes('orbital') || type.includes('capital_ship') ||
               type.includes('scout_ship') || type.includes('science_ship');
    }

    // Anti-Elevated - Can target elevated units from ground
    hasAntiElevated(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('anti-air') || ability.includes('target elevated') ||
               ability.includes('target orbital') || ability.includes('anti-elevated');
    }

    // Drain - Damage dealt generates resources or heals
    hasDrain(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('drain') || ability.includes('lifelink') ||
               ability.includes('damage dealt generates') || ability.includes('heals when dealing');
    }

    // Shroud - Cannot be targeted by opponents
    hasShroud(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('shroud') || ability.includes('hexproof') ||
               ability.includes('cannot be targeted') || ability.includes('untargetable');
    }

    // Ward - Immune to specific types
    hasWard(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('ward') || ability.includes('immune to');
    }

    // Get ward protection type
    getWardType(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        if (ability.includes('immune to event')) return 'event';
        if (ability.includes('immune to orbital')) return 'orbital';
        if (ability.includes('immune to ground')) return 'ground';
        const match = ability.match(/ward\s*\(([^)]+)\)/i);
        return match ? match[1].trim() : null;
    }

    // Alert - Can attack without becoming tapped (Vigilance)
    hasAlert(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('alert') || ability.includes('vigilance') ||
               ability.includes('without tapping') || ability.includes('doesn\'t tap');
    }

    // Armored - Cannot be destroyed by damage
    hasArmored(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('armored') || ability.includes('indestructible') ||
               ability.includes('cannot be destroyed by damage');
    }

    // Persist - Return weakened when destroyed
    hasPersist(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('persist') || ability.includes('return weakened');
    }

    // Undying - Return strengthened when destroyed
    hasUndying(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('undying') || ability.includes('return strengthened');
    }

    // Phase - Unblockable if opponent has specific type
    hasPhase(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('phase') || ability.includes('unblockable');
    }

    // Get phase bypass type
    getPhaseType(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const match = ability.match(/phase\s*\(([^)]+)\)/i);
        if (match) return match[1].trim();
        if (ability.includes('unblockable by capital')) return 'capital';
        if (ability.includes('unblockable by frigate')) return 'frigate';
        if (ability.includes('unblockable by cruiser')) return 'cruiser';
        return null;
    }

    // Cloak - Deploy hidden, reveal for cost (Morph)
    hasCloak(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('cloak') || ability.includes('morph') ||
               ability.includes('face-down') || ability.includes('deploy hidden');
    }

    // Get morph/cloak cost
    getCloakCost(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const match = ability.match(/cloak\s*\((\d+)\)/i) || ability.match(/morph\s*\((\d+)\)/i);
        return match ? parseInt(match[1]) : 3;
    }

    // Salvage - Can be played from discard
    hasSalvage(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('salvage') || ability.includes('play from discard') ||
               ability.includes('graveyard');
    }

    // Get salvage cost multiplier
    getSalvageCostMultiplier(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const match = ability.match(/salvage\s*\(([0-9.]+)x?\)/i);
        return match ? parseFloat(match[1]) : 1.5;
    }

    // Enhanced performCombat with abilities
    performCombatWithAbilities(attacker, defender) {
        const g = this.game;
        let attackerPower = this.getEffectiveAttack(attacker);
        const defenderPower = this.getEffectiveAttack(defender);

        // Barrage - attacker deals double damage
        if (this.hasDoubleAttack(attacker)) {
            attackerPower *= 2;
        }

        // Quick (First Strike) - attacker deals damage first
        if (this.hasQuick(attacker) && !this.hasQuick(defender)) {
            // Apply Fatal check
            if (this.hasFatal(attacker) && attackerPower > 0) {
                defender.damage = defender.currentToughness; // Instant kill
                g.showMessage(`${attacker.data.name}'s Fatal strike destroys ${defender.data.name}!`);
            } else {
                defender.dealDamage(attackerPower);
            }

            // Check if defender dies before counter-attack
            if (defender.damage >= defender.currentToughness) {
                g.showMessage(`Quick strike! ${attacker.data.name} destroys ${defender.data.name}!`);

                // Pierce - excess damage carries through
                if (this.hasPierce(attacker)) {
                    const excess = attackerPower - (defender.currentToughness - (defender.damage - attackerPower));
                    if (excess > 0) {
                        g.showMessage(`Pierce! ${excess} damage carries through!`);
                        // Damage could go to player health or adjacent units
                    }
                }

                // Drain - heal or generate resources
                if (this.hasDrain(attacker)) {
                    g.showMessage(`Drain! +${attackerPower} resources!`);
                    // Could add to gate or heal
                }

                g._checkUnitDeaths();
                return false;
            }

            // Defender counter-attacks (if it survives and can counter)
            if (!this.cannotCounterAttack(defender)) {
                if (this.hasFatal(defender) && defenderPower > 0) {
                    attacker.damage = attacker.currentToughness;
                } else {
                    attacker.dealDamage(defenderPower);
                }
            }
        }
        // Defender has Quick, attacker doesn't
        else if (this.hasQuick(defender) && !this.hasQuick(attacker)) {
            if (this.hasFatal(defender) && defenderPower > 0) {
                attacker.damage = attacker.currentToughness;
                g.showMessage(`${defender.data.name}'s Fatal strike destroys ${attacker.data.name}!`);
            } else {
                attacker.dealDamage(defenderPower);
            }

            if (attacker.damage >= attacker.currentToughness) {
                g.showMessage(`Quick block! ${defender.data.name} destroys ${attacker.data.name}!`);
                g._checkUnitDeaths();
                return false;
            }

            // Attacker deals damage after
            if (this.hasFatal(attacker) && attackerPower > 0) {
                defender.damage = defender.currentToughness;
            } else {
                defender.dealDamage(attackerPower);
            }
        }
        // Normal combat - simultaneous damage
        else {
            // Apply Fatal ability
            if (this.hasFatal(attacker) && attackerPower > 0) {
                defender.damage = defender.currentToughness;
            } else {
                defender.dealDamage(attackerPower);
            }

            if (!this.cannotCounterAttack(defender)) {
                if (this.hasFatal(defender) && defenderPower > 0) {
                    attacker.damage = attacker.currentToughness;
                } else {
                    attacker.dealDamage(defenderPower);
                }
            }
        }

        // Check for damage reflection (Prismatic Deflector)
        if (this.reflectsDamage(defender)) {
            const reflectedDamage = this.getReflectedDamage(defender);
            attacker.dealDamage(reflectedDamage);
            g.showMessage(`${defender.data.name} reflects ${reflectedDamage} damage!`);
        }

        // Pierce - excess damage carries through to player
        if (this.hasPierce(attacker) && defender.damage >= defender.currentToughness) {
            const excess = attackerPower - defender.currentToughness;
            if (excess > 0) {
                g.showMessage(`Pierce! ${excess} excess damage!`);
            }
        }

        // Drain - resource generation
        if (this.hasDrain(attacker) && attackerPower > 0) {
            const drainAmount = Math.min(attackerPower, defender.currentToughness);
            g.showMessage(`Drain! +${drainAmount}!`);
        }

        g.showMessage(`${attacker.data.name} attacks ${defender.data.name}!`);

        // Check for Armored - cannot be destroyed by damage
        if (this.hasArmored(defender) && defender.damage >= defender.currentToughness) {
            defender.damage = defender.currentToughness - 1; // Stays at 1 HP
            g.showMessage(`${defender.data.name} is Armored!`);
        }
        if (this.hasArmored(attacker) && attacker.damage >= attacker.currentToughness) {
            attacker.damage = attacker.currentToughness - 1;
            g.showMessage(`${attacker.data.name} is Armored!`);
        }

        g._checkUnitDeaths();

        // Alert - doesn't tap when attacking
        if (this.hasAlert(attacker)) {
            attacker.tapped = false;
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
