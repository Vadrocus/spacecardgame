/**
 * Space Card Game - Board, Zones, Gates, and Game Logic
 */

import { Card, CARD_WIDTH, CARD_HEIGHT } from './card.js';
import { cardDatabase, planetDeck, artifactDeck, nativesDeck, shuffle, pickRandom } from './data.js';
import { Draw } from './engine.js';

// Deck class
export class Deck {
    constructor(x, y, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;
        this.cards = [];
        this.zIndex = 0;
        this.hovered = false;

        // Each player gets their own shuffled 40-card deck
        this.cards = shuffle([...cardDatabase]);
    }

    get count() { return this.cards.length; }

    draw() {
        if (this.cards.length === 0) return null;
        return this.cards.pop();
    }

    containsPoint(px, py) {
        const scale = 0.4;
        const halfW = CARD_WIDTH * scale / 2;
        const halfH = CARD_HEIGHT * scale / 2;
        return px >= this.x - halfW && px <= this.x + halfW &&
               py >= this.y - halfH && py <= this.y + halfH;
    }

    update(dt, engine) {
        this.hovered = this.containsPoint(engine.mouse.x, engine.mouse.y);
    }

    render(ctx) {
        const scale = 0.4;
        const w = CARD_WIDTH * scale, h = CARD_HEIGHT * scale;
        const halfW = w / 2, halfH = h / 2;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Stack visual
        const stackCount = Math.min(4, Math.ceil(this.count / 10));
        for (let i = stackCount - 1; i >= 0; i--) {
            ctx.save();
            ctx.translate(-i * 1.5, -i * 1.5);
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;

            const gradient = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
            gradient.addColorStop(0, '#1a3a5c');
            gradient.addColorStop(1, '#0d1f33');
            Draw.roundRect(ctx, -halfW, -halfH, w, h, 6);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = '#4ecdc4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DECK', 0, -6);
        ctx.fillStyle = '#fff';
        ctx.fillText(this.count.toString(), 0, 8);

        ctx.restore();
    }
}

// Graveyard class
export class Graveyard {
    constructor(x, y, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;
        this.cards = [];
    }

    get count() { return this.cards.length; }

    add(cardData) {
        this.cards.push(cardData);
    }

    render(ctx) {
        const scale = 0.35;
        const w = CARD_WIDTH * scale, h = CARD_HEIGHT * scale;
        const halfW = w / 2, halfH = h / 2;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = this.count > 0 ? 0.8 : 0.3;

        Draw.roundRect(ctx, -halfW, -halfH, w, h, 6);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '7px PixelFont, monospace';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GRAVE', 0, -6);
        ctx.fillStyle = '#888';
        ctx.fillText(this.count.toString(), 0, 8);

        ctx.restore();
    }
}

// Gate class - can be incremented
export class Gate {
    constructor(x, y, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.isPlayer = isPlayer;
        this.power = 1;
        this.hovered = false;
        this.pulseTime = Math.random() * Math.PI * 2;
    }

    increment() {
        this.power++;
    }

    containsPoint(px, py) {
        return Math.abs(px - this.x) < 30 && Math.abs(py - this.y) < 30;
    }

