/**
 * Game State - Deck, Hand, Battlefield, Mana, Combat, AI, and Game Logic
 */

import { Card, CARD_WIDTH, CARD_HEIGHT } from './card.js';
import { cardDatabase, shuffle } from './data.js';
import { Draw } from './engine.js';

export class Deck {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.cards = [];
        this.zIndex = 0;
        this.hovered = false;

        const allCards = [...cardDatabase, ...cardDatabase];
        this.cards = shuffle(allCards);
    }

    get count() { return this.cards.length; }

    draw() {
        if (this.cards.length === 0) return null;
        return this.cards.pop();
    }

    containsPoint(px, py) {
        const scale = 0.5;
        const halfW = CARD_WIDTH * scale / 2;
        const halfH = CARD_HEIGHT * scale / 2;
        return px >= this.x - halfW && px <= this.x + halfW &&
               py >= this.y - halfH && py <= this.y + halfH;
    }

    update(dt, engine) {
        this.hovered = this.containsPoint(engine.mouse.x, engine.mouse.y);
    }

    render(ctx, engine) {
        const scale = 0.5;
        const w = CARD_WIDTH * scale, h = CARD_HEIGHT * scale;
        const halfW = w / 2, halfH = h / 2;

        ctx.save();
        ctx.translate(this.x, this.y);

        const stackCount = Math.min(4, Math.ceil(this.count / 10));
        for (let i = stackCount - 1; i >= 0; i--) {
            ctx.save();
            ctx.translate(-i * 1.5, -i * 1.5);
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;

            const gradient = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
            gradient.addColorStop(0, '#2d3561');
            gradient.addColorStop(1, '#1a1f3a');
            Draw.roundRect(ctx, -halfW, -halfH, w, h, 8);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        ctx.font = '10px PixelFont, monospace';
        ctx.fillStyle = '#00ff88';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DECK', 0, -8);
        ctx.font = '10px PixelFont, monospace';
        ctx.fillText(this.count.toString(), 0, 8);

        ctx.restore();
    }
}

export class Battlefield {
    constructor(engine, isEnemy = false) {
        this.engine = engine;
        this.isEnemy = isEnemy;
        this.creatures = [];
        this.spells = [];
        this.lands = [];
        this.zIndex = -10;
    }

    get y() {
        if (this.isEnemy) {
            return 140;
        }
        return this.engine.height / 2 + 50;
    }

    get creatureZoneY() { return this.y; }
    get landZoneY() {
        // Lands go ABOVE creatures for player, BELOW for enemy
        return this.y + (this.isEnemy ? CARD_HEIGHT * 0.28 : -CARD_HEIGHT * 0.35);
    }

    addCard(card) {
        card.isEnemy = this.isEnemy;
        if (card.data.type === 'creature') {
            this.creatures.push(card);
            this.engine.add(card);
            card.inBattlefield = true;
            if (card.data.haste) card.summoningSickness = false;
            this._layoutCreatures();
        } else if (card.data.type === 'land') {
            this.lands.push(card);
            this.engine.add(card);
            card.inBattlefield = true;
            this._layoutLands();
        } else {
            this.spells.push(card);
            this.engine.add(card);
            card.inBattlefield = true;
            this._layoutSpells();
        }
    }

    _layoutCreatures() {
        const count = this.creatures.length;
        if (count === 0) return;
        const cardScale = this.isEnemy ? 0.35 : 0.4;
        const spacing = Math.min(CARD_WIDTH * cardScale + 8, (this.engine.width - 200) / Math.max(count, 1));
        const totalWidth = spacing * (count - 1);
        const startX = (this.engine.width - totalWidth) / 2;

        this.creatures.forEach((card, i) => {
            card.baseZIndex = 10 + i;
            card.zIndex = 10 + i;
            this.engine.animate(card, {
                x: startX + spacing * i,
                y: this.creatureZoneY,
                rotation: 0,
                scale: cardScale
            }, 0.3, 'easeOutBack');
        });
    }

    _layoutSpells() {
        const count = this.spells.length;
        if (count === 0) return;
        const cardScale = this.isEnemy ? 0.3 : 0.35;
        const spacing = Math.min(CARD_WIDTH * cardScale + 8, (this.engine.width - 200) / Math.max(count, 1));
        const totalWidth = spacing * (count - 1);
        const startX = (this.engine.width - totalWidth) / 2;
        // Spells appear briefly at creature zone level
        const spellY = this.creatureZoneY;

        this.spells.forEach((card, i) => {
            card.baseZIndex = 5 + i;
            card.zIndex = 5 + i;
            this.engine.animate(card, { x: startX + spacing * i, y: spellY, rotation: 0, scale: cardScale }, 0.3, 'easeOutBack');
        });
    }

