/**
 * EventSystem - Handles event cards and their effects
 * Manages instant/sorcery card types and their resolution
 */

export class EventSystem {
    constructor(game) {
        this.game = game;
    }

    // Check if a card is an event type
    isEventCard(card) {
        const type = (card.type || '').toLowerCase();
        return type.includes('event') || type.includes('instant') || type.includes('sorcery');
    }

    // Check if card is an event (alias)
    isEvent(card) {
        const type = (card.type || '').toLowerCase();
        return type.includes('event');
    }

    // Trigger an event card's effect
    triggerEventEffect(card, isPlayer1) {
        // Use the comprehensive playEventCard method
        this.playEventCard(card, isPlayer1);
    }

    // Execute EMP Blast - 2 damage to all enemies in orbit
    executeEMPBlast(isPlayer1) {
        const g = this.game;
        const enemyOrbit = isPlayer1 ? g.p2Orbit : g.p1Orbit;

        let hitCount = 0;
        for (const card of enemyOrbit) {
            card.dealDamage(2);
            hitCount++;
        }

        g.showMessage(`EMP BLAST! ${hitCount} enemies hit for 2 damage each!`);
        g._checkUnitDeaths();
    }

    // Execute Orbital Strike event - 3 damage to target ground unit
    executeOrbitalStrikeEvent(target) {
        const g = this.game;
        target.dealDamage(3);
        g.showMessage(`Orbital Strike hits ${target.data.name} for 3 damage!`);
        g._checkUnitDeaths();
    }

    // Play an event card
    playEventCard(card, isPlayer1) {
        const g = this.game;
        const name = (card.name || '').toLowerCase();
        const effect = (card.effect || card.ability || '').toLowerCase();

        // EMP Blast / EMP Pulse
        if (name.includes('emp')) {
            this.executeEMPBlast(isPlayer1);
            return true;
        }

        // Orbital Strike (needs targeting)
        if (name.includes('orbital strike') || name.includes('bombardment')) {
            g.eventCard = card;
            g.eventIsPlayer1 = isPlayer1;
            g.showMessage('Select target ground unit for Orbital Strike');
            return false; // Don't complete yet, need target
        }

        // Shield Matrix - all friendly units get +1 defense
        if (name.includes('shield matrix') || name.includes('crystal resonance')) {
            const myCards = isPlayer1 ? [...g.p1Orbit, ...g.p1Planet] : [...g.p2Orbit, ...g.p2Planet];
            for (const c of myCards) {
                c.toughness += 1;
                c.currentToughness += 1;
            }
            g.showMessage('Shield Matrix activated! All units gain +1 Defense!');
            return true;
        }

        // Phase Shift - target becomes intangible
        if (name.includes('phase shift')) {
            // For now, just heal a unit
            const myCards = isPlayer1 ? [...g.p1Orbit, ...g.p1Planet] : [...g.p2Orbit, ...g.p2Planet];
            if (myCards.length > 0) {
                myCards[0].damage = 0;
                g.showMessage(`${myCards[0].data.name} phase shifted!`);
            }
            return true;
        }

        // Crystal Growth - repair a unit
        if (name.includes('crystal growth') || name.includes('repair')) {
            const myCards = isPlayer1 ? [...g.p1Orbit, ...g.p1Planet] : [...g.p2Orbit, ...g.p2Planet];
            const damaged = myCards.filter(c => c.damage > 0);
            if (damaged.length > 0) {
                damaged[0].damage = 0;
                g.showMessage(`${damaged[0].data.name} repaired!`);
            }
            return true;
        }

        // Diplomatic Initiative - draw cards
        if (name.includes('diplomatic') || name.includes('draw')) {
            g.drawCardForPlayer(isPlayer1);
            g.drawCardForPlayer(isPlayer1);
            return true;
        }

        // Default - just show message
        g.showMessage(`Event: ${card.name}`);
        return true;
    }
}