    update(dt, engine) {
        this.hovered = this.containsPoint(engine.mouse.x, engine.mouse.y);
        this.pulseTime += dt * 2;

        // Smooth movement
        this.x += (this.targetX - this.x) * 8 * dt;
        this.y += (this.targetY - this.y) * 8 * dt;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const pulse = Math.sin(this.pulseTime) * 0.1 + 1;
        const size = 25 * pulse;

        // Outer glow
        ctx.beginPath();
        ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
        ctx.fillStyle = this.isPlayer ? 'rgba(78, 205, 196, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        ctx.fill();

        // Gate ring
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        gradient.addColorStop(0, this.isPlayer ? '#0d3d56' : '#3d1515');
        gradient.addColorStop(1, this.isPlayer ? '#4ecdc4' : '#ef4444');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Inner void
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();

        // Power number
        ctx.font = '14px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.power.toString(), 0, 2);

        // Hover effect
        if (this.hovered) {
            ctx.beginPath();
            ctx.arc(0, 0, size + 12, 0, Math.PI * 2);
            ctx.strokeStyle = this.isPlayer ? '#4ecdc4' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Static display card (for planet, artifact, natives)
export class DisplayCard {
    constructor(x, y, data, label) {
        this.x = x;
        this.y = y;
        this.data = data;
        this.label = label;
        this.hovered = false;
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

    render(ctx) {
        const scale = this.hovered ? 0.55 : 0.5;
        const w = CARD_WIDTH * scale, h = CARD_HEIGHT * scale;
        const halfW = w / 2, halfH = h / 2;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Card shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;

        // Card background
        const gradient = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
        gradient.addColorStop(0, this.data.color || '#333');
        gradient.addColorStop(1, '#1a1a2e');
        Draw.roundRect(ctx, -halfW, -halfH, w, h, 8);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Border
        ctx.strokeStyle = this.data.color || '#666';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Label
        ctx.font = '7px PixelFont, monospace';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText(this.label, 0, -halfH + 12);

        // Name
        ctx.font = '9px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(this.data.name, 0, -halfH + 30);

        // Type icon area
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fill();
        ctx.strokeStyle = this.data.color || '#666';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Type symbol
        ctx.font = '12px PixelFont, monospace';
        ctx.fillStyle = this.data.color || '#fff';
        if (this.data.type === 'planet') ctx.fillText('P', 0, 4);
        else if (this.data.type === 'artifact') ctx.fillText('A', 0, 4);
        else if (this.data.type === 'natives') ctx.fillText('N', 0, 4);

        // Effect text
        ctx.font = '6px PixelFont, monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText(this.data.effect, 0, halfH - 20);

        // Stat
        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = this.data.color || '#fff';
        if (this.data.resources) ctx.fillText(`RES: ${this.data.resources}`, 0, halfH - 8);
        else if (this.data.power) ctx.fillText(`PWR: ${this.data.power}`, 0, halfH - 8);
        else if (this.data.hostility) ctx.fillText(`HOST: ${this.data.hostility}`, 0, halfH - 8);

        ctx.restore();
    }
}

// Main Game class
export class Game {
    constructor(engine) {
        this.engine = engine;

        // Draw static cards at game start
        this.planet = pickRandom(planetDeck);
        this.artifact = pickRandom(artifactDeck);
        this.natives = pickRandom(nativesDeck);

        // Player 1 (bottom)
        this.p1Deck = new Deck(0, 0, true);
        this.p1Graveyard = new Graveyard(0, 0, true);
        this.p1Gates = [new Gate(0, 0, true)];
        this.p1Orbit = [];
        this.p1Planet = [];

        // Player 2 (top)
        this.p2Deck = new Deck(0, 0, false);
        this.p2Graveyard = new Graveyard(0, 0, false);
        this.p2Gates = [new Gate(0, 0, false)];
        this.p2Orbit = [];
        this.p2Planet = [];

        // Display cards
        this.planetCard = new DisplayCard(0, 0, this.planet, 'PLANET');
        this.artifactCard = new DisplayCard(0, 0, this.artifact, 'ARTIFACT');
        this.nativesCard = new DisplayCard(0, 0, this.natives, 'NATIVES');

        // Game state
        this.turn = 1;
        this.isPlayer1Turn = true;
        this.gateActionUsed = false;
        this.gameOver = false;
        this.winner = null;

        this.message = '';
        this.messageTimer = 0;

        // Board dimensions (calculated in update)
        this.boardX = 0;
        this.boardY = 0;
        this.boardW = 0;
        this.boardH = 0;
        this.midY = 0;
    }

    showMessage(msg, duration = 2) {
        this.message = msg;
        this.messageTimer = duration;
    }

    // Get current player's gates
    get currentGates() {
        return this.isPlayer1Turn ? this.p1Gates : this.p2Gates;
    }

    // Add a new gate for current player
    addGate() {
        if (this.gateActionUsed) {
            this.showMessage('Already used gate action!');
            return false;
        }
        const gates = this.currentGates;
        const newGate = new Gate(0, 0, this.isPlayer1Turn);
        gates.push(newGate);
        this.gateActionUsed = true;
        this.showMessage('New gate added!');
        this._layoutGates();
        return true;
    }

    // Increment a gate
    incrementGate(gate) {
        if (this.gateActionUsed) {
            this.showMessage('Already used gate action!');
            return false;
        }
        gate.increment();
        this.gateActionUsed = true;
        this.showMessage(`Gate upgraded to ${gate.power}!`);
        return true;
    }

    endTurn() {
        this.isPlayer1Turn = !this.isPlayer1Turn;
        this.gateActionUsed = false;
        this.turn++;
        this.showMessage(this.isPlayer1Turn ? "Player 1's turn" : "Player 2's turn");
    }

    _layoutGates() {
        // Layout P1 gates
        const p1GateY = this.boardY + this.boardH - 50;
        const p1Count = this.p1Gates.length;
        const p1Spacing = Math.min(80, (this.boardW / 2 - 60) / Math.max(p1Count, 1));
        const p1StartX = this.boardX + this.boardW / 4 - (p1Count - 1) * p1Spacing / 2;
        this.p1Gates.forEach((gate, i) => {
            gate.targetX = p1StartX + i * p1Spacing;
            gate.targetY = p1GateY;
        });

        // Layout P2 gates
        const p2GateY = this.boardY + 50;
        const p2Count = this.p2Gates.length;
        const p2Spacing = Math.min(80, (this.boardW / 2 - 60) / Math.max(p2Count, 1));
        const p2StartX = this.boardX + this.boardW * 3 / 4 - (p2Count - 1) * p2Spacing / 2;
        this.p2Gates.forEach((gate, i) => {
            gate.targetX = p2StartX + i * p2Spacing;
            gate.targetY = p2GateY;
        });
    }

    update(dt, engine) {
        if (this.messageTimer > 0) this.messageTimer -= dt;

        // Calculate board dimensions
        const margin = 20;
        const sideWidth = 120;
        this.boardX = margin;
        this.boardY = margin;
        this.boardW = engine.width - margin * 2 - sideWidth;
        this.boardH = engine.height - margin * 2;
        this.midY = this.boardY + this.boardH / 2;

        // Update positions
        this.p1Deck.x = this.boardX + this.boardW + 60;
        this.p1Deck.y = engine.height - 80;
        this.p1Graveyard.x = this.boardX + this.boardW + 60;
        this.p1Graveyard.y = engine.height - 180;

        this.p2Deck.x = this.boardX + this.boardW + 60;
        this.p2Deck.y = 80;
        this.p2Graveyard.x = this.boardX + this.boardW + 60;
        this.p2Graveyard.y = 180;

        // Display cards on the right side
        const sideX = this.boardX + this.boardW + 60;
        this.planetCard.x = sideX;
        this.planetCard.y = this.midY - 130;
        this.artifactCard.x = sideX;
        this.artifactCard.y = this.midY;
        this.nativesCard.x = sideX;
        this.nativesCard.y = this.midY + 130;

        // Layout gates
        this._layoutGates();

        // Update all objects
        this.p1Deck.update(dt, engine);
        this.p2Deck.update(dt, engine);
        this.p1Gates.forEach(g => g.update(dt, engine));
        this.p2Gates.forEach(g => g.update(dt, engine));
        this.planetCard.update(dt, engine);
        this.artifactCard.update(dt, engine);
        this.nativesCard.update(dt, engine);

        // Handle clicks
        if (engine.mouse.clicked) {
            // Check gate clicks for current player
            const gates = this.currentGates;
            for (const gate of gates) {
                if (gate.hovered) {
                    this.incrementGate(gate);
                    return;
                }
            }
        }
    }

    renderBoard(ctx, engine) {
        const { boardX, boardY, boardW, boardH, midY } = this;

        // Board background
        ctx.fillStyle = '#0a0a15';
        Draw.roundRect(ctx, boardX, boardY, boardW, boardH, 12);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dividing line
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(boardX, midY);
        ctx.lineTo(boardX + boardW, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone heights
        const zoneH = boardH / 2 / 3;

        // Player 1 zones (bottom half) - Gate at bottom, Planet at middle
        this._renderZone(ctx, 'GATE', boardX, midY + zoneH * 2, boardW / 2, zoneH, '#4ecdc4', 0.15);
        this._renderZone(ctx, 'ORBIT', boardX, midY + zoneH, boardW / 2, zoneH, '#60a5fa', 0.1);
        this._renderZone(ctx, 'PLANET', boardX, midY, boardW / 2, zoneH, '#fbbf24', 0.1);

        // Player 2 zones (top half) - Gate at top, Planet at middle
        this._renderZone(ctx, 'GATE', boardX + boardW / 2, boardY, boardW / 2, zoneH, '#ef4444', 0.15);
        this._renderZone(ctx, 'ORBIT', boardX + boardW / 2, boardY + zoneH, boardW / 2, zoneH, '#f97316', 0.1);
        this._renderZone(ctx, 'PLANET', boardX + boardW / 2, boardY + zoneH * 2, boardW / 2, zoneH, '#fbbf24', 0.1);

        // Player labels
        ctx.font = '10px PixelFont, monospace';
        ctx.fillStyle = '#4ecdc4';
        ctx.textAlign = 'left';
        ctx.fillText('PLAYER 1', boardX + 10, boardY + boardH - 10);

        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'right';
        ctx.fillText('PLAYER 2', boardX + boardW - 10, boardY + 20);

        // Central planet indicator
        ctx.beginPath();
        ctx.arc(boardX + boardW / 2, midY, 30, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText('CONTESTED', boardX + boardW / 2, midY + 4);
    }

    _renderZone(ctx, label, x, y, w, h, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
        ctx.setLineDash([]);
        ctx.restore();

        ctx.font = '6px PixelFont, monospace';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 10, y + 15);
        ctx.globalAlpha = 1;
    }

    renderUI(ctx, engine) {
        // Render board
        this.renderBoard(ctx, engine);

        // Render decks and graveyards
        this.p1Deck.render(ctx);
        this.p2Deck.render(ctx);
        this.p1Graveyard.render(ctx);
        this.p2Graveyard.render(ctx);

        // Render display cards
        this.planetCard.render(ctx);
        this.artifactCard.render(ctx);
        this.nativesCard.render(ctx);

        // Render gates
        this.p1Gates.forEach(g => g.render(ctx));
        this.p2Gates.forEach(g => g.render(ctx));

        // Turn indicator
        ctx.font = '10px PixelFont, monospace';
        ctx.fillStyle = this.isPlayer1Turn ? '#4ecdc4' : '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.isPlayer1Turn ? "PLAYER 1'S TURN" : "PLAYER 2'S TURN",
            this.boardX + this.boardW / 2,
            this.boardY - 5
        );

        ctx.fillStyle = '#888';
        ctx.fillText(`Turn ${this.turn}`, this.boardX + this.boardW / 2, engine.height - 5);

        // Gate action hint
        if (!this.gateActionUsed) {
            ctx.font = '8px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('Click gate to upgrade, or press N for new gate', this.boardX + this.boardW / 2, engine.height - 18);
        }

        // Add Gate button
        const btnX = this.boardX + this.boardW - 80;
        const btnY = this.isPlayer1Turn ? engine.height - 50 : 50;
        const btnW = 70;
        const btnH = 25;
        const btnHover = engine.mouse.x >= btnX && engine.mouse.x <= btnX + btnW &&
                        engine.mouse.y >= btnY && engine.mouse.y <= btnY + btnH;

        if (!this.gateActionUsed) {
            Draw.roundRect(ctx, btnX, btnY, btnW, btnH, 4);
            ctx.fillStyle = btnHover ? '#4ecdc4' : '#2a5a5a';
            ctx.fill();
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = '7px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText('+GATE', btnX + btnW / 2, btnY + btnH / 2 + 3);

            if (engine.mouse.clicked && btnHover) {
                this.addGate();
            }
        }

        // End Turn button
        const endX = this.boardX + 10;
        const endY = this.isPlayer1Turn ? engine.height - 50 : 50;
        const endW = 80;
        const endH = 25;
        const endHover = engine.mouse.x >= endX && engine.mouse.x <= endX + endW &&
                        engine.mouse.y >= endY && engine.mouse.y <= endY + endH;

        Draw.roundRect(ctx, endX, endY, endW, endH, 4);
        ctx.fillStyle = endHover ? '#22c55e' : '#1a4a2e';
        ctx.fill();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('END TURN', endX + endW / 2, endY + endH / 2 + 3);

        if (engine.mouse.clicked && endHover) {
            this.endTurn();
        }

        // Message
        if (this.messageTimer > 0 && this.message) {
            ctx.globalAlpha = Math.min(1, this.messageTimer);
            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText(this.message, engine.width / 2, engine.height / 2);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }
}