    _layoutLands() {
        const count = this.lands.length;
        if (count === 0) return;
        const cardScale = this.isEnemy ? 0.25 : 0.3;
        const spacing = Math.min(CARD_WIDTH * cardScale + 6, (this.engine.width - 200) / Math.max(count, 1));
        const totalWidth = spacing * (count - 1);
        const startX = (this.engine.width - totalWidth) / 2;

        this.lands.forEach((card, i) => {
            card.baseZIndex = 2 + i;
            card.zIndex = 2 + i;
            this.engine.animate(card, {
                x: startX + spacing * i,
                y: this.landZoneY,
                rotation: 0,
                scale: cardScale
            }, 0.3, 'easeOutBack');
        });
    }

    removeCard(card) {
        for (const arr of [this.creatures, this.spells, this.lands]) {
            const idx = arr.indexOf(card);
            if (idx !== -1) {
                arr.splice(idx, 1);
                this.engine.remove(card);
                if (arr === this.creatures) this._layoutCreatures();
                else if (arr === this.spells) this._layoutSpells();
                else this._layoutLands();
                return;
            }
        }
    }

    untapAll() {
        this.lands.forEach(l => l.tapped = false);
        this.creatures.forEach(c => c.tapped = false);
    }

    removeSummoningSickness() {
        this.creatures.forEach(c => c.summoningSickness = false);
    }

    update(dt, engine) {}

    render(ctx, engine) {
        const zoneWidth = engine.width - 200;
        const zoneX = 90;

        ctx.save();
        ctx.globalAlpha = 0.06;

        // Creature zone (smaller to match compact cards)
        const czH = CARD_HEIGHT * 0.35;
        const czY = this.creatureZoneY - czH / 2;
        ctx.fillStyle = this.isEnemy ? '#ef4444' : '#ff6b6b';
        Draw.roundRect(ctx, zoneX, czY, zoneWidth, czH, 6);
        ctx.fill();

        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = this.isEnemy ? '#ef4444' : '#ff6b6b';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Land zone (above creatures for player, below for enemy)
        ctx.globalAlpha = 0.06;
        const lzH = CARD_HEIGHT * 0.25;
        const lzY = this.landZoneY - lzH / 2;
        ctx.fillStyle = '#a855f7';
        Draw.roundRect(ctx, zoneX, lzY, zoneWidth, lzH, 6);
        ctx.fill();

        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Labels
        ctx.font = '6px PixelFont, monospace';
        ctx.globalAlpha = 0.5;
        ctx.textAlign = 'left';

        ctx.fillStyle = this.isEnemy ? '#ef4444' : '#ff6b6b';
        ctx.fillText(this.isEnemy ? 'ENEMY' : 'CREATURES', zoneX + 6, czY + 8);

        ctx.fillStyle = '#a855f7';
        ctx.fillText(this.isEnemy ? 'LANDS' : 'LANDS', zoneX + 6, lzY + 8);

        ctx.restore();
    }
}

export class Hand {
    constructor(engine, isEnemy = false) {
        this.engine = engine;
        this.isEnemy = isEnemy;
        this.cards = [];
        this.maxCards = 10;
    }

    get count() { return this.cards.length; }

    addCard(cardData, fromX, fromY) {
        const card = new Card(cardData, fromX, fromY);
        card.scale = 0.3;
        card.alpha = 0;
        card.inHand = true;
        card.isEnemy = this.isEnemy;
        this.cards.push(card);
        if (!this.isEnemy) this.engine.add(card);
        this._layoutCards();
        return card;
    }

    _layoutCards() {
        const count = this.cards.length;
        if (count === 0) return;

        if (this.isEnemy) {
            // Enemy hand is hidden, just track count
            return;
        }

        const cardScale = 0.45;
        const spacing = Math.min(CARD_WIDTH * cardScale * 0.7, (this.engine.width - 150) / Math.max(count, 1));
        const totalWidth = spacing * (count - 1);
        const startX = (this.engine.width - totalWidth) / 2;
        const y = this.engine.height - CARD_HEIGHT * cardScale / 2 - 15;
        const arcHeight = 12;

        this.cards.forEach((card, i) => {
            const t = count === 1 ? 0.5 : i / (count - 1);
            const arcOffset = -arcHeight * 4 * (t - 0.5) * (t - 0.5) + arcHeight;
            card.baseZIndex = 50 + i;
            card.zIndex = 50 + i;
            this.engine.animate(card, {
                x: startX + spacing * i,
                y: y - arcOffset,
                rotation: (t - 0.5) * 5,
                scale: cardScale,
                alpha: 1
            }, 0.4, 'easeOutBack');
        });
    }

