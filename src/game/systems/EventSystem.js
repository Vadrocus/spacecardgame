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

        // EMP Blast / EMP Pulse - Strike damage to orbital enemies
        if (name.includes('emp')) {
            this.executeEMPBlast(isPlayer1);
            return true;
        }

        // Orbital Strike / Bombardment (needs targeting)
        if (name.includes('orbital strike') || name.includes('bombardment')) {
            g.eventCard = card;
            g.eventIsPlayer1 = isPlayer1;
            g.showMessage('Select target ground unit for Orbital Strike');
            return false;
        }

        // Shield Matrix / Crystal Resonance - Boost defense
        if (name.includes('shield matrix') || name.includes('crystal resonance') || name.includes('reinforce')) {
            const myCards = isPlayer1 ? [...g.p1Orbit, ...g.p1Planet] : [...g.p2Orbit, ...g.p2Planet];
            for (const c of myCards) {
                c.toughness += 1;
                c.currentToughness += 1;
            }
            g.showMessage('All units gain +1 Defense!');
            return true;
        }

        // Phase Shift - makes unit intangible/heals
        if (name.includes('phase shift') || name.includes('phase out')) {
            const myCards = isPlayer1 ? [...g.p1Orbit, ...g.p1Planet] : [...g.p2Orbit, ...g.p2Planet];
            if (myCards.length > 0) {
                myCards[0].damage = 0;
                g.showMessage(`${myCards[0].data.name} phase shifted!`);
            }
            return true;
        }

        // Crystal Growth / Repair - heal a unit
        if (name.includes('crystal growth') || name.includes('repair') || name.includes('restore')) {
            const myCards = isPlayer1 ? [...g.p1Orbit, ...g.p1Planet] : [...g.p2Orbit, ...g.p2Planet];
            const damaged = myCards.filter(c => c.damage > 0);
            if (damaged.length > 0) {
                damaged[0].damage = 0;
                g.showMessage(`${damaged[0].data.name} repaired!`);
            }
            return true;
        }

        // Draw cards - Diplomatic Initiative, Intel Burst, etc.
        if (name.includes('diplomatic') || effect.includes('draw') && effect.includes('card')) {
            const drawMatch = effect.match(/draw\s*(\d+)/i);
            const count = drawMatch ? parseInt(drawMatch[1]) : 2;
            for (let i = 0; i < count; i++) {
                g.drawCardForPlayer(isPlayer1);
            }
            g.showMessage(`Drew ${count} cards!`);
            return true;
        }

        // Strike - Deal X damage to target
        if (effect.includes('deal') && effect.includes('damage')) {
            const damageMatch = effect.match(/deal\s*(\d+)\s*damage/i);
            const damage = damageMatch ? parseInt(damageMatch[1]) : 2;
            // Needs targeting
            g.eventCard = card;
            g.eventIsPlayer1 = isPlayer1;
            g.eventDamage = damage;
            g.showMessage(`Select target for ${damage} damage`);
            return false;
        }

        // Destroy - destroy target unit
        if (effect.includes('destroy target') || effect.includes('destroy a')) {
            g.eventCard = card;
            g.eventIsPlayer1 = isPlayer1;
            g.eventEffect = 'destroy';
            g.showMessage('Select target to destroy');
            return false;
        }

        // Disrupt - target player discards
        if (effect.includes('discard') && effect.includes('opponent')) {
            const discardMatch = effect.match(/discard\s*(\d+)/i);
            const count = discardMatch ? parseInt(discardMatch[1]) : 1;
            const enemyHand = isPlayer1 ? g.p2Hand : g.p1Hand;
            for (let i = 0; i < count && enemyHand.length > 0; i++) {
                const idx = Math.floor(Math.random() * enemyHand.length);
                const discarded = enemyHand.splice(idx, 1)[0];
                g.showMessage(`Opponent discards ${discarded.name}!`);
            }
            return true;
        }

        // Recall - return unit to hand
        if (effect.includes('return') && effect.includes('hand')) {
            g.eventCard = card;
            g.eventIsPlayer1 = isPlayer1;
            g.eventEffect = 'recall';
            g.showMessage('Select unit to return to hand');
            return false;
        }

        // Disable - tap target
        if (effect.includes('tap') || effect.includes('disable')) {
            g.eventCard = card;
            g.eventIsPlayer1 = isPlayer1;
            g.eventEffect = 'disable';
            g.showMessage('Select target to disable');
            return false;
        }

        // Boost - give +X/+X
        if (effect.includes('+') && (effect.includes('attack') || effect.includes('defense'))) {
            const atkMatch = effect.match(/\+(\d+)\s*attack/i);
            const defMatch = effect.match(/\+(\d+)\s*defense/i);
            const atkBonus = atkMatch ? parseInt(atkMatch[1]) : 0;
            const defBonus = defMatch ? parseInt(defMatch[1]) : 0;

            const myCards = isPlayer1 ? [...g.p1Orbit, ...g.p1Planet] : [...g.p2Orbit, ...g.p2Planet];
            if (myCards.length > 0) {
                const target = myCards[0]; // Could add targeting
                target.power += atkBonus;
                target.toughness += defBonus;
                target.currentToughness += defBonus;
                g.showMessage(`${target.data.name} gains +${atkBonus}/+${defBonus}!`);
            }
            return true;
        }

        // Counter - handled in spell stack (not implemented yet)
        if (effect.includes('counter') || effect.includes('cancel')) {
            g.showMessage('Counter ability (requires spell stack)');
            return true;
        }

        // Mill - discard from deck
        if (effect.includes('discard') && effect.includes('deck')) {
            const millMatch = effect.match(/(\d+)\s*cards?\s*from/i);
            const count = millMatch ? parseInt(millMatch[1]) : 3;
            const enemyDeck = isPlayer1 ? g.p2Deck : g.p1Deck;
            for (let i = 0; i < count && enemyDeck.cards.length > 0; i++) {
                enemyDeck.cards.pop();
            }
            g.showMessage(`Milled ${count} cards from enemy deck!`);
            return true;
        }

        // Search - find card from deck
        if (effect.includes('search') || effect.includes('find')) {
            // Would need UI for selection
            g.showMessage('Search effect (UI needed)');
            return true;
        }

        // Scout - look at top cards
        if (effect.includes('look at top') || effect.includes('scout')) {
            // Would need UI for arrangement
            g.showMessage('Scout effect (UI needed)');
            return true;
        }

        // Default - just show message
        g.showMessage(`Event: ${card.name}`);
        return true;
    }

    // Execute targeted event effects
    executeTargetedEffect(target, isPlayer1) {
        const g = this.game;
        const card = g.eventCard;

        if (!card) return;

        const effect = g.eventEffect || 'damage';
        const damage = g.eventDamage || 3;

        if (effect === 'destroy') {
            target.damage = target.currentToughness;
            g.showMessage(`${target.data.name} destroyed!`);
        } else if (effect === 'recall') {
            // Return to hand
            this.returnToHand(target);
            g.showMessage(`${target.data.name} returned to hand!`);
        } else if (effect === 'disable') {
            target.tap();
            g.showMessage(`${target.data.name} disabled!`);
        } else {
            // Default: damage
            target.dealDamage(damage);
            g.showMessage(`${target.data.name} takes ${damage} damage!`);
        }

        g._checkUnitDeaths();
        g.eventCard = null;
        g.eventEffect = null;
        g.eventDamage = null;
    }

    // Return a battlefield card to its owner's hand
    returnToHand(card) {
        const g = this.game;
        const isPlayer1 = card.isPlayer1;

        // Remove from battlefield
        const orbit = isPlayer1 ? g.p1Orbit : g.p2Orbit;
        const planet = isPlayer1 ? g.p1Planet : g.p2Planet;
        const hand = isPlayer1 ? g.p1Hand : g.p2Hand;

        let idx = orbit.indexOf(card);
        if (idx >= 0) orbit.splice(idx, 1);
        idx = planet.indexOf(card);
        if (idx >= 0) planet.splice(idx, 1);

        // Add to hand
        hand.push(card.data);
    }
}
