/**
 * AIPlayer - AI opponent logic for single-player mode
 * Handles automated turns for player 2
 */

export class AIPlayer {
    constructor(game) {
        this.game = game;
    }

    // AI Turn - simple opponent AI
    runAITurn() {
        // Use setTimeout to create a delay for visual feedback
        setTimeout(() => this.gateAction(), 500);
    }

    gateAction() {
        const g = this.game;
        // Gate action: 50% chance to add new gate, 50% to upgrade existing
        if (!g.gateActionUsed) {
            if (g.p2Gates.length < 3 && Math.random() < 0.5) {
                g.addGate();
            } else if (g.p2Gates.length > 0) {
                // Upgrade the smallest gate
                const smallestGate = g.p2Gates.reduce((min, gate) => gate.power < min.power ? gate : min);
                g.incrementGate(smallestGate);
            } else {
                g.addGate();
            }
        }

        // Play cards after a delay
        setTimeout(() => this.playCards(), 600);
    }

    playCards() {
        const g = this.game;
        // Try to play cards from hand
        const hand = g.p2Hand;
        const gates = g.p2Gates.filter(gate => !gate.used).sort((a, b) => a.power - b.power);

        // Try to play each card in hand if we have a gate for it
        for (let i = hand.length - 1; i >= 0 && gates.length > 0; i--) {
            const card = hand[i];
            const cost = card.cost || 0;

            // Find a suitable gate (smallest one that can afford it)
            const gateIdx = gates.findIndex(gate => gate.power >= cost);
            if (gateIdx !== -1) {
                const gate = gates[gateIdx];
                g.playCard(i, false, gate);
                gates.splice(gateIdx, 1); // Remove used gate from consideration
            }
        }

        // Land dropships and attack after a delay
        setTimeout(() => this.landAndAttack(), 600);
    }

    landAndAttack() {
        const g = this.game;
        // Deploy tokens from carriers
        for (const card of g.p2Orbit) {
            if (g.canDeployToken(card)) {
                g.deployTokens(card, false);
            }
        }

        // Land any ready dropships
        for (let i = g.p2Orbit.length - 1; i >= 0; i--) {
            const card = g.p2Orbit[i];
            if (g.isDropship(card) && !card.summoningSickness && !card.tapped) {
                g.landDropship(card, false);
            }
        }

        // Attack with ground units after a delay
        setTimeout(() => this.attack(), 500);
    }

    attack() {
        const g = this.game;
        // Attack with any ready OFFENSIVE ground units only
        const myGroundUnits = g.p2Planet.filter(u =>
            !u.tapped && !u.summoningSickness && u.power > 0 && g.isOffensiveUnit(u)
        );
        // Get attackable enemy ground units (excluding artifacts)
        const enemyGroundUnits = g.p1Planet.filter(u => !g.isArtifact(u));

        for (const attacker of myGroundUnits) {
            if (enemyGroundUnits.length > 0) {
                // Attack the weakest enemy unit
                const weakest = enemyGroundUnits.reduce((min, u) => {
                    const minHP = min.currentToughness - min.damage;
                    const uHP = u.currentToughness - u.damage;
                    return uHP < minHP ? u : min;
                });
                g.performCombatWithAbilities(attacker, weakest);
                attacker.tap();
            }
        }

        // Attack with OFFENSIVE orbital units only
        const myOrbitUnits = g.p2Orbit.filter(u =>
            !u.tapped && !u.summoningSickness && u.power > 0 && g.isOffensiveUnit(u)
        );
        // Get attackable enemy orbital units (excluding artifacts)
        const enemyOrbitUnits = g.p1Orbit.filter(u => !g.isArtifact(u));

        for (const attacker of myOrbitUnits) {
            if (enemyOrbitUnits.length > 0) {
                // Attack the weakest enemy orbital unit
                const weakest = enemyOrbitUnits.reduce((min, u) => {
                    const minHP = min.currentToughness - min.damage;
                    const uHP = u.currentToughness - u.damage;
                    return uHP < minHP ? u : min;
                });
                g.performCombatWithAbilities(attacker, weakest);
                attacker.tap();
            } else if (g.hasOrbitalStrike(attacker) && enemyGroundUnits.length > 0) {
                // Use orbital strike on ground units
                const weakest = enemyGroundUnits.reduce((min, u) => {
                    const minHP = min.currentToughness - min.damage;
                    const uHP = u.currentToughness - u.damage;
                    return uHP < minHP ? u : min;
                });
                g.performOrbitalStrike(attacker, weakest);
                attacker.tap();
            }
        }

        // End AI turn after a delay
        setTimeout(() => this.endTurn(), 500);
    }

    endTurn() {
        const g = this.game;
        g.showMessage("AI ended turn");
        // Switch back to player 1
        g.isPlayer1Turn = true;
        g.gateActionUsed = false;
        g.turn++;

        // Reset all gates for player 1
        g.p1Gates.forEach(gate => gate.reset());

        // Remove summoning sickness from P2 cards (they've been out a full turn)
        g.p2Orbit.forEach(c => c.removeSummoningSickness());
        g.p2Planet.forEach(c => c.removeSummoningSickness());

        // Untap all P1 cards
        g.p1Orbit.forEach(c => c.untap());
        g.p1Planet.forEach(c => c.untap());

        // Draw a card for player 1
        const drawnCard = g.drawCard(true);
        if (drawnCard) {
            g.showMessage("Your turn - Drew a card!");
        } else {
            g.showMessage("Your turn!");
        }
    }
}