    removeCard(card) {
        const idx = this.cards.indexOf(card);
        if (idx !== -1) {
            this.cards.splice(idx, 1);
            if (!this.isEnemy) this.engine.remove(card);
            card.inHand = false;
            this._layoutCards();
            return true;
        }
        return false;
    }
}

export class ManaPool {
    constructor() { this.current = 0; }
    add(n) { this.current += n; }
    spend(n) { if (this.current >= n) { this.current -= n; return true; } return false; }
    canAfford(n) { return this.current >= n; }
    reset() { this.current = 0; }
}

export class Game {
    constructor(engine) {
        this.engine = engine;

        // Player
        this.deck = new Deck(engine.width - 120, engine.height - 180);
        this.hand = new Hand(engine, false);
        this.battlefield = new Battlefield(engine, false);
        this.manaPool = new ManaPool();

        // Enemy
        this.enemyDeck = new Deck(engine.width - 120, 80);
        this.enemyHand = new Hand(engine, true);
        this.enemyBattlefield = new Battlefield(engine, true);
        this.enemyMana = new ManaPool();

        this.engine.add(this.deck);
        this.engine.add(this.battlefield);
        this.engine.add(this.enemyBattlefield);

        // Health
        this.playerHealth = 20;
        this.enemyHealth = 20;

        this.landPlayedThisTurn = false;
        this.turn = 1;
        this.isPlayerTurn = true;
        this.gameOver = false;
        this.winner = null;

        this.message = '';
        this.messageTimer = 0;

        this.enemyActionQueue = [];
        this.enemyActionTimer = 0;

        // Combat/blocking state
        this.combatPhase = 'none'; // 'none', 'declare_blockers', 'player_attack'
        this.attackingCreatures = [];
        this.playerAttackers = []; // Player's attacking creatures
        this.selectedBlocker = null;
        this.blockerAssignments = new Map(); // attacker -> blocker
    }

    showMessage(msg, duration = 2) {
        this.message = msg;
        this.messageTimer = duration;
    }

    // Player ends turn
    endPlayerTurn() {
        // Clear any pending attackers
        this.cancelPlayerAttack();

        this.isPlayerTurn = false;
        this.showMessage("Enemy's turn...");
        this.startEnemyTurn();
    }

    startEnemyTurn() {
        this.enemyMana.reset();
        this.enemyBattlefield.untapAll();
        this.enemyBattlefield.removeSummoningSickness();

        // Enemy draws
        if (this.enemyDeck.count > 0 && this.enemyHand.count < 10) {
            const cardData = this.enemyDeck.draw();
            if (cardData) this.enemyHand.addCard(cardData, this.enemyDeck.x, this.enemyDeck.y);
        }

        // Queue enemy actions
        this.enemyActionQueue = [];
        this.planEnemyActions();
        this.enemyActionTimer = 0.5;
    }

    planEnemyActions() {
        const hand = this.enemyHand.cards.slice();

        // Play a land first
        const land = hand.find(c => c.data.type === 'land');
        if (land) {
            this.enemyActionQueue.push({ type: 'playLand', card: land });
        }

        // Tap all lands for mana
        this.enemyActionQueue.push({ type: 'tapLands' });

        // Play affordable cards (prioritize creatures, then damage spells)
        const sorted = hand
            .filter(c => c.data.type !== 'land')
            .sort((a, b) => {
                if (a.data.type === 'creature' && b.data.type !== 'creature') return -1;
                if (b.data.type === 'creature' && a.data.type !== 'creature') return 1;
                return b.data.cost - a.data.cost; // Higher cost first
            });

        for (const card of sorted) {
            this.enemyActionQueue.push({ type: 'tryPlay', card });
        }

        // Attack with all creatures
        this.enemyActionQueue.push({ type: 'attackAll' });

        // End turn
        this.enemyActionQueue.push({ type: 'endTurn' });
    }

    executeEnemyAction() {
        if (this.enemyActionQueue.length === 0) return;

        const action = this.enemyActionQueue.shift();

        switch (action.type) {
            case 'playLand':
                if (this.enemyHand.removeCard(action.card)) {
                    this.enemyBattlefield.addCard(action.card);
                    this.showMessage('Enemy plays a land');
                }
                break;

            case 'tapLands':
                for (const land of this.enemyBattlefield.lands) {
                    if (!land.tapped) {
                        land.tapped = true;
                        this.enemyMana.add(land.data.manaProduction || 1);
                    }
                }
                break;

            case 'tryPlay':
                const card = action.card;
                if (this.enemyHand.cards.includes(card) && this.enemyMana.canAfford(card.data.cost)) {
                    this.enemyMana.spend(card.data.cost);
                    this.enemyHand.removeCard(card);
                    this.enemyBattlefield.addCard(card);

                    if (card.data.type === 'spell') {
                        this.executeEnemySpell(card);
                    } else {
                        this.showMessage(`Enemy summons ${card.data.name}!`);
                    }
                }
                break;

            case 'attackAll':
                // Gather attackers
                this.attackingCreatures = [];
                for (const creature of this.enemyBattlefield.creatures) {
                    if (!creature.tapped && !creature.summoningSickness) {
                        creature.tapped = true;
                        creature.isAttacking = true;
                        this.attackingCreatures.push(creature);
                    }
                }

                if (this.attackingCreatures.length > 0) {
                    // Check if player has untapped creatures to block with
                    const canBlock = this.battlefield.creatures.some(c => !c.tapped);
                    if (canBlock) {
                        // Enter blocking phase
                        this.combatPhase = 'declare_blockers';
                        this.blockerAssignments.clear();
                        this.selectedBlocker = null;
                        this.showMessage('Declare blockers! Click your creature, then an attacker.', 5);
                        return; // Pause enemy turn for blocking
                    } else {
                        // No blockers, deal damage immediately
                        this.resolveCombat();
                    }
                }
                break;

            case 'endTurn':
                this.startPlayerTurn();
                break;
        }
    }

    executeEnemySpell(card) {
        const effect = card.data.spellEffect;
        if (effect === 'damage') {
            const dmg = card.data.damage || 0;
            this.playerHealth -= dmg;
            this.showMessage(`Enemy's ${card.data.name} hits you for ${dmg}!`);
            if (this.playerHealth <= 0) {
                this.playerHealth = 0;
                this.gameOver = true;
                this.winner = 'enemy';
            }
        } else if (effect === 'heal') {
            this.enemyHealth += (card.data.healAmount || 0);
            this.showMessage(`Enemy heals for ${card.data.healAmount}!`);
        } else if (effect === 'draw') {
            const cnt = card.data.drawCount || 1;
            for (let i = 0; i < cnt && this.enemyDeck.count > 0; i++) {
                const c = this.enemyDeck.draw();
                if (c) this.enemyHand.addCard(c, this.enemyDeck.x, this.enemyDeck.y);
            }
        }
        setTimeout(() => this.enemyBattlefield.removeCard(card), 800);
    }

    startPlayerTurn() {
        this.turn++;
        this.isPlayerTurn = true;
        this.landPlayedThisTurn = false;
        this.manaPool.reset();
        this.battlefield.untapAll();
        this.battlefield.removeSummoningSickness();
        this.drawCard();
        this.showMessage(`Turn ${this.turn} - Your turn!`);
    }

    drawCard() {
        if (this.deck.count === 0 || this.hand.count >= 10) return false;
        const cardData = this.deck.draw();
        if (cardData) {
            this.hand.addCard(cardData, this.deck.x, this.deck.y);
            return true;
        }
        return false;
    }

    tapLandForMana(card) {
        if (card.data.type !== 'land' || card.tapped) return false;
        card.tapped = true;
        this.manaPool.add(card.data.manaProduction || 1);
        return true;
    }

    attackWithCreature(card) {
        if (card.data.type !== 'creature' || card.tapped) {
            this.showMessage('Already tapped!');
            return false;
        }
        if (card.summoningSickness) {
            this.showMessage('Summoning sickness!');
            return false;
        }

        // Toggle attack state
        if (card.isAttacking) {
            card.isAttacking = false;
            const idx = this.playerAttackers.indexOf(card);
            if (idx !== -1) this.playerAttackers.splice(idx, 1);
            this.showMessage('Attack cancelled');
        } else {
            card.isAttacking = true;
            this.playerAttackers.push(card);
            this.showMessage(`${card.data.name} ready to attack!`);
        }
        return true;
    }

    confirmPlayerAttack() {
        if (this.playerAttackers.length === 0) {
            this.showMessage('No attackers selected!');
            return;
        }

        // Tap all attackers
        for (const attacker of this.playerAttackers) {
            attacker.tapped = true;
        }

        // Check if enemy has untapped creatures to block
        const canBlock = this.enemyBattlefield.creatures.some(c => !c.tapped);

        if (canBlock) {
            // Enemy AI assigns blockers
            this.enemyAssignBlockers();
        }

        // Resolve combat
        this.resolvePlayerAttack();
    }

    enemyAssignBlockers() {
        // Simple AI: block the highest attack creatures first
        const availableBlockers = this.enemyBattlefield.creatures.filter(c => !c.tapped);
        const sortedAttackers = [...this.playerAttackers].sort((a, b) => b.attack - a.attack);

        for (const attacker of sortedAttackers) {
            if (availableBlockers.length === 0) break;

            // Find best blocker (can survive or trade)
            let bestBlocker = null;
            let bestScore = -Infinity;

            for (const blocker of availableBlockers) {
                // Flying check - only flying can block flying
                if (attacker.data.flying && !blocker.data.flying) continue;

                let score = 0;
                // Prefer blockers that can kill the attacker
                if (blocker.attack >= attacker.currentHealth) score += 10;
                // Prefer blockers that can survive
                if (blocker.currentHealth > attacker.attack) score += 5;
                // Prefer lower value blockers
                score -= blocker.data.cost;

                if (score > bestScore) {
                    bestScore = score;
                    bestBlocker = blocker;
                }
            }

            if (bestBlocker && bestScore > -5) {
                this.blockerAssignments.set(attacker, bestBlocker);
                bestBlocker.isBlocking = attacker;
                availableBlockers.splice(availableBlockers.indexOf(bestBlocker), 1);
            }
        }
    }

    resolvePlayerAttack() {
        for (const attacker of this.playerAttackers) {
            const blocker = this.blockerAssignments.get(attacker);

            if (blocker) {
                // Combat between attacker and blocker
                const damageToBlocker = attacker.attack;
                const damageToAttacker = blocker.attack;

                blocker.currentHealth -= damageToBlocker;
                attacker.currentHealth -= damageToAttacker;

                this.showMessage(`${attacker.data.name} blocked by ${blocker.data.name}!`, 1.5);

                // Lifelink - heal when dealing damage
                if (attacker.data.lifelink && damageToBlocker > 0) {
                    this.playerHealth += damageToBlocker;
                    this.showMessage(`Lifelink: +${damageToBlocker} HP!`, 1);
                }

                // Trample - excess damage goes through
                if (attacker.data.trample && blocker.currentHealth < 0) {
                    const excessDamage = Math.abs(blocker.currentHealth);
                    this.enemyHealth -= excessDamage;
                    this.showMessage(`Trample: ${excessDamage} damage to enemy!`, 1);
                    if (this.enemyHealth <= 0) {
                        this.enemyHealth = 0;
                        this.gameOver = true;
                        this.winner = 'player';
                    }
                }

                // Check for deaths
                if (blocker.currentHealth <= 0) {
                    blocker.isBlocking = null;
                    setTimeout(() => {
                        this.enemyBattlefield.removeCard(blocker);
                    }, 300);
                }
                if (attacker.currentHealth <= 0) {
                    setTimeout(() => {
                        this.battlefield.removeCard(attacker);
                    }, 300);
                }
            } else {
                // Unblocked - damage goes to enemy
                const damage = attacker.attack;
                this.enemyHealth -= damage;
                this.showMessage(`${attacker.data.name} hits enemy for ${damage}!`, 1.5);

                // Lifelink - heal when dealing damage
                if (attacker.data.lifelink) {
                    this.playerHealth += damage;
                    this.showMessage(`Lifelink: +${damage} HP!`, 1);
                }

                if (this.enemyHealth <= 0) {
                    this.enemyHealth = 0;
                    this.gameOver = true;
                    this.winner = 'player';
                    this.showMessage('VICTORY!', 999);
                }
            }

            attacker.isAttacking = false;
        }

        // Clear enemy blocking flags
        for (const creature of this.enemyBattlefield.creatures) {
            creature.isBlocking = null;
        }

        // Clear attack state
        this.playerAttackers = [];
        this.blockerAssignments.clear();
    }

    cancelPlayerAttack() {
        for (const attacker of this.playerAttackers) {
            attacker.isAttacking = false;
        }
        this.playerAttackers = [];
        this.showMessage('Attack cancelled');
    }

    resolveCombat() {
        // Process each attacker (enemy attacking player)
        for (const attacker of this.attackingCreatures) {
            const blocker = this.blockerAssignments.get(attacker);

            if (blocker) {
                // Combat between attacker and blocker
                const damageToBlocker = attacker.attack;
                const damageToAttacker = blocker.attack;

                blocker.currentHealth -= damageToBlocker;
                attacker.currentHealth -= damageToAttacker;

                this.showMessage(`${blocker.data.name} blocks ${attacker.data.name}!`, 1.5);

                // Enemy lifelink - heal enemy when dealing damage
                if (attacker.data.lifelink && damageToBlocker > 0) {
                    this.enemyHealth += damageToBlocker;
                }

                // Enemy trample - excess damage goes through to player
                if (attacker.data.trample && blocker.currentHealth < 0) {
                    const excessDamage = Math.abs(blocker.currentHealth);
                    this.playerHealth -= excessDamage;
                    this.showMessage(`Trample: ${excessDamage} damage to you!`, 1);
                    if (this.playerHealth <= 0) {
                        this.playerHealth = 0;
                        this.gameOver = true;
                        this.winner = 'enemy';
                    }
                }

                // Check for deaths
                if (blocker.currentHealth <= 0) {
                    setTimeout(() => {
                        this.battlefield.removeCard(blocker);
                    }, 300);
                }
                if (attacker.currentHealth <= 0) {
                    setTimeout(() => {
                        this.enemyBattlefield.removeCard(attacker);
                    }, 300);
                }
            } else {
                // Unblocked - damage goes to player
                const damage = attacker.attack;
                this.playerHealth -= damage;
                this.showMessage(`${attacker.data.name} hits you for ${damage}!`, 1.5);

                // Enemy lifelink
                if (attacker.data.lifelink) {
                    this.enemyHealth += damage;
                }

                if (this.playerHealth <= 0) {
                    this.playerHealth = 0;
                    this.gameOver = true;
                    this.winner = 'enemy';
                    this.showMessage('YOU LOSE!', 999);
                }
            }

            attacker.isAttacking = false;
        }

        // Clear blocking flags on all player creatures
        for (const creature of this.battlefield.creatures) {
            creature.isBlocking = null;
            creature.isSelectedBlocker = false;
        }

        // Clear combat state
        this.attackingCreatures = [];
        this.blockerAssignments.clear();
        this.selectedBlocker = null;
        this.combatPhase = 'none';

        // Continue enemy turn
        if (!this.gameOver) {
            this.enemyActionTimer = 0.8;
        }
    }

    confirmBlockers() {
        this.resolveCombat();
    }

    handleBlockerSelection(engine) {
        if (!engine.mouse.clicked) return;

        // Check if clicked "Confirm Blockers" button
        const bx = engine.width / 2, by = engine.height / 2 + 80;
        const bw = 160, bh = 40;
        if (engine.mouse.x >= bx - bw/2 && engine.mouse.x <= bx + bw/2 &&
            engine.mouse.y >= by - bh/2 && engine.mouse.y <= by + bh/2) {
            this.confirmBlockers();
            return;
        }

        // Check if clicked a player creature (to select as blocker)
        for (const creature of this.battlefield.creatures) {
            if (creature.hovered && !creature.tapped) {
                // Toggle selection
                if (this.selectedBlocker === creature) {
                    this.selectedBlocker = null;
                    creature.isSelectedBlocker = false;
                } else {
                    if (this.selectedBlocker) {
                        this.selectedBlocker.isSelectedBlocker = false;
                    }
                    this.selectedBlocker = creature;
                    creature.isSelectedBlocker = true;
                    this.showMessage(`Selected ${creature.data.name} as blocker`, 1.5);
                }
                return;
            }
        }

        // Check if clicked an attacking enemy creature (to assign blocker)
        if (this.selectedBlocker) {
            for (const attacker of this.attackingCreatures) {
                if (attacker.hovered) {
                    // Check flying - only flying can block flying
                    if (attacker.data.flying && !this.selectedBlocker.data.flying) {
                        this.showMessage("Can't block flying with ground unit!", 1.5);
                        return;
                    }

                    // Remove this blocker from any previous assignment
                    for (const [atk, blk] of this.blockerAssignments) {
                        if (blk === this.selectedBlocker) {
                            this.blockerAssignments.delete(atk);
                            break;
                        }
                    }

                    // Assign blocker to this attacker
                    this.blockerAssignments.set(attacker, this.selectedBlocker);
                    this.selectedBlocker.isBlocking = attacker;
                    this.showMessage(`${this.selectedBlocker.data.name} will block ${attacker.data.name}`, 1.5);

                    this.selectedBlocker.isSelectedBlocker = false;
                    this.selectedBlocker = null;
                    return;
                }
            }
        }
    }

    executeSpellEffect(card) {
        const effect = card.data.spellEffect;
        if (effect === 'damage') {
            this.enemyHealth -= card.data.damage || 0;
            this.showMessage(`${card.data.name} deals ${card.data.damage}!`);
            if (this.enemyHealth <= 0) {
                this.enemyHealth = 0;
                this.gameOver = true;
                this.winner = 'player';
            }
        } else if (effect === 'heal') {
            this.playerHealth += (card.data.healAmount || 0);
            this.showMessage(`Healed ${card.data.healAmount} HP!`);
        } else if (effect === 'draw') {
            for (let i = 0; i < (card.data.drawCount || 1); i++) {
                setTimeout(() => this.drawCard(), i * 150);
            }
            this.showMessage(`Draw ${card.data.drawCount} cards!`);
        }
        setTimeout(() => this.battlefield.removeCard(card), 800);
    }

    playCard(card) {
        if (this.gameOver || !this.isPlayerTurn) return false;

        if (card.data.type === 'land') {
            if (this.landPlayedThisTurn) {
                this.showMessage('Already played a land!');
                return false;
            }
            this.landPlayedThisTurn = true;
            this.hand.removeCard(card);
            this.battlefield.addCard(card);
            this.showMessage('Land played!');
            return true;
        }

        if (!this.manaPool.canAfford(card.data.cost)) {
            this.showMessage(`Need ${card.data.cost} mana!`);
            return false;
        }

        this.manaPool.spend(card.data.cost);
        this.hand.removeCard(card);
        this.battlefield.addCard(card);

        if (card.data.type === 'spell') {
            this.executeSpellEffect(card);
        } else {
            this.showMessage(`Summoned ${card.data.name}!`);
        }
        return true;
    }

    update(dt, engine) {
        if (this.gameOver) return;

        if (this.messageTimer > 0) this.messageTimer -= dt;

        // Update deck positions
        this.deck.x = engine.width - 100;
        this.deck.y = engine.height - 100;
        this.enemyDeck.x = engine.width - 100;
        this.enemyDeck.y = 100;

        // Blocking phase - player declares blockers during enemy turn
        if (this.combatPhase === 'declare_blockers') {
            this.handleBlockerSelection(engine);
            return;
        }

        // Enemy turn logic
        if (!this.isPlayerTurn) {
            this.enemyActionTimer -= dt;
            if (this.enemyActionTimer <= 0 && this.enemyActionQueue.length > 0) {
                this.executeEnemyAction();
                this.enemyActionTimer = 0.6;
            }
            return;
        }

        // Player input
        if (engine.mouse.clicked) {
            for (let i = this.battlefield.creatures.length - 1; i >= 0; i--) {
                const c = this.battlefield.creatures[i];
                if (c.hovered) { this.attackWithCreature(c); return; }
            }

            for (let i = this.battlefield.lands.length - 1; i >= 0; i--) {
                const l = this.battlefield.lands[i];
                if (l.hovered && !l.tapped) { this.tapLandForMana(l); return; }
            }

            for (let i = this.hand.cards.length - 1; i >= 0; i--) {
                const c = this.hand.cards[i];
                if (c.hovered) { this.playCard(c); return; }
            }
        }
    }

    renderUI(ctx, engine) {
        ctx.save();

        // Mana orb
        ctx.beginPath();
        ctx.arc(40, 70, 25, 0, Math.PI * 2);
        const mg = ctx.createRadialGradient(36, 66, 0, 40, 70, 25);
        mg.addColorStop(0, '#60a5fa');
        mg.addColorStop(1, '#1e40af');
        ctx.fillStyle = mg;
        ctx.fill();
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = '16px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(this.manaPool.current.toString(), 40, 72);

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = '#60a5fa';
        ctx.textAlign = 'left';
        ctx.fillText('MANA', 70, 65);
        ctx.fillStyle = '#888';
        ctx.fillText(`Turn ${this.turn}`, 70, 78);

        // Player HP
        ctx.beginPath();
        ctx.arc(45, engine.height - 55, 30, 0, Math.PI * 2);
        const pg = ctx.createRadialGradient(40, engine.height - 60, 0, 45, engine.height - 55, 30);
        pg.addColorStop(0, '#22c55e');
        pg.addColorStop(1, '#15803d');
        ctx.fillStyle = pg;
        ctx.fill();
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = '18px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(this.playerHealth.toString(), 45, engine.height - 53);

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = '#22c55e';
        ctx.textAlign = 'left';
        ctx.fillText('YOU', 80, engine.height - 60);

        // Enemy HP
        ctx.beginPath();
        ctx.arc(45, 45, 30, 0, Math.PI * 2);
        const eg = ctx.createRadialGradient(40, 40, 0, 45, 45, 30);
        eg.addColorStop(0, '#ef4444');
        eg.addColorStop(1, '#b91c1c');
        ctx.fillStyle = eg;
        ctx.fill();
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = '18px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(this.enemyHealth.toString(), 45, 47);

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'left';
        ctx.fillText('ENEMY', 80, 40);

        // Enemy hand count
        ctx.fillStyle = '#888';
        ctx.fillText(`Hand: ${this.enemyHand.count}`, 80, 55);

        // End Turn button and Attack buttons
        if (this.isPlayerTurn) {
            // Check if player has attackers selected
            if (this.playerAttackers.length > 0) {
                // Attack button
                const atkX = engine.width - 180, atkY = engine.height - 55;
                const atkW = 90, atkH = 35;
                const atkHover = engine.mouse.x >= atkX - atkW/2 && engine.mouse.x <= atkX + atkW/2 &&
                                 engine.mouse.y >= atkY - atkH/2 && engine.mouse.y <= atkY + atkH/2;

                Draw.roundRect(ctx, atkX - atkW/2, atkY - atkH/2, atkW, atkH, 6);
                ctx.fillStyle = atkHover ? '#ef4444' : '#dc2626';
                ctx.fill();
                ctx.strokeStyle = '#fca5a5';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.font = '9px PixelFont, monospace';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('ATTACK!', atkX, atkY);

                if (engine.mouse.clicked && atkHover) {
                    this.confirmPlayerAttack();
                }

                // Cancel button
                const canX = engine.width - 70, canY = engine.height - 55;
                const canW = 70, canH = 35;
                const canHover = engine.mouse.x >= canX - canW/2 && engine.mouse.x <= canX + canW/2 &&
                                 engine.mouse.y >= canY - canH/2 && engine.mouse.y <= canY + canH/2;

                Draw.roundRect(ctx, canX - canW/2, canY - canH/2, canW, canH, 6);
                ctx.fillStyle = canHover ? '#666' : '#444';
                ctx.fill();
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.font = '8px PixelFont, monospace';
                ctx.fillStyle = '#fff';
                ctx.fillText('CANCEL', canX, canY);

                if (engine.mouse.clicked && canHover) {
                    this.cancelPlayerAttack();
                }

                // Show attacker count
                ctx.font = '8px PixelFont, monospace';
                ctx.fillStyle = '#ef4444';
                ctx.textAlign = 'center';
                ctx.fillText(`${this.playerAttackers.length} attacker(s)`, engine.width - 125, engine.height - 80);
            } else {
                // Normal End Turn button
                const bx = engine.width - 120, by = engine.height - 55;
                const bw = 100, bh = 35;
                const bh2 = bh / 2, bw2 = bw / 2;
                const hover = engine.mouse.x >= bx - bw2 && engine.mouse.x <= bx + bw2 &&
                              engine.mouse.y >= by - bh2 && engine.mouse.y <= by + bh2;

                Draw.roundRect(ctx, bx - bw2, by - bh2, bw, bh, 6);
                ctx.fillStyle = hover ? '#22c55e' : '#16a34a';
                ctx.fill();
                ctx.strokeStyle = '#86efac';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.font = '10px PixelFont, monospace';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('END TURN', bx, by);

                if (engine.mouse.clicked && hover) {
                    this.endPlayerTurn();
                }
            }
        } else {
            // Show "Enemy Turn" indicator
            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center';
            ctx.fillText('ENEMY TURN...', engine.width - 120, engine.height - 55);
        }

        // Blocking phase UI
        if (this.combatPhase === 'declare_blockers') {
            // Semi-transparent overlay
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, engine.width, engine.height);
            ctx.globalAlpha = 1;

            // Title
            ctx.font = '14px PixelFont, monospace';
            ctx.fillStyle = '#ff6b6b';
            ctx.textAlign = 'center';
            ctx.fillText('DECLARE BLOCKERS', engine.width / 2, engine.height / 2 - 60);

            ctx.font = '8px PixelFont, monospace';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Click your creature, then click an attacker to block', engine.width / 2, engine.height / 2 - 40);

            // Show attacker count
            const blockedCount = this.blockerAssignments.size;
            ctx.fillStyle = '#fff';
            ctx.fillText(`Blocking ${blockedCount}/${this.attackingCreatures.length} attackers`, engine.width / 2, engine.height / 2 - 20);

            // Confirm button
            const bx = engine.width / 2, by = engine.height / 2 + 80;
            const bw = 160, bh = 40;
            const hover = engine.mouse.x >= bx - bw/2 && engine.mouse.x <= bx + bw/2 &&
                          engine.mouse.y >= by - bh/2 && engine.mouse.y <= by + bh/2;

            Draw.roundRect(ctx, bx - bw/2, by - bh/2, bw, bh, 8);
            ctx.fillStyle = hover ? '#ef4444' : '#dc2626';
            ctx.fill();
            ctx.strokeStyle = '#fca5a5';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textBaseline = 'middle';
            ctx.fillText('CONFIRM BLOCKERS', bx, by);
        }

        // Message
        if (this.messageTimer > 0 && this.message) {
            ctx.globalAlpha = Math.min(1, this.messageTimer);
            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = this.gameOver ? (this.winner === 'player' ? '#22c55e' : '#ef4444') : '#ffeb3b';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(this.message, engine.width / 2, engine.height / 2 + 140);
        }

        // Game over
        if (this.gameOver) {
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, engine.width, engine.height);
            ctx.globalAlpha = 1;

            ctx.font = '32px PixelFont, monospace';
            ctx.fillStyle = this.winner === 'player' ? '#22c55e' : '#ef4444';
            ctx.textAlign = 'center';
            ctx.fillText(this.winner === 'player' ? 'VICTORY!' : 'DEFEAT!', engine.width / 2, engine.height / 2 - 20);

            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText('Refresh to play again', engine.width / 2, engine.height / 2 + 30);
        }

        ctx.restore();
    }
}
