/**
 * Space Card Game - Board, Zones, Gates, and Game Logic
 */

import { Card, CARD_WIDTH, CARD_HEIGHT } from './card.js';
import { planetDeck, artifactDeck, nativesDeck, shuffle, pickRandom, loadTerranDeck, loadCrystalDeck, getDeckCards } from './data.js';
import { Draw } from './engine.js';

// Game version
const VERSION = '1.1.3';

// Deck class
export class Deck {
    constructor(x, y, isPlayer = true, cards = []) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;
        this.cards = [];
        this.zIndex = 0;
        this.hovered = false;

        // Use provided cards (shuffled)
        this.cards = shuffle([...cards]);
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
        const scale = 0.4;
        const w = CARD_WIDTH * scale, h = CARD_HEIGHT * scale;
        const halfW = w / 2, halfH = h / 2;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Stack visual for cards in graveyard
        if (this.count > 0) {
            const stackCount = Math.min(3, this.count);
            for (let i = stackCount - 1; i >= 0; i--) {
                ctx.save();
                ctx.translate(-i * 1.5, -i * 1.5);
                ctx.globalAlpha = 0.5;

                Draw.roundRect(ctx, -halfW, -halfH, w, h, 6);
                ctx.fillStyle = '#2a1a1a';
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.globalAlpha = this.count > 0 ? 0.9 : 0.4;

        // Main graveyard card
        Draw.roundRect(ctx, -halfW, -halfH, w, h, 6);
        const gradient = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
        gradient.addColorStop(0, '#2a1a2a');
        gradient.addColorStop(1, '#1a0a1a');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = this.isPlayer ? '#4ecdc4' : '#a855f7';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Skull/cross icon area
        ctx.font = '12px PixelFont, monospace';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('†', 0, -8);

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = '#777';
        ctx.fillText('GRAVE', 0, 6);

        // Count badge
        if (this.count > 0) {
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText(this.count.toString(), 0, 20);
        }

        ctx.restore();
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
}

// Gate class - can be incremented, acts as mana
export class Gate {
    constructor(x, y, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.isPlayer = isPlayer;
        this.power = 1;
        this.used = false; // Gates can only be used once per turn
        this.hovered = false;
        this.pulseTime = Math.random() * Math.PI * 2;
    }

    increment() {
        this.power++;
    }

    // Use this gate for warping (returns true if successful)
    use() {
        if (this.used) return false;
        this.used = true;
        return true;
    }

    // Reset at end of turn
    reset() {
        this.used = false;
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

    render(ctx, selectionMode = false, canAfford = false) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const pulse = this.used ? 1 : Math.sin(this.pulseTime) * 0.1 + 1;
        const size = 25 * pulse;

        // In selection mode: highlight valid gates, dim invalid ones
        if (selectionMode) {
            if (this.used || !canAfford) {
                ctx.globalAlpha = 0.25;
            } else {
                // Valid gate - pulsing highlight
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 15 + Math.sin(this.pulseTime * 3) * 5;
            }
        } else if (this.used) {
            ctx.globalAlpha = 0.4;
        }

        // Outer glow
        ctx.beginPath();
        ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
        if (selectionMode && !this.used && canAfford) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        } else {
            ctx.fillStyle = this.isPlayer ? 'rgba(78, 205, 196, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        }
        ctx.fill();

        // Gate ring
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        if (selectionMode && !this.used && canAfford) {
            gradient.addColorStop(0, '#0d3d26');
            gradient.addColorStop(1, '#22c55e');
        } else {
            gradient.addColorStop(0, this.isPlayer ? '#0d3d56' : '#3d1515');
            gradient.addColorStop(1, this.isPlayer ? '#4ecdc4' : '#ef4444');
        }
        ctx.fillStyle = gradient;
        ctx.fill();

        // Inner void
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = this.used ? '#222' : '#000';
        ctx.fill();

        // Power number
        ctx.font = '14px PixelFont, monospace';
        ctx.fillStyle = this.used ? '#666' : '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.power.toString(), 0, 2);

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Hover effect
        if (this.hovered && !this.used) {
            ctx.beginPath();
            ctx.arc(0, 0, size + 12, 0, Math.PI * 2);
            if (selectionMode && canAfford) {
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = this.isPlayer ? '#4ecdc4' : '#ef4444';
                ctx.lineWidth = 2;
            }
            ctx.stroke();
        }

        // "CLICK" indicator for valid gates in selection mode
        if (selectionMode && !this.used && canAfford) {
            ctx.font = '8px PixelFont, monospace';
            ctx.fillStyle = '#22c55e';
            ctx.textAlign = 'center';
            ctx.fillText('CLICK', 0, size + 20);
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

// Battlefield Card - cards that are in play on the board
// Full-size card dimensions (draw at full size, scale the transform)
const CARD_FULL_W = 200;
const CARD_FULL_H = 280;

export class BattlefieldCard {
    constructor(data, x, y, isPlayer1) {
        this.data = data;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.isPlayer1 = isPlayer1;
        this.baseScale = 0.18; // Small on battlefield
        this.hovered = false;
        this.hoverProgress = 0;
        this.zIndex = 0;
        this.baseZIndex = 0;

        // 3D tilt effect
        this.tiltX = 0;
        this.tiltY = 0;
        this.shineX = 0.5;
        this.shineY = 0.5;

        // Combat stats (MTG style - power/toughness)
        this.power = data.stats?.attack || 0;
        this.toughness = data.stats?.defense || 1;
        this.currentToughness = this.toughness;
        this.damage = 0;
        this.defenseBuffed = false; // Track if Defense Grid buff is active

        // State
        this.tapped = false;
        this.tapRotation = 0;
        this.summoningSickness = true;
        this.isAttackTarget = false;
        this.movedThisTurn = false;

        // Animation
        this.spawnTime = 0;
        this.spawnScale = 0;

        // Colors based on faction
        this.colors = isPlayer1 ? {
            border: '#4ecdc4',
            bg1: '#1a3a4a',
            bg2: '#0a1520',
            accent: '#66fff0'
        } : {
            border: '#a855f7',
            bg1: '#2a1a3a',
            bg2: '#150a1a',
            accent: '#c084fc'
        };
    }

    containsPoint(px, py) {
        const w = CARD_FULL_W * this.baseScale;
        const h = CARD_FULL_H * this.baseScale;
        return px >= this.x - w/2 && px <= this.x + w/2 &&
               py >= this.y - h/2 && py <= this.y + h/2;
    }

    update(dt, engine) {
        const wasHovered = this.hovered;
        this.hovered = this.containsPoint(engine.mouse.x, engine.mouse.y);

        // Smooth hover transition
        const targetHover = this.hovered ? 1 : 0;
        this.hoverProgress += (targetHover - this.hoverProgress) * 10 * dt;

        // Spawn animation
        this.spawnTime += dt;
        this.spawnScale += (1 - this.spawnScale) * 8 * dt;

        // 3D tilt based on mouse position
        if (this.hovered) {
            const currentScale = this.baseScale * (1 + this.hoverProgress * 2.0);
            const w = CARD_FULL_W * currentScale;
            const h = CARD_FULL_H * currentScale;
            const relX = (engine.mouse.x - this.x) / (w/2);
            const relY = (engine.mouse.y - this.y) / (h/2);
            this.tiltX += (relY * 12 - this.tiltX) * 8 * dt;
            this.tiltY += (-relX * 12 - this.tiltY) * 8 * dt;
            this.shineX = (relX + 1) / 2;
            this.shineY = (relY + 1) / 2;
        } else {
            this.tiltX *= 0.9;
            this.tiltY *= 0.9;
        }

        // Z-index management
        if (this.hovered && !wasHovered) {
            this.zIndex = 1000;
        } else if (!this.hovered && wasHovered) {
            this.zIndex = this.baseZIndex;
        }

        // Smooth movement
        this.x += (this.targetX - this.x) * 12 * dt;
        this.y += (this.targetY - this.y) * 12 * dt;

        // Tap rotation
        const targetTapRotation = this.tapped ? 90 : 0;
        this.tapRotation += (targetTapRotation - this.tapRotation) * 10 * dt;
    }

    render(ctx) {
        // Hover scale: expand to 500% (5x) on hover
        const hoverScale = 1 + this.hoverProgress * 4.0;
        const finalScale = this.baseScale * hoverScale * this.spawnScale;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Lift when hovered
        const lift = this.hoverProgress * 40;
        ctx.translate(0, -lift);

        // Apply scale transform FIRST - this scales the entire card as a unit
        ctx.scale(finalScale, finalScale);

        // Tap rotation
        if (this.tapRotation > 0.1) {
            ctx.rotate(this.tapRotation * Math.PI / 180);
        }

        // 3D tilt effect (skew transform)
        const skewX = this.tiltY * 0.008;
        const skewY = this.tiltX * 0.008;
        ctx.transform(1, skewY, skewX, 1, 0, 0);

        // Now draw at FULL SIZE - the scale transform handles sizing
        const halfW = CARD_FULL_W / 2;
        const halfH = CARD_FULL_H / 2;

        // Shadow (scaled with card)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15 + this.hoverProgress * 25;
        ctx.shadowOffsetY = 8 + this.hoverProgress * 12;

        // Card background gradient
        const gradient = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
        gradient.addColorStop(0, this.colors.bg1);
        gradient.addColorStop(1, this.colors.bg2);
        Draw.roundRect(ctx, -halfW, -halfH, CARD_FULL_W, CARD_FULL_H, 12);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Border
        ctx.strokeStyle = this.colors.border;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner border
        ctx.strokeStyle = this.colors.accent;
        ctx.lineWidth = 1;
        Draw.roundRect(ctx, -halfW + 6, -halfH + 6, CARD_FULL_W - 12, CARD_FULL_H - 12, 8);
        ctx.stroke();

        // Render card content at full size
        this._renderContent(ctx);

        // Holographic shine effect when hovered
        if (this.hoverProgress > 0.1) {
            this._renderShine(ctx, -halfW, -halfH, CARD_FULL_W, CARD_FULL_H);
        }

        // Tapped overlay
        if (this.tapped) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#000';
            Draw.roundRect(ctx, -halfW, -halfH, CARD_FULL_W, CARD_FULL_H, 12);
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.font = '24px PixelFont, monospace';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('TAPPED', 0, 0);
        }

        // Summoning sickness indicator
        if (this.summoningSickness) {
            ctx.globalAlpha = 0.8;
            ctx.font = '14px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.fillText('SUMMONING SICKNESS', 0, -halfH - 12);
            ctx.globalAlpha = 1;
        }

        // Attack target indicator (red glow)
        if (this.isAttackTarget) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 20;
            Draw.roundRect(ctx, -halfW - 4, -halfH - 4, CARD_FULL_W + 8, CARD_FULL_H + 8, 14);
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center';
            ctx.fillText('TARGET', 0, halfH + 20);
        }

        // Selected attacker indicator (yellow glow)
        if (this.isSelectedAttacker) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 20;
            Draw.roundRect(ctx, -halfW - 4, -halfH - 4, CARD_FULL_W + 8, CARD_FULL_H + 8, 14);
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.fillText('ATTACKING', 0, halfH + 20);
        }

        // Generator indicator
        if (this.isGenerator) {
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#a855f7';
            ctx.textAlign = 'center';
            if (this.garrisonedUnits && this.garrisonedUnits.length > 0) {
                ctx.fillText(`GARRISONED: ${this.garrisonedUnits.length}`, 0, -halfH - 25);
            }
        }

        // Dropship landing indicator
        const isDropshipType = (this.data.type || '').toLowerCase().includes('dropship');
        if (isDropshipType && !this.summoningSickness && !this.tapped) {
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#22c55e';
            ctx.textAlign = 'center';
            ctx.fillText('CLICK TO LAND', 0, halfH + 20);
        }

        // Carrier deploy indicator
        const isCarrierType = (this.data.name || '').toLowerCase().includes('carrier') &&
                             ((this.data.ability || '').toLowerCase().includes('deploy') ||
                              (this.data.ability || '').toLowerCase().includes('scout'));
        if (isCarrierType && !this.summoningSickness && !this.tapped && !this.deployedThisTurn) {
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#60a5fa';
            ctx.textAlign = 'center';
            ctx.fillText('CLICK TO DEPLOY', 0, halfH + 20);
        }

        // Survey Team artifact discovery indicator
        const isSurveyType = (this.data.name || '').toLowerCase().includes('survey team');
        if (isSurveyType && !this.summoningSickness && !this.tapped) {
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#a855f7';
            ctx.textAlign = 'center';
            ctx.fillText('CLICK TO SURVEY', 0, halfH + 20);
        }

        // Planetary Consciousness indicator
        const isConsciousness = (this.data.name || '').toLowerCase().includes('planetary consciousness');
        if (isConsciousness && !this.summoningSickness && !this.tapped) {
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#ec4899';
            ctx.textAlign = 'center';
            ctx.fillText('TAP FOR VICTORY', 0, halfH + 20);
        }

        // Quantum Sensor indicator
        const isQuantumSensor = (this.data.name || '').toLowerCase().includes('quantum sensor');
        if (isQuantumSensor && !this.summoningSickness && !this.tapped) {
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#06b6d4';
            ctx.textAlign = 'center';
            ctx.fillText('TAP TO DRAW', 0, halfH + 20);
        }

        ctx.restore();
    }

    _renderContent(ctx) {
        const halfW = CARD_FULL_W / 2;
        const halfH = CARD_FULL_H / 2;
        const padding = 8;

        // Type color bar at top
        const typeColor = this._getTypeColor();
        ctx.fillStyle = typeColor;
        ctx.fillRect(-halfW + padding, -halfH + padding, CARD_FULL_W - padding*2, 28);

        // Cost orb (top left, overlapping type bar)
        if (this.data.cost !== undefined) {
            const orbR = 18;
            const orbX = -halfW + padding + orbR + 4;
            const orbY = -halfH + padding + 14;

            const orbGrad = ctx.createRadialGradient(orbX - 3, orbY - 3, 0, orbX, orbY, orbR);
            orbGrad.addColorStop(0, '#ffeb3b');
            orbGrad.addColorStop(1, '#f9a825');

            ctx.beginPath();
            ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
            ctx.fillStyle = orbGrad;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = '16px PixelFont, monospace';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.data.cost.toString(), orbX, orbY + 1);
        }

        // Type text on type bar
        ctx.font = '12px PixelFont, monospace';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const typeStr = (this.data.type || '').replace(/_/g, ' ').toUpperCase();
        ctx.fillText(typeStr.substring(0, 16), 12, -halfH + padding + 14);

        // Card name
        ctx.font = '14px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        let name = this.data.name;
        if (name.length > 20) name = name.substring(0, 18) + '..';
        ctx.fillText(name, 0, -halfH + 50);

        // Art box placeholder
        const artY = -halfH + 62;
        const artH = 80;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(-halfW + padding, artY, CARD_FULL_W - padding*2, artH);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(-halfW + padding, artY, CARD_FULL_W - padding*2, artH);

        // Art description (placeholder)
        if (this.data.art) {
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            const artDesc = this.data.art.length > 25 ? this.data.art.substring(0, 23) + '..' : this.data.art;
            ctx.fillText(artDesc, 0, artY + artH/2);
        }

        // Stats box if present
        if (this.data.stats) {
            const statsY = artY + artH + 8;
            const statsH = 24;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-halfW + padding, statsY, CARD_FULL_W - padding*2, statsH);
            ctx.strokeStyle = this.colors.accent + '44';
            ctx.lineWidth = 1;
            ctx.strokeRect(-halfW + padding, statsY, CARD_FULL_W - padding*2, statsH);

            ctx.font = '11px PixelFont, monospace';
            ctx.fillStyle = this.colors.accent;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let statsArr = [];
            if (this.data.stats.attack !== undefined) statsArr.push(`ATK:${this.data.stats.attack}`);
            if (this.data.stats.defense !== undefined) statsArr.push(`DEF:${this.data.stats.defense}`);
            if (this.data.stats.speed !== undefined) statsArr.push(`SPD:${this.data.stats.speed}`);
            ctx.fillText(statsArr.join('  '), 0, statsY + statsH/2);
        }

        // Ability text box
        const abilityY = this.data.stats ? -halfH + 178 : -halfH + 150;
        const abilityH = 70;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-halfW + padding, abilityY, CARD_FULL_W - padding*2, abilityH);

        if (this.data.ability) {
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#ccc';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            const maxWidth = CARD_FULL_W - padding * 2 - 10;
            const words = this.data.ability.split(' ');
            let lines = [];
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);

            lines.slice(0, 5).forEach((line, i) => {
                ctx.fillText(line, -halfW + padding + 5, abilityY + 6 + i * 13);
            });
        }

        // Power/Toughness badge (bottom right corner, MTG style)
        if (this.power !== undefined && this.toughness !== undefined) {
            const ptW = 50;
            const ptH = 28;
            const ptX = halfW - ptW - padding;
            const ptY = halfH - ptH - padding;

            const ptGrad = ctx.createLinearGradient(ptX, ptY, ptX + ptW, ptY + ptH);
            ptGrad.addColorStop(0, this.colors.bg1);
            ptGrad.addColorStop(1, '#0a0a15');

            Draw.roundRect(ctx, ptX, ptY, ptW, ptH, 6);
            ctx.fillStyle = ptGrad;
            ctx.fill();
            ctx.strokeStyle = this.colors.border;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = '16px PixelFont, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const toughnessDisplay = this.currentToughness - this.damage;

            // Power text
            const powerColor = '#fff';
            const toughnessColor = this.damage > 0 ? '#ef4444' : (this.defenseBuffed ? '#22c55e' : '#fff');

            // Draw power and toughness with separate colors
            ctx.fillStyle = powerColor;
            const powerText = `${this.power}/`;
            const powerWidth = ctx.measureText(powerText).width;
            const toughnessText = `${toughnessDisplay}`;
            const totalWidth = ctx.measureText(`${this.power}/${toughnessDisplay}`).width;
            const startX = ptX + ptW/2 - totalWidth/2;

            ctx.textAlign = 'left';
            ctx.fillText(powerText, startX, ptY + ptH/2 + 1);
            ctx.fillStyle = toughnessColor;
            ctx.fillText(toughnessText, startX + powerWidth, ptY + ptH/2 + 1);
        }
    }

    _renderShine(ctx, x, y, w, h) {
        ctx.save();

        // Clip to card shape
        Draw.roundRect(ctx, x, y, w, h, 12);
        ctx.clip();

        // Rainbow holographic gradient
        const time = performance.now() / 1000;
        const rainbow = ctx.createLinearGradient(
            x + w * this.shineX - 60,
            y + h * this.shineY - 60,
            x + w * this.shineX + 60,
            y + h * this.shineY + 60
        );

        const hue = (time * 60) % 360;
        rainbow.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.4)`);
        rainbow.addColorStop(0.5, `hsla(${hue + 120}, 100%, 70%, 0.4)`);
        rainbow.addColorStop(1, `hsla(${hue + 240}, 100%, 70%, 0.4)`);

        ctx.globalCompositeOperation = 'color-dodge';
        ctx.globalAlpha = this.hoverProgress * 0.5;
        ctx.fillStyle = rainbow;
        ctx.fillRect(x, y, w, h);

        // Shine highlight
        const shineGrad = ctx.createRadialGradient(
            x + w * this.shineX, y + h * this.shineY, 0,
            x + w * this.shineX, y + h * this.shineY, 80
        );
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = this.hoverProgress * 0.4;
        ctx.fillStyle = shineGrad;
        ctx.fillRect(x, y, w, h);

        ctx.restore();
    }

    _getTypeColor() {
        const type = this.data.type || '';
        if (type.includes('capital')) return '#ef4444';
        if (type.includes('scout') || type.includes('support') || type.includes('science')) return '#60a5fa';
        if (type.includes('mining')) return '#fbbf24';
        if (type.includes('station')) return '#a855f7';
        if (type.includes('surface')) return '#22c55e';
        if (type.includes('structure')) return '#fbbf24';
        if (type.includes('event')) return '#f97316';
        if (type.includes('equipment') || type.includes('upgrade') || type.includes('weapon')) return '#06b6d4';
        if (type.includes('artifact')) return '#ec4899';
        return '#888';
    }

    tap() { this.tapped = true; }
    untap() { this.tapped = false; }
    dealDamage(amount) {
        this.damage += amount;
        return this.damage >= this.currentToughness;
    }
    heal(amount) { this.damage = Math.max(0, this.damage - amount); }
    removeSummoningSickness() { this.summoningSickness = false; }
}

// Event Animation - for cards that trigger and go to graveyard
export class EventAnimation {
    constructor(data, startX, startY, targetX, targetY, isPlayer1, onComplete) {
        this.data = data;
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.centerX = 0; // Will be set externally
        this.centerY = 0; // Will be set externally
        this.targetX = targetX;
        this.targetY = targetY;
        this.isPlayer1 = isPlayer1;
        this.onComplete = onComplete;

        this.phase = 'expand'; // expand -> display -> shrink -> move -> done
        this.phaseTime = 0;
        this.scale = 0;
        this.alpha = 1;
        this.rotation = 0;
        this.complete = false;

        // Timing
        this.expandDuration = 0.3;
        this.displayDuration = 1.2;
        this.shrinkDuration = 0.2;
        this.moveDuration = 0.4;

        this.colors = isPlayer1 ? {
            border: '#4ecdc4',
            bg1: '#1a3a4a',
            accent: '#66fff0',
            glow: 'rgba(78, 205, 196, 0.6)'
        } : {
            border: '#a855f7',
            bg1: '#2a1a3a',
            accent: '#c084fc',
            glow: 'rgba(168, 85, 247, 0.6)'
        };
    }

    setCenter(x, y) {
        this.centerX = x;
        this.centerY = y;
    }

    update(dt) {
        this.phaseTime += dt;

        switch (this.phase) {
            case 'expand':
                // Move to center while expanding
                const expandProgress = Math.min(1, this.phaseTime / this.expandDuration);
                const expandEased = 1 - Math.pow(1 - expandProgress, 2);
                this.x = this.startX + (this.centerX - this.startX) * expandEased;
                this.y = this.startY + (this.centerY - this.startY) * expandEased;
                this.scale = expandProgress;

                if (this.phaseTime >= this.expandDuration) {
                    this.phase = 'display';
                    this.phaseTime = 0;
                    this.scale = 1;
                    this.x = this.centerX;
                    this.y = this.centerY;
                }
                break;

            case 'display':
                this.scale = 1 + Math.sin(this.phaseTime * 4) * 0.03; // Subtle pulse
                // Stay at center
                this.x = this.centerX;
                this.y = this.centerY;
                if (this.phaseTime >= this.displayDuration) {
                    this.phase = 'shrink';
                    this.phaseTime = 0;
                }
                break;

            case 'shrink':
                this.scale = 1 - (this.phaseTime / this.shrinkDuration) * 0.5;
                if (this.phaseTime >= this.shrinkDuration) {
                    this.phase = 'move';
                    this.phaseTime = 0;
                    // Set up for move to graveyard
                    this.startX = this.centerX;
                    this.startY = this.centerY;
                }
                break;

            case 'move':
                const progress = Math.min(1, this.phaseTime / this.moveDuration);
                const eased = 1 - Math.pow(1 - progress, 3); // Ease out
                this.x = this.startX + (this.targetX - this.startX) * eased;
                this.y = this.startY + (this.targetY - this.startY) * eased;
                this.scale = 0.5 - progress * 0.3;
                this.alpha = 1 - progress * 0.5;
                this.rotation = progress * 0.3;
                if (this.phaseTime >= this.moveDuration) {
                    this.complete = true;
                    if (this.onComplete) this.onComplete();
                }
                break;
        }
    }

    render(ctx) {
        if (this.complete) return;

        const cardW = 180 * this.scale;
        const cardH = 250 * this.scale;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;

        // Glow effect during display phase
        if (this.phase === 'display' || this.phase === 'expand') {
            ctx.shadowColor = this.colors.glow;
            ctx.shadowBlur = 30 + Math.sin(this.phaseTime * 6) * 10;
        }

        // Card background
        const gradient = ctx.createLinearGradient(-cardW/2, -cardH/2, cardW/2, cardH/2);
        gradient.addColorStop(0, this.colors.bg1);
        gradient.addColorStop(1, '#050508');
        Draw.roundRect(ctx, -cardW/2, -cardH/2, cardW, cardH, 10 * this.scale);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = this.colors.border;
        ctx.lineWidth = 3 * this.scale;
        ctx.stroke();

        // Type bar (event color - orange)
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-cardW/2 + 6 * this.scale, -cardH/2 + 6 * this.scale, cardW - 12 * this.scale, 24 * this.scale);

        // Cost orb
        if (this.data.cost !== undefined) {
            const orbR = 14 * this.scale;
            const orbX = -cardW/2 + 20 * this.scale;
            const orbY = -cardH/2 + 18 * this.scale;

            const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
            orbGrad.addColorStop(0, '#fde047');
            orbGrad.addColorStop(1, '#ca8a04');

            ctx.beginPath();
            ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
            ctx.fillStyle = orbGrad;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2 * this.scale;
            ctx.stroke();

            ctx.font = `${12 * this.scale}px PixelFont, monospace`;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.data.cost.toString(), orbX, orbY);
        }

        // Type text
        ctx.font = `${8 * this.scale}px PixelFont, monospace`;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EVENT', 10 * this.scale, -cardH/2 + 18 * this.scale);

        // Name
        ctx.font = `${12 * this.scale}px PixelFont, monospace`;
        ctx.fillStyle = '#fff';
        ctx.fillText(this.data.name, 0, -cardH/2 + 45 * this.scale);

        // "RESOLVING" text during display
        if (this.phase === 'display') {
            ctx.font = `${10 * this.scale}px PixelFont, monospace`;
            ctx.fillStyle = '#f97316';
            ctx.fillText('★ RESOLVING ★', 0, -cardH/2 + 70 * this.scale);
        }

        // Ability text
        if (this.data.ability) {
            ctx.font = `${7 * this.scale}px PixelFont, monospace`;
            ctx.fillStyle = '#ccc';
            ctx.textAlign = 'center';

            const words = this.data.ability.split(' ');
            const maxWidth = cardW - 30 * this.scale;
            let lines = [];
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);

            const startY = -cardH/2 + 90 * this.scale;
            lines.slice(0, 5).forEach((line, i) => {
                ctx.fillText(line, 0, startY + i * 14 * this.scale);
            });
        }

        ctx.restore();
    }
}

// Main Game class
export class Game {
    constructor(engine) {
        this.engine = engine;
        this.initialized = false;

        // Draw static cards at game start
        this.planet = pickRandom(planetDeck);
        this.artifact = pickRandom(artifactDeck);
        this.natives = pickRandom(nativesDeck);

        // Player 1 (bottom) - Terran
        this.p1Deck = new Deck(0, 0, true, []);
        this.p1Graveyard = new Graveyard(0, 0, true);
        this.p1Gates = [new Gate(0, 0, true)];
        this.p1Orbit = [];
        this.p1Planet = [];
        this.p1Hand = [];
        this.p1Faction = 'terran';

        // Player 2 (top) - Crystal
        this.p2Deck = new Deck(0, 0, false, []);
        this.p2Graveyard = new Graveyard(0, 0, false);
        this.p2Gates = [new Gate(0, 0, false)];
        this.p2Orbit = [];
        this.p2Planet = [];
        this.p2Hand = [];
        this.p2Faction = 'crystal';

        // Hovered card for preview (hand cards)
        this.hoveredCard = null;
        this.hoveredCardPos = { x: 0, y: 0 };

        // Hovered battlefield card
        this.hoveredBattlefieldCard = null;

        // Active event animations
        this.eventAnimations = [];

        // Gate selection mode - for choosing which gate to use
        this.selectingGate = false;
        this.selectedCardIndex = -1;
        this.selectedCardIsPlayer1 = true;

        // Equipment targeting mode
        this.equipmentCard = null;
        this.equipmentIsPlayer1 = true;

        // Garrison mode - for garrisoning units to generator
        this.garrisonUnit = null;

        // Planetary Shield Generator (spawned by Survey Team)
        this.planetaryGenerator = null;

        // MTG-style combat stack
        this.combatAttackers = [];
        this.combatTarget = null;
        this.inCombatSelection = false;

        // Research points system
        this.p1Research = 0;
        this.p2Research = 0;

        // Energy resource system
        this.p1Energy = 0;
        this.p2Energy = 0;
        this.p1MaxEnergy = 0;
        this.p2MaxEnergy = 0;

        // Event targeting mode
        this.eventCard = null;
        this.eventIsPlayer1 = true;

        // Enlarged card view (click to inspect)
        this.enlargedCard = null;

        // Graveyard view state
        this.viewingGraveyard = null; // null or 'p1' or 'p2'

        // Drag-to-move state (battlefield cards)
        this.draggingCard = null;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Hand card drag-to-play state
        this.draggingHandCard = null;
        this.draggingHandCardIndex = -1;
        this.draggingHandCardIsPlayer1 = true;
        this.handCardDragX = 0;
        this.handCardDragY = 0;

        // Hand hover state (for pop-out effect)
        this.hoveredHandIndex = -1;
        this.lastHoveredHandIndex = -1;
        this.lastHoveredTime = 0;

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

        // Load faction decks
        this._loadDecks();
    }

    async _loadDecks() {
        try {
            const [terranDeck, crystalDeck] = await Promise.all([
                loadTerranDeck(),
                loadCrystalDeck()
            ]);

            // P1 gets Terran deck
            this.p1Deck.cards = shuffle(getDeckCards(terranDeck));
            this.p1Faction = terranDeck.faction;

            // P2 gets Crystal deck
            this.p2Deck.cards = shuffle(getDeckCards(crystalDeck));
            this.p2Faction = crystalDeck.faction;

            // Draw initial hands (7 cards each)
            for (let i = 0; i < 7; i++) {
                this.drawCard(true);
                this.drawCard(false);
            }

            this.initialized = true;
            this.showMessage('Decks loaded! Game ready.');
        } catch (error) {
            console.error('Failed to load decks:', error);
            this.showMessage('Error loading decks!');
        }
    }

    // Draw a card from deck to hand
    drawCard(isPlayer1) {
        const deck = isPlayer1 ? this.p1Deck : this.p2Deck;
        const hand = isPlayer1 ? this.p1Hand : this.p2Hand;
        const card = deck.draw();
        if (card) {
            hand.push(card);
            return card;
        }
        return null;
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
        // Remove summoning sickness from current player's cards (they've been out a full turn)
        const currentOrbit = this.isPlayer1Turn ? this.p1Orbit : this.p2Orbit;
        const currentPlanet = this.isPlayer1Turn ? this.p1Planet : this.p2Planet;
        currentOrbit.forEach(c => c.removeSummoningSickness());
        currentPlanet.forEach(c => c.removeSummoningSickness());

        // Cancel combat selection mode
        if (this.combatAttackers.length > 0) {
            this.cancelCombatSelection();
        }

        // Reset per-turn flags before switching
        this.resetTurnFlags();
        this.resetMovementFlags();

        this.isPlayer1Turn = !this.isPlayer1Turn;
        this.gateActionUsed = false;
        this.turn++;

        // Regenerate defense for all cards at end of turn
        this.regenerateDefense();

        // Apply Crystal Monolith growth at start of each turn
        this.applyMonolithGrowth();

        // Generate energy for the new active player
        this.generateEnergy(this.isPlayer1Turn);

        // Reset actions for the new active player
        this.resetActions(this.isPlayer1Turn);

        // Reset all gates for the new active player
        const gates = this.isPlayer1Turn ? this.p1Gates : this.p2Gates;
        gates.forEach(g => g.reset());

        // Untap all cards for the new active player
        const newOrbit = this.isPlayer1Turn ? this.p1Orbit : this.p2Orbit;
        const newPlanet = this.isPlayer1Turn ? this.p1Planet : this.p2Planet;
        newOrbit.forEach(c => c.untap());
        newPlanet.forEach(c => c.untap());

        // Draw a card for the new active player
        const drawnCard = this.drawCard(this.isPlayer1Turn);
        if (drawnCard) {
            this.showMessage(this.isPlayer1Turn ? "Player 1's turn - Drew a card!" : "Player 2's turn - Drew a card!");
        } else {
            this.showMessage(this.isPlayer1Turn ? "Player 1's turn" : "Player 2's turn");
        }

        // Run AI turn if it's player 2's turn
        if (!this.isPlayer1Turn) {
            this._runAITurn();
        }
    }

    // AI Turn - simple opponent AI
    _runAITurn() {
        // Use setTimeout to create a delay for visual feedback
        setTimeout(() => this._aiGateAction(), 500);
    }

    _aiGateAction() {
        // Gate action: 50% chance to add new gate, 50% to upgrade existing
        if (!this.gateActionUsed) {
            if (this.p2Gates.length < 3 && Math.random() < 0.5) {
                this.addGate();
            } else if (this.p2Gates.length > 0) {
                // Upgrade the smallest gate
                const smallestGate = this.p2Gates.reduce((min, g) => g.power < min.power ? g : min);
                this.incrementGate(smallestGate);
            } else {
                this.addGate();
            }
        }

        // Play cards after a delay
        setTimeout(() => this._aiPlayCards(), 600);
    }

    _aiPlayCards() {
        // Try to play cards from hand
        const hand = this.p2Hand;
        const gates = this.p2Gates.filter(g => !g.used).sort((a, b) => a.power - b.power);

        // Try to play each card in hand if we have a gate for it
        for (let i = hand.length - 1; i >= 0 && gates.length > 0; i--) {
            const card = hand[i];
            const cost = card.cost || 0;

            // Find a suitable gate (smallest one that can afford it)
            const gateIdx = gates.findIndex(g => g.power >= cost);
            if (gateIdx !== -1) {
                const gate = gates[gateIdx];
                this.playCard(i, false, gate);
                gates.splice(gateIdx, 1); // Remove used gate from consideration
            }
        }

        // Land dropships and attack after a delay
        setTimeout(() => this._aiLandAndAttack(), 600);
    }

    _aiLandAndAttack() {
        // Deploy tokens from carriers
        for (const card of this.p2Orbit) {
            if (this.canDeployToken(card)) {
                this.deployTokens(card, false);
            }
        }

        // Land any ready dropships
        for (let i = this.p2Orbit.length - 1; i >= 0; i--) {
            const card = this.p2Orbit[i];
            if (this.isDropship(card) && !card.summoningSickness && !card.tapped) {
                this.landDropship(card, false);
            }
        }

        // Move ground units from orbit to planet surface
        for (let i = this.p2Orbit.length - 1; i >= 0; i--) {
            const card = this.p2Orbit[i];
            if (this.isGroundUnit(card) && !card.summoningSickness && !card.tapped && !card.movedThisTurn) {
                this.moveToPlanet(card);
            }
        }

        // Survey with Survey Teams after a delay
        setTimeout(() => this._aiSurvey(), 500);
    }

    _aiSurvey() {
        // Use Survey Teams to survey
        for (const card of this.p2Planet) {
            if (this.isSurveyTeam(card) && !card.tapped && !card.summoningSickness) {
                this.attemptArtifactDiscovery(card, false);
            }
        }

        // Attack after a delay
        setTimeout(() => this._aiAttack(), 500);
    }

    _aiAttack() {
        // Get ready offensive ground units
        let myGroundUnits = this.p2Planet.filter(u =>
            !u.tapped && !u.summoningSickness && u.power > 0 && this.isOffensiveUnit(u)
        );

        // Check if AI can seize the Planetary Generator
        if (this.planetaryGenerator && this.planetaryGenerator.isPlayer1) {
            const generatorHP = this.planetaryGenerator.currentToughness - this.planetaryGenerator.damage;
            const totalAIPower = myGroundUnits.reduce((sum, u) => sum + u.power, 0);

            if (totalAIPower >= generatorHP) {
                // AI has enough power to seize the generator - attack it!
                this.showMessage('AI forces assault the Planetary Generator!');

                for (const attacker of myGroundUnits) {
                    if (this.planetaryGenerator.isPlayer1) { // Check still enemy-owned
                        this.performCombatWithAbilities(attacker, this.planetaryGenerator);
                        attacker.tap();
                    }
                }

                // Refresh ground units list after attacking generator
                myGroundUnits = this.p2Planet.filter(u =>
                    !u.tapped && !u.summoningSickness && u.power > 0 && this.isOffensiveUnit(u)
                );
            }
        }

        // Get attackable enemy ground units (excluding artifacts and generator)
        const enemyGroundUnits = this.p1Planet.filter(u =>
            !this.isArtifact(u) && u !== this.planetaryGenerator
        );

        for (const attacker of myGroundUnits) {
            if (enemyGroundUnits.length > 0) {
                // Attack the weakest enemy unit
                const weakest = enemyGroundUnits.reduce((min, u) => {
                    const minHP = min.currentToughness - min.damage;
                    const uHP = u.currentToughness - u.damage;
                    return uHP < minHP ? u : min;
                });
                this.performCombatWithAbilities(attacker, weakest);
                attacker.tap();
            }
        }

        // Attack with OFFENSIVE orbital units only
        const myOrbitUnits = this.p2Orbit.filter(u =>
            !u.tapped && !u.summoningSickness && u.power > 0 && this.isOffensiveUnit(u)
        );
        // Get attackable enemy orbital units (excluding artifacts)
        const enemyOrbitUnits = this.p1Orbit.filter(u => !this.isArtifact(u));

        for (const attacker of myOrbitUnits) {
            if (enemyOrbitUnits.length > 0) {
                // Attack the weakest enemy orbital unit
                const weakest = enemyOrbitUnits.reduce((min, u) => {
                    const minHP = min.currentToughness - min.damage;
                    const uHP = u.currentToughness - u.damage;
                    return uHP < minHP ? u : min;
                });
                this.performCombatWithAbilities(attacker, weakest);
                attacker.tap();
            } else if (this.hasOrbitalStrike(attacker) && enemyGroundUnits.length > 0) {
                // Use orbital strike on ground units
                const weakest = enemyGroundUnits.reduce((min, u) => {
                    const minHP = min.currentToughness - min.damage;
                    const uHP = u.currentToughness - u.damage;
                    return uHP < minHP ? u : min;
                });
                this.performOrbitalStrike(attacker, weakest);
                attacker.tap();
            }
        }

        // End AI turn after a delay
        setTimeout(() => this._aiEndTurn(), 500);
    }

    _aiEndTurn() {
        this.showMessage("AI ended turn");
        // Switch back to player 1
        this.isPlayer1Turn = true;
        this.gateActionUsed = false;
        this.turn++;

        // Reset all gates for player 1
        this.p1Gates.forEach(g => g.reset());

        // Remove summoning sickness from P2 cards (they've been out a full turn)
        this.p2Orbit.forEach(c => c.removeSummoningSickness());
        this.p2Planet.forEach(c => c.removeSummoningSickness());

        // Untap all P1 cards
        this.p1Orbit.forEach(c => c.untap());
        this.p1Planet.forEach(c => c.untap());

        // Draw a card for player 1
        const drawnCard = this.drawCard(true);
        if (drawnCard) {
            this.showMessage("Your turn - Drew a card!");
        } else {
            this.showMessage("Your turn!");
        }
    }

    // Find a gate that can pay for this cost (unused and power >= cost)
    findAvailableGate(cost, isPlayer1) {
        const gates = isPlayer1 ? this.p1Gates : this.p2Gates;
        return gates.find(g => !g.used && g.power >= cost);
    }

    // Check if a card is an event type
    isEventCard(card) {
        const type = (card.type || '').toLowerCase();
        return type.includes('event') || type.includes('instant') || type.includes('sorcery');
    }

    // Check if a card is a dropship
    isDropship(card) {
        const type = (card.data?.type || card.type || '').toLowerCase();
        return type.includes('dropship');
    }

    // Land a dropship - sacrifice it and spawn a ground unit
    landDropship(battlefieldCard, isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;
        const graveyard = isPlayer1 ? this.p1Graveyard : this.p2Graveyard;

        // Check if it's a dropship
        if (!this.isDropship(battlefieldCard)) {
            this.showMessage('Only dropships can land!');
            return false;
        }

        // Check summoning sickness
        if (battlefieldCard.summoningSickness) {
            this.showMessage('Summoning sickness - wait a turn!');
            return false;
        }

        // Check if already tapped
        if (battlefieldCard.tapped) {
            this.showMessage('Dropship is already tapped!');
            return false;
        }

        // Remove from orbit
        const idx = orbit.indexOf(battlefieldCard);
        if (idx === -1) return false;
        orbit.splice(idx, 1);

        // Add to graveyard
        graveyard.add(battlefieldCard.data);

        // Spawn ground unit
        const spawnedUnit = this.createGroundUnit(isPlayer1);
        planet.push(spawnedUnit);

        // Layout the planet zone
        this._layoutPlanet(isPlayer1);

        const unitName = isPlayer1 ? 'Marine Squad' : 'Crystal Golem';
        this.showMessage(`${battlefieldCard.data.name} landed! ${unitName} deployed!`);

        return true;
    }

    // Create a ground unit based on faction
    createGroundUnit(isPlayer1) {
        const unitData = isPlayer1 ? {
            name: 'Marine Squad',
            type: 'ground_unit',
            cost: 0,
            stats: { attack: 2, defense: 2 },
            ability: 'Deployed from Orbital Dropship. Can attack enemy ground units.',
            art: 'Terran marines in powered armor'
        } : {
            name: 'Crystal Golem',
            type: 'ground_unit',
            cost: 0,
            stats: { attack: 2, defense: 2 },
            ability: 'Deployed from Shard Lander. Can attack enemy ground units.',
            art: 'A humanoid crystal formation'
        };

        // Spawn in planet zone
        const zoneY = this.midY;
        return new BattlefieldCard(unitData, this.boardX + this.boardW / 2, zoneY, isPlayer1);
    }

    // Layout cards in planet zone (centered like orbit cards)
    _layoutPlanet(isPlayer1) {
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;
        const zoneH = this.boardH / 2 / 3;

        // P1 planet zone is at midY (top of P1's half)
        // P2 planet zone is at boardY + zoneH * 2 (bottom of P2's half, just above midY)
        const zoneY = isPlayer1
            ? this.midY + zoneH / 2  // Center of P1 planet zone
            : this.boardY + zoneH * 2 + zoneH / 2;  // Center of P2 planet zone

        const cardSpacing = 55;
        const totalWidth = (planet.length - 1) * cardSpacing;
        const startX = this.boardX + this.boardW / 2 - totalWidth / 2;

        planet.forEach((card, i) => {
            card.targetX = startX + i * cardSpacing;
            card.targetY = zoneY;
            card.baseZIndex = i;
        });
    }

    // Attack a ground unit
    attackGroundUnit(attacker, defender) {
        // Both deal damage to each other
        attacker.dealDamage(defender.power);
        defender.dealDamage(attacker.power);

        this.showMessage(`${attacker.data.name} attacks ${defender.data.name}!`);

        // Check for deaths
        this._checkGroundUnitDeaths();
    }

    // Check if any ground units died
    _checkGroundUnitDeaths() {
        // Check P1 units
        for (let i = this.p1Planet.length - 1; i >= 0; i--) {
            const unit = this.p1Planet[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p1Graveyard.add(unit.data);
                this.p1Planet.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Check P2 units
        for (let i = this.p2Planet.length - 1; i >= 0; i--) {
            const unit = this.p2Planet[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p2Graveyard.add(unit.data);
                this.p2Planet.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Re-layout
        this._layoutPlanet(true);
        this._layoutPlanet(false);
    }

    // Start gate selection for playing a card
    startGateSelection(cardIndex, isPlayer1) {
        const hand = isPlayer1 ? this.p1Hand : this.p2Hand;
        if (cardIndex < 0 || cardIndex >= hand.length) return false;

        const card = hand[cardIndex];
        const cost = card.cost || 0;

        // Check if any gates can afford this
        const gates = isPlayer1 ? this.p1Gates : this.p2Gates;
        const validGates = gates.filter(g => !g.used && g.power >= cost);

        if (validGates.length === 0) {
            this.showMessage(`No gate with power >= ${cost}!`);
            return false;
        }

        // Enter gate selection mode
        this.selectingGate = true;
        this.selectedCardIndex = cardIndex;
        this.selectedCardIsPlayer1 = isPlayer1;
        this.showMessage(`Select a gate for ${card.name} (cost ${cost})`);
        return true;
    }

    // Cancel gate selection
    cancelGateSelection() {
        this.selectingGate = false;
        this.selectedCardIndex = -1;
        this.showMessage('');
    }

    // Play a card from hand using a specific gate
    playCard(cardIndex, isPlayer1, gate) {
        const hand = isPlayer1 ? this.p1Hand : this.p2Hand;
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const graveyard = isPlayer1 ? this.p1Graveyard : this.p2Graveyard;

        if (cardIndex < 0 || cardIndex >= hand.length) return false;

        const card = hand[cardIndex];
        const cost = card.cost || 0;

        // Validate the gate
        if (!gate || gate.used || gate.power < cost) {
            this.showMessage(`Invalid gate selection!`);
            return false;
        }

        // Use the gate
        gate.use();
        hand.splice(cardIndex, 1);

        // Clear selection mode
        this.selectingGate = false;
        this.selectedCardIndex = -1;

        // Check if this is an event card
        if (this.isEventCard(card)) {
            // First check if this event needs targeting (returns false if so)
            const effectComplete = this._triggerEventEffect(card, isPlayer1);

            if (effectComplete) {
                // Event resolves immediately - animate and go to graveyard
                const centerX = this.boardX + this.boardW / 2;
                const centerY = this.midY;
                const graveyardX = isPlayer1 ? this.p1Graveyard.x : this.p2Graveyard.x;
                const graveyardY = isPlayer1 ? this.p1Graveyard.y : this.p2Graveyard.y;

                const eventAnim = new EventAnimation(
                    card,
                    gate.x, gate.y,  // Start at gate
                    graveyardX, graveyardY,  // End at graveyard
                    isPlayer1,
                    () => {
                        // On complete, add to graveyard
                        graveyard.add(card);
                        this.showMessage(`${card.name} resolved!`);
                    }
                );

                // Set center position for display phase
                eventAnim.setCenter(centerX, centerY);

                this.eventAnimations.push(eventAnim);
                this.showMessage(`${card.name} triggered!`);
            }
            // If effectComplete is false, the card is in targeting mode (this.eventCard)
            // and will be handled by the targeting system
        } else if (this.isEquipment(card)) {
            // Equipment cards: enter targeting mode
            this.equipmentCard = card;
            this.equipmentIsPlayer1 = isPlayer1;
            this.showMessage(`Select a target for ${card.name}`);
            return true;
        } else {
            // All cards deploy to orbit first (ground units can move to planet next turn)
            const battlefieldCard = new BattlefieldCard(card, gate.x, gate.y, isPlayer1);
            orbit.push(battlefieldCard);
            this._layoutOrbit(isPlayer1);
            this.showMessage(`${card.name} warped in!`);
        }

        return true;
    }

    // Check if a card is a surface unit type
    isSurfaceUnit(card) {
        const type = (card.type || '').toLowerCase();
        return type.includes('surface_unit') || type.includes('surface unit');
    }

    // Check if a card is equipment/upgrade/weapon
    isEquipment(card) {
        const type = (card.type || '').toLowerCase();
        return type.includes('equipment') || type.includes('upgrade') || type.includes('weapon');
    }

    // Check if unit has orbital strike ability
    hasOrbitalStrike(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const name = (card.data?.name || '').toLowerCase();
        return ability.includes('orbital strike') ||
               ability.includes('surface target') ||
               name.includes('hyperion');
    }

    // Check if unit has anti-air ability (can attack orbital from ground)
    hasAntiAir(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('target orbital') || ability.includes('orbital units from');
    }

    // Get valid attack targets for a unit
    getValidAttackTargets(attacker) {
        const isMyP1 = attacker.isPlayer1;
        const enemyOrbit = isMyP1 ? this.p2Orbit : this.p1Orbit;
        const enemyPlanet = isMyP1 ? this.p2Planet : this.p1Planet;

        const inOrbit = this.p1Orbit.includes(attacker) || this.p2Orbit.includes(attacker);
        const onGround = this.p1Planet.includes(attacker) || this.p2Planet.includes(attacker);

        let targets = [];

        if (inOrbit) {
            // Orbital units can attack other orbital units (except artifacts)
            targets = targets.concat(enemyOrbit.filter(c => !this.isArtifact(c)));
            // And ground units if they have orbital strike
            if (this.hasOrbitalStrike(attacker)) {
                targets = targets.concat(enemyPlanet.filter(c => !this.isArtifact(c)));
                // Can also attack enemy generator with orbital strike
                if (this.planetaryGenerator && this.planetaryGenerator.isPlayer1 !== isMyP1) {
                    targets.push(this.planetaryGenerator);
                }
            }
        }

        if (onGround) {
            // Ground units can attack other ground units (except artifacts)
            targets = targets.concat(enemyPlanet.filter(c => !this.isArtifact(c)));
            // Ground units can attack the enemy generator
            if (this.planetaryGenerator && this.planetaryGenerator.isPlayer1 !== isMyP1) {
                targets.push(this.planetaryGenerator);
            }
            // And orbital units if they have anti-air (except artifacts)
            if (this.hasAntiAir(attacker)) {
                targets = targets.concat(enemyOrbit.filter(c => !this.isArtifact(c)));
            }
        }

        return targets;
    }

    // Perform combat between two units
    performCombat(attacker, defender) {
        // Calculate effective stats with buffs
        const attackerPower = this.getEffectiveAttack(attacker);
        const defenderPower = this.getEffectiveAttack(defender);

        // Deal damage to each other
        defender.dealDamage(attackerPower);
        attacker.dealDamage(defenderPower);

        this.showMessage(`${attacker.data.name} attacks ${defender.data.name}!`);

        // Check for deaths
        this._checkUnitDeaths();
    }

    // Perform orbital strike (attacker takes no counter damage)
    performOrbitalStrike(attacker, defender) {
        // Orbital strike has -1 attack penalty
        const attackerPower = Math.max(0, this.getEffectiveAttack(attacker) - 1);

        defender.dealDamage(attackerPower);
        this.showMessage(`${attacker.data.name} orbital strikes ${defender.data.name}!`);

        // Check for deaths
        this._checkUnitDeaths();
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
        let bonus = 0;
        const isMyP1 = card.isPlayer1;
        const myOrbit = isMyP1 ? this.p1Orbit : this.p2Orbit;
        const myPlanet = isMyP1 ? this.p1Planet : this.p2Planet;

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

    // Check if equipment can target this card
    isValidEquipTarget(equipment, target) {
        const equipTarget = (equipment.equipTarget || '').toLowerCase();
        const targetType = (target.data?.type || '').toLowerCase();
        const targetName = (target.data?.name || '').toLowerCase();

        // "Any Terran card" or "Any Crystalline unit"
        if (equipTarget.includes('any')) {
            if (equipTarget.includes('capital ship') && targetType.includes('capital')) return true;
            if (equipTarget.includes('ship') && (targetType.includes('ship') || targetType.includes('capital'))) return true;
            if (equipTarget.includes('structure') && (targetType.includes('structure') || targetType.includes('station'))) return true;
            if (equipTarget.includes('unit') && targetType.includes('unit')) return true;
            if (equipTarget.includes('terran') || equipTarget.includes('crystalline') || equipTarget.includes('card')) return true;
        }

        return true; // Default allow for flexibility
    }

    // Attach equipment to a target
    attachEquipment(equipment, target) {
        if (!target.equipment) target.equipment = [];
        target.equipment.push(equipment);

        // Apply immediate stat changes
        const ability = (equipment.ability || '').toLowerCase();

        // +X Attack
        const attackMatch = ability.match(/\+(\d+)\s*attack/i);
        if (attackMatch) {
            target.power += parseInt(attackMatch[1]);
        }

        // +X Defense
        const defenseMatch = ability.match(/\+(\d+)\s*defense/i);
        if (defenseMatch) {
            target.toughness += parseInt(defenseMatch[1]);
            target.currentToughness += parseInt(defenseMatch[1]);
        }

        this.showMessage(`${equipment.name} equipped to ${target.data.name}!`);
    }

    // Check for unit deaths in all zones
    _checkUnitDeaths() {
        // Check P1 orbit
        for (let i = this.p1Orbit.length - 1; i >= 0; i--) {
            const unit = this.p1Orbit[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p1Graveyard.add(unit.data);
                this.p1Orbit.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Check P2 orbit
        for (let i = this.p2Orbit.length - 1; i >= 0; i--) {
            const unit = this.p2Orbit[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p2Graveyard.add(unit.data);
                this.p2Orbit.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Check P1 planet
        for (let i = this.p1Planet.length - 1; i >= 0; i--) {
            const unit = this.p1Planet[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p1Graveyard.add(unit.data);
                this.p1Planet.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Check P2 planet
        for (let i = this.p2Planet.length - 1; i >= 0; i--) {
            const unit = this.p2Planet[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p2Graveyard.add(unit.data);
                this.p2Planet.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Re-layout
        this._layoutOrbit(true);
        this._layoutOrbit(false);
        this._layoutPlanet(true);
        this._layoutPlanet(false);
    }

    // Trigger an event card's effect
    _triggerEventEffect(card, isPlayer1) {
        // Use the comprehensive playEventCard method
        this.playEventCard(card, isPlayer1);
    }

    // Layout cards in orbit zone
    _layoutOrbit(isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        if (orbit.length === 0) return;

        const zoneH = this.boardH / 2 / 3;
        const orbitY = isPlayer1
            ? this.midY + zoneH + zoneH / 2  // P1 orbit
            : this.boardY + zoneH + zoneH / 2;  // P2 orbit

        const cardSpacing = 45;
        const totalWidth = (orbit.length - 1) * cardSpacing;
        const startX = this.boardX + this.boardW / 2 - totalWidth / 2;

        orbit.forEach((card, i) => {
            card.targetX = startX + i * cardSpacing;
            card.targetY = orbitY;
            card.baseZIndex = i;
        });
    }

    _layoutGates() {
        const zoneH = this.boardH / 2 / 3;

        // Layout P1 gates (left side, stacked vertically in bottom half)
        const p1GateX = this.boardX + 50;
        const p1Count = this.p1Gates.length;
        const p1Spacing = Math.min(50, 120 / Math.max(p1Count, 1));
        const p1StartY = this.midY + 60;
        this.p1Gates.forEach((gate, i) => {
            gate.targetX = p1GateX;
            gate.targetY = p1StartY + i * p1Spacing;
        });

        // Layout P2 gates (left side, stacked vertically in top half)
        const p2GateX = this.boardX + 50;
        const p2Count = this.p2Gates.length;
        const p2Spacing = Math.min(50, 120 / Math.max(p2Count, 1));
        const p2StartY = this.midY - 60 - (p2Count - 1) * p2Spacing;
        this.p2Gates.forEach((gate, i) => {
            gate.targetX = p2GateX;
            gate.targetY = p2StartY + i * p2Spacing;
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

        // Layout orbit cards
        this._layoutOrbit(true);
        this._layoutOrbit(false);

        // Update all objects
        this.p1Deck.update(dt, engine);
        this.p2Deck.update(dt, engine);
        this.p1Graveyard.update(dt, engine);
        this.p2Graveyard.update(dt, engine);
        this.p1Gates.forEach(g => g.update(dt, engine));
        this.p2Gates.forEach(g => g.update(dt, engine));
        this.p1Orbit.forEach(c => c.update(dt, engine));
        this.p2Orbit.forEach(c => c.update(dt, engine));
        this.p1Planet.forEach(c => c.update(dt, engine));
        this.p2Planet.forEach(c => c.update(dt, engine));
        if (this.planetaryGenerator) {
            this.planetaryGenerator.update(dt, engine);
        }
        this.planetCard.update(dt, engine);
        this.artifactCard.update(dt, engine);
        this.nativesCard.update(dt, engine);

        // Update event animations
        this.eventAnimations.forEach(e => e.update(dt));
        this.eventAnimations = this.eventAnimations.filter(e => !e.complete);

        // Apply passive buffs (Defense Grid, etc.)
        this.applyPassiveBuffs();

        // Track hovered battlefield card (for z-index priority) - includes planet units and generator
        this.hoveredBattlefieldCard = null;
        const allCards = [...this.p1Orbit, ...this.p2Orbit, ...this.p1Planet, ...this.p2Planet];
        if (this.planetaryGenerator) {
            allCards.push(this.planetaryGenerator);
        }
        for (const card of allCards) {
            if (card.hovered) {
                this.hoveredBattlefieldCard = card;
                break;
            }
        }

        // Update hand hover detection (only if not hovering battlefield card)
        if (!this.hoveredBattlefieldCard) {
            this._updateHandHover(engine);
        } else {
            this.hoveredCard = null;
        }

        // Handle right-click to cancel gate selection
        if (engine.mouse.rightClicked && this.selectingGate) {
            this.cancelGateSelection();
        }

        // Handle right-click for garrison - if unit selected in combat mode and right-click generator
        if (engine.mouse.rightClicked && this.combatAttackers.length > 0 &&
            this.planetaryGenerator && this.hoveredBattlefieldCard === this.planetaryGenerator) {
            // Check if we control the generator
            const attackerIsP1 = this.combatAttackers[0].isPlayer1;
            if (this.planetaryGenerator.isPlayer1 === attackerIsP1) {
                // Garrison all selected units
                for (const unit of this.combatAttackers) {
                    const isGroundUnit = this.p1Planet.includes(unit) || this.p2Planet.includes(unit);
                    if (isGroundUnit) {
                        this.garrisonToGenerator(unit);
                    }
                }
                this.combatAttackers = [];
                this.inCombatSelection = false;
                return;
            }
        }

        // Handle right-click to cancel combat selection (if not garrisoning)
        if (engine.mouse.rightClicked && this.combatAttackers.length > 0 && !this.hoveredBattlefieldCard) {
            this.cancelCombatSelection();
        }

        // Click anywhere to close enlarged card view
        if (engine.mouse.clicked && this.enlargedCard) {
            this.enlargedCard = null;
            return; // Don't process other clicks
        }

        // Click anywhere to close graveyard view
        if (engine.mouse.clicked && this.viewingGraveyard) {
            this.viewingGraveyard = null;
            return; // Don't process other clicks
        }

        // Click graveyard to view cards
        if (engine.mouse.clicked && this.p1Graveyard.hovered && this.p1Graveyard.count > 0) {
            this.viewingGraveyard = 'p1';
            return;
        }
        if (engine.mouse.clicked && this.p2Graveyard.hovered && this.p2Graveyard.count > 0) {
            this.viewingGraveyard = 'p2';
            return;
        }

        // Handle event card targeting (Orbital Bombardment, etc.)
        if (this.eventCard) {
            // Cancel with right-click
            if (engine.mouse.rightClicked) {
                const hand = this.eventIsPlayer1 ? this.p1Hand : this.p2Hand;
                hand.push(this.eventCard);
                this.eventCard = null;
                this.eventIsPlayer1 = true;
                this.showMessage('Targeting cancelled');
                return;
            }

            if (engine.mouse.clicked) {
                // Check if clicking on a valid target (enemy ground unit)
                const enemyPlanet = this.eventIsPlayer1 ? this.p2Planet : this.p1Planet;
                const target = enemyPlanet.find(card => card.hovered);

                if (target) {
                    // Execute the orbital strike on target
                    this.executeOrbitalStrikeEvent(target);

                    // Send event card to graveyard
                    const graveyard = this.eventIsPlayer1 ? this.p1Graveyard : this.p2Graveyard;
                    graveyard.add(this.eventCard);

                    // Clear event targeting mode
                    this.eventCard = null;
                    this.eventIsPlayer1 = true;
                }
                // Always consume click when in targeting mode
                return;
            }
        }

        // Handle hand card drag-to-play: Start drag
        if (engine.mouse.down && this.hoveredHandIndex >= 0 && !this.draggingHandCard && !this.enlargedCard) {
            const isP1 = this.isPlayer1Turn;
            const hand = isP1 ? this.p1Hand : this.p2Hand;
            if (this.hoveredHandIndex < hand.length) {
                this.draggingHandCard = hand[this.hoveredHandIndex];
                this.draggingHandCardIndex = this.hoveredHandIndex;
                this.draggingHandCardIsPlayer1 = isP1;
                this.handCardDragX = engine.mouse.x;
                this.handCardDragY = engine.mouse.y;
            }
        }

        // Handle hand card drag movement
        if (this.draggingHandCard && engine.mouse.down) {
            this.handCardDragX = engine.mouse.x;
            this.handCardDragY = engine.mouse.y;
        }

        // Handle hand card drag release
        if (this.draggingHandCard && !engine.mouse.down) {
            const card = this.draggingHandCard;
            const isPlayer1 = this.draggingHandCardIsPlayer1;
            const cardIndex = this.draggingHandCardIndex;
            const cost = card.cost || 0;

            // Check if dropped in sidebar area (right side) - enter view mode
            const sidebarX = this.boardX + this.boardW;
            const inSidebar = this.handCardDragX > sidebarX;

            // Check if dropped anywhere in the battlefield (generous drop zone)
            // The battlefield is from boardY to boardY + boardH, and between boardX and boardX + boardW
            const inBattlefield =
                this.handCardDragX >= this.boardX &&
                this.handCardDragX <= this.boardX + this.boardW &&
                this.handCardDragY >= this.boardY &&
                this.handCardDragY <= this.boardY + this.boardH &&
                !inSidebar;

            if (inSidebar) {
                // View mode - enlarge the card for inspection
                this.enlargedCard = { data: card, isHandCard: true };
            } else if (inBattlefield) {
                // Check if any gate can afford the card
                const gate = this.findAvailableGate(cost, isPlayer1);
                if (gate) {
                    // Enter gate selection mode - let player choose which gate
                    this.startGateSelection(cardIndex, isPlayer1);
                } else {
                    this.showMessage('No gate with enough power!');
                }
            }
            // Reset drag state
            this.draggingHandCard = null;
            this.draggingHandCardIndex = -1;
        }

        // Double-click on hand card to enlarge (for inspection)
        // Use lastHoveredHandIndex to handle slight mouse movement during double-click
        if (engine.mouse.doubleClicked && !this.enlargedCard && !this.draggingHandCard) {
            const idx = this.hoveredHandIndex >= 0 ? this.hoveredHandIndex : this.lastHoveredHandIndex;
            if (idx >= 0) {
                const isP1 = this.isPlayer1Turn;
                const hand = isP1 ? this.p1Hand : this.p2Hand;
                if (idx < hand.length) {
                    this.enlargedCard = { data: hand[idx], isHandCard: true };
                }
            }
        }

        // Track last hovered index for double-click reliability
        if (this.hoveredHandIndex >= 0) {
            this.lastHoveredHandIndex = this.hoveredHandIndex;
            this.lastHoveredTime = performance.now();
        } else if (performance.now() - this.lastHoveredTime > 500) {
            // Clear after 500ms of not hovering
            this.lastHoveredHandIndex = -1;
        }

        // Double-click on battlefield card to enlarge
        if (engine.mouse.doubleClicked && this.hoveredBattlefieldCard && !this.enlargedCard) {
            this.enlargedCard = this.hoveredBattlefieldCard;
        }

        // Handle drag start for moving ground units to planet
        if (engine.mouse.clicked && this.hoveredBattlefieldCard && !this.draggingCard) {
            const card = this.hoveredBattlefieldCard;
            const isMyCard = (this.isPlayer1Turn && card.isPlayer1) || (!this.isPlayer1Turn && !card.isPlayer1);
            const inOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);

            // Can drag ground units from orbit to planet (if not summoning sick and not tapped)
            if (isMyCard && inOrbit && this.isGroundUnit(card) && !card.summoningSickness && !card.tapped && !card.movedThisTurn) {
                this.draggingCard = card;
                this.dragStartX = card.x;
                this.dragStartY = card.y;
            }
        }

        // Handle drag movement
        if (this.draggingCard && engine.mouse.down) {
            this.draggingCard.x = engine.mouse.x;
            this.draggingCard.y = engine.mouse.y;
        }

        // Handle drag release - check if dropped in planet zone
        if (this.draggingCard && !engine.mouse.down) {
            const card = this.draggingCard;
            const planetZoneY = card.isPlayer1 ? this.midY + 80 : this.midY - 80;
            const inPlanetZone = Math.abs(engine.mouse.y - planetZoneY) < 60;

            if (inPlanetZone) {
                // Move to planet zone
                this.moveToPlanet(card);
            } else {
                // Snap back to original position
                card.x = this.dragStartX;
                card.y = this.dragStartY;
            }
            this.draggingCard = null;
        }

        // Handle clicks
        if (engine.mouse.clicked) {
            // If in gate selection mode
            if (this.selectingGate) {
                const gates = this.selectedCardIsPlayer1 ? this.p1Gates : this.p2Gates;
                const hand = this.selectedCardIsPlayer1 ? this.p1Hand : this.p2Hand;
                const card = hand[this.selectedCardIndex];
                const cost = card?.cost || 0;

                // Check if clicked on a valid gate
                for (const gate of gates) {
                    if (gate.hovered && !gate.used && gate.power >= cost) {
                        this.playCard(this.selectedCardIndex, this.selectedCardIsPlayer1, gate);
                        return;
                    }
                }

                // Clicked elsewhere - cancel selection
                this.cancelGateSelection();
                return;
            }

            // Equipment targeting mode
            if (this.equipmentCard && this.hoveredBattlefieldCard) {
                const target = this.hoveredBattlefieldCard;
                const isMyCard = (this.equipmentIsPlayer1 && target.isPlayer1) || (!this.equipmentIsPlayer1 && !target.isPlayer1);

                if (isMyCard && this.isValidEquipTarget(this.equipmentCard, target)) {
                    this.attachEquipment(this.equipmentCard, target);
                    this.equipmentCard = null;
                    return;
                } else {
                    this.showMessage('Invalid target for equipment!');
                    return;
                }
            }

            // Cancel equipment mode if clicking empty space
            if (this.equipmentCard && !this.hoveredBattlefieldCard) {
                this.showMessage('Equipment cancelled');
                // Return equipment to graveyard (it was already played)
                const graveyard = this.equipmentIsPlayer1 ? this.p1Graveyard : this.p2Graveyard;
                graveyard.add(this.equipmentCard);
                this.equipmentCard = null;
                return;
            }

            // Check battlefield card clicks
            if (this.hoveredBattlefieldCard) {
                const card = this.hoveredBattlefieldCard;
                const isMyCard = (this.isPlayer1Turn && card.isPlayer1) || (!this.isPlayer1Turn && !card.isPlayer1);

                // Determine card locations
                const isDefenderInOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);
                const isDefenderOnGround = this.p1Planet.includes(card) || this.p2Planet.includes(card);

                // If in combat selection mode, clicking enemy executes the combat stack
                if (this.inCombatSelection && this.combatAttackers.length > 0 && !isMyCard) {
                    // Check if this is a valid target for all attackers
                    // For simplicity, check if any attacker can hit this target
                    let canAttack = false;

                    for (const attacker of this.combatAttackers) {
                        const validTargets = this.getValidAttackTargets(attacker);
                        if (validTargets.includes(card)) {
                            canAttack = true;
                            break;
                        }
                    }

                    // Also check if clicking on generator
                    if (card === this.planetaryGenerator) {
                        canAttack = true;
                    }

                    if (canAttack) {
                        this.executeCombatStack(card);
                        return;
                    } else {
                        this.showMessage('Invalid target for selected attackers!');
                        return;
                    }
                }

                // Cancel combat selection if clicking elsewhere (not on friendly unit)
                if (this.inCombatSelection && !isMyCard) {
                    this.cancelCombatSelection();
                    return;
                }

                // Only interact with your own cards
                if (isMyCard) {
                    // Check if it's a dropship in orbit
                    if (this.isDropship(card)) {
                        const inOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);
                        if (inOrbit && !card.summoningSickness && !card.tapped) {
                            this.landDropship(card, card.isPlayer1);
                            return;
                        }
                    }

                    // Check if it's a carrier that can deploy tokens
                    if (this.canDeployToken(card)) {
                        this.deployTokens(card, card.isPlayer1);
                        return;
                    }

                    // Ground units in orbit are "bricks" - they can only be dragged to surface
                    const inOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);
                    const onPlanet = this.p1Planet.includes(card) || this.p2Planet.includes(card);

                    if (this.isGroundUnit(card) && inOrbit) {
                        if (!card.summoningSickness && !card.tapped && !card.movedThisTurn) {
                            this.showMessage('Drag to planet surface to deploy!');
                        } else if (card.summoningSickness) {
                            this.showMessage('Wait a turn, then drag to surface');
                        }
                        return;
                    }

                    // Check for Survey Team artifact discovery (must be on planet surface)
                    if (this.isSurveyTeam(card) && onPlanet && !card.tapped && !card.summoningSickness) {
                        this.attemptArtifactDiscovery(card, card.isPlayer1);
                        return;
                    }

                    // Check for Quantum Sensor activation (non-combatant)
                    if (this.isQuantumSensor(card) && !card.tapped && !card.summoningSickness) {
                        this.activateQuantumSensor(card, card.isPlayer1);
                        return;
                    }

                    // Check for Planetary Consciousness win condition
                    if (this.isPlanetaryConsciousness(card) && !card.tapped && !card.summoningSickness) {
                        if (this.attemptConsciousnessVictory(card.isPlayer1)) {
                            return;
                        }
                    }

                    // Enter combat selection mode or add to combat stack
                    // ONLY for offensive units (not Survey Teams, Harvesters, Science ships, etc.)
                    if (!card.summoningSickness && !card.tapped && card.power > 0 && this.isOffensiveUnit(card)) {
                        const inOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);
                        const onGround = this.p1Planet.includes(card) || this.p2Planet.includes(card);

                        if (inOrbit || onGround) {
                            // Always allow entering combat mode - can cancel with right-click
                            // or right-click on generator to garrison
                            this.addToCombatStack(card);
                            this.inCombatSelection = true;
                            return;
                        }
                    }

                    // No manual untapping - only tap abilities are allowed
                    if (card.tapped) {
                        this.showMessage('Card is already tapped!');
                    } else if (card.summoningSickness) {
                        this.showMessage('Summoning sickness - wait a turn!');
                    } else if (!this.isOffensiveUnit(card) && card.power > 0) {
                        this.showMessage(`${card.data.name} is a non-combatant!`);
                    }
                }
                return;
            }

            // Hand cards are now played via drag-to-play (handled above)

            // Check gate clicks for current player (upgrade gate if not in selection mode)
            if (!this.selectingGate) {
                const gates = this.currentGates;
                for (const gate of gates) {
                    if (gate.hovered) {
                        this.incrementGate(gate);
                        return;
                    }
                }
            }

            // DEBUG: Click deck to draw a card
            if (this.p1Deck.hovered && this.isPlayer1Turn) {
                this.drawCardForPlayer(true);
                this.showMessage('DEBUG: Drew a card');
                return;
            }
            if (this.p2Deck.hovered && !this.isPlayer1Turn) {
                this.drawCardForPlayer(false);
                this.showMessage('DEBUG: Drew a card');
                return;
            }
        }
    }

    _updateHandHover(engine) {
        this.hoveredCard = null;
        this.hoveredHandIndex = -1;
        const mx = engine.mouse.x;
        const my = engine.mouse.y;

        // Don't update hover while dragging
        if (this.draggingHandCard) return;

        // Arena-style fan layout parameters (must match _renderHand)
        const cardW = 90;
        const cardH = 130;
        const centerX = this.boardX + this.boardW / 2;
        const arcRadius = 400;

        // Check P1 hand (bottom) - only if it's P1's turn
        if (this.isPlayer1Turn && this.p1Hand.length > 0) {
            const baseY = engine.height + 20;
            const maxSpread = Math.min(this.p1Hand.length * 0.08, 0.5);

            // Check cards in reverse order (rightmost/topmost first for overlap)
            for (let i = this.p1Hand.length - 1; i >= 0; i--) {
                const t = this.p1Hand.length === 1 ? 0 : (i / (this.p1Hand.length - 1)) - 0.5;
                const angle = t * maxSpread;

                const cardX = centerX + Math.sin(angle) * arcRadius;
                const cardY = baseY - Math.cos(angle) * 80;

                // Hit test - account for pop-out position (card moves up 60px when hovered)
                const isCurrentlyHovered = this.hoveredHandIndex === i;
                const popOut = isCurrentlyHovered ? 60 : 0;
                const hitW = cardW;
                const hitH = cardH + popOut; // Extend hit area to include pop-out region
                const hitY = cardY - popOut; // Shift hit center up when popped out

                if (mx >= cardX - hitW/2 && mx <= cardX + hitW/2 &&
                    my >= hitY - hitH/2 && my <= hitY + hitH/2) {
                    this.hoveredHandIndex = i;
                    this.hoveredCard = this.p1Hand[i];
                    this.hoveredCardPos = {
                        x: cardX,
                        y: cardY - popOut - cardH/2 - 20,
                        isPlayer1: true
                    };
                    return;
                }
            }
        }

        // Check P2 hand (top) - only if it's P2's turn
        if (!this.isPlayer1Turn && this.p2Hand.length > 0) {
            const baseY = -20;
            const maxSpread = Math.min(this.p2Hand.length * 0.08, 0.5);

            for (let i = this.p2Hand.length - 1; i >= 0; i--) {
                const t = this.p2Hand.length === 1 ? 0 : (i / (this.p2Hand.length - 1)) - 0.5;
                const angle = t * maxSpread * -1;

                const cardX = centerX + Math.sin(angle) * arcRadius;
                const cardY = baseY + Math.cos(angle) * 80;

                // Hit test - account for pop-out position (card moves down 60px when hovered for P2)
                const isCurrentlyHovered = this.hoveredHandIndex === i;
                const popOut = isCurrentlyHovered ? 60 : 0;
                const hitW = cardW;
                const hitH = cardH + popOut;
                const hitY = cardY + popOut;

                if (mx >= cardX - hitW/2 && mx <= cardX + hitW/2 &&
                    my >= hitY - hitH/2 && my <= hitY + hitH/2) {
                    this.hoveredHandIndex = i;
                    this.hoveredCard = this.p2Hand[i];
                    this.hoveredCardPos = {
                        x: cardX,
                        y: cardY + popOut + cardH/2 + 20,
                        isPlayer1: false
                    };
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

        // Horizontal dividing line
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(boardX, midY);
        ctx.lineTo(boardX + boardW, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone heights - each half has 3 zones
        const zoneH = boardH / 2 / 3;

        // Player 1 zones (bottom half) - full width, Gate at bottom, Planet at middle
        this._renderZone(ctx, 'P1 GATE', boardX, midY + zoneH * 2, boardW, zoneH, '#4ecdc4', 0.15);
        this._renderZone(ctx, 'P1 ORBIT', boardX, midY + zoneH, boardW, zoneH, '#60a5fa', 0.1);
        this._renderZone(ctx, 'P1 PLANET', boardX, midY, boardW, zoneH, '#22c55e', 0.08);

        // Player 2 zones (top half) - full width, Gate at top, Planet at bottom of their half
        this._renderZone(ctx, 'P2 GATE', boardX, boardY, boardW, zoneH, '#ef4444', 0.15);
        this._renderZone(ctx, 'P2 ORBIT', boardX, boardY + zoneH, boardW, zoneH, '#f97316', 0.1);
        this._renderZone(ctx, 'P2 PLANET', boardX, boardY + zoneH * 2, boardW, zoneH, '#a855f7', 0.08);
    }

    _renderZone(ctx, label, x, y, w, h, color, alpha) {
        ctx.save();

        // Zone fill with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + h);
        gradient.addColorStop(0, `${color}00`);
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, `${color}00`);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 8, y + 4, w - 16, h - 8);

        // Zone border - subtle corners
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 18);
        ctx.lineTo(x + 8, y + 8);
        ctx.lineTo(x + 28, y + 8);
        ctx.stroke();

        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(x + w - 28, y + 8);
        ctx.lineTo(x + w - 8, y + 8);
        ctx.lineTo(x + w - 8, y + 18);
        ctx.stroke();

        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(x + 8, y + h - 18);
        ctx.lineTo(x + 8, y + h - 8);
        ctx.lineTo(x + 28, y + h - 8);
        ctx.stroke();

        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(x + w - 28, y + h - 8);
        ctx.lineTo(x + w - 8, y + h - 8);
        ctx.lineTo(x + w - 8, y + h - 18);
        ctx.stroke();

        ctx.restore();

        // Zone label - badge style
        ctx.save();
        const labelWidth = ctx.measureText(label).width + 16;

        ctx.font = '6px PixelFont, monospace';
        const textWidth = ctx.measureText(label).width;
        const badgeX = x + 12;
        const badgeY = y + 6;
        const badgeW = textWidth + 10;
        const badgeH = 12;

        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#0a0a15';
        Draw.roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 3);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.globalAlpha = 0.9;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, badgeX + 5, badgeY + badgeH / 2 + 0.5);
        ctx.restore();
    }

    renderUI(ctx, engine) {
        // Render board
        this.renderBoard(ctx, engine);

        // Render decks and graveyards
        this.p1Deck.render(ctx);
        this.p2Deck.render(ctx);
        this.p1Graveyard.render(ctx);
        this.p2Graveyard.render(ctx);

        // Show "DROP TO VIEW" hint when dragging hand card toward sidebar
        if (this.draggingHandCard) {
            const sidebarX = this.boardX + this.boardW;
            const inSidebar = this.handCardDragX > sidebarX;

            ctx.save();
            ctx.globalAlpha = inSidebar ? 1 : 0.5;
            ctx.fillStyle = inSidebar ? '#22c55e' : '#666';
            ctx.font = '12px PixelFont, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('DROP TO', sidebarX + 60, engine.height / 2 - 10);
            ctx.fillText('VIEW CARD', sidebarX + 60, engine.height / 2 + 10);

            // Draw highlight box when hovering over sidebar
            if (inSidebar) {
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(sidebarX + 5, 50, 110, engine.height - 100);
                ctx.setLineDash([]);
            }
            ctx.restore();
        }

        // Render display cards
        this.planetCard.render(ctx);
        this.artifactCard.render(ctx);
        this.nativesCard.render(ctx);

        // Render version watermark (right of artifact card)
        ctx.save();
        ctx.font = '10px PixelFont, monospace';
        ctx.fillStyle = 'rgba(168, 85, 247, 0.4)'; // Purple with transparency
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const watermarkX = this.artifactCard.x + 50;
        const watermarkY = this.midY;
        ctx.fillText('scg', watermarkX, watermarkY - 8);
        ctx.fillText(`v${VERSION}`, watermarkX, watermarkY + 8);
        ctx.restore();

        // Render gates (with selection mode highlighting)
        const selectedCard = this.selectingGate && this.selectedCardIndex >= 0
            ? (this.selectedCardIsPlayer1 ? this.p1Hand : this.p2Hand)[this.selectedCardIndex]
            : null;
        const cardCost = selectedCard?.cost || 0;

        // Only show selection UI for the selecting player's gates
        this.p1Gates.forEach(g => {
            const inSelectionMode = this.selectingGate && this.selectedCardIsPlayer1;
            const canAfford = g.power >= cardCost;
            g.render(ctx, inSelectionMode, canAfford);
        });
        this.p2Gates.forEach(g => {
            const inSelectionMode = this.selectingGate && !this.selectedCardIsPlayer1;
            const canAfford = g.power >= cardCost;
            g.render(ctx, inSelectionMode, canAfford);
        });

        // Render battlefield cards (sorted by zIndex) - includes planet units and generator
        const allBattlefieldCards = [...this.p1Orbit, ...this.p2Orbit, ...this.p1Planet, ...this.p2Planet];
        if (this.planetaryGenerator) {
            allBattlefieldCards.push(this.planetaryGenerator);
        }
        allBattlefieldCards.sort((a, b) => a.zIndex - b.zIndex);

        // Highlight valid attack targets when in combat selection mode
        allBattlefieldCards.forEach(c => {
            // Check if this is a valid attack target
            if (this.inCombatSelection && this.combatAttackers.length > 0 && !this.combatAttackers.includes(c)) {
                // Check if any attacker can hit this target
                let isValidTarget = false;
                for (const attacker of this.combatAttackers) {
                    const validTargets = this.getValidAttackTargets(attacker);
                    if (validTargets.includes(c)) {
                        isValidTarget = true;
                        break;
                    }
                }
                // Only show as target if it's an enemy
                const isEnemy = (this.isPlayer1Turn && !c.isPlayer1) || (!this.isPlayer1Turn && c.isPlayer1);
                c.isAttackTarget = isValidTarget && isEnemy;
            } else {
                c.isAttackTarget = false;
            }
            c.render(ctx);

            // "DRAG TO PLANET" indicator for ground units in orbit
            const isMyCard = (this.isPlayer1Turn && c.isPlayer1) || (!this.isPlayer1Turn && !c.isPlayer1);
            const inOrbit = this.p1Orbit.includes(c) || this.p2Orbit.includes(c);
            const canDrag = isMyCard && inOrbit && this.isGroundUnit(c) && !c.summoningSickness && !c.tapped && !c.movedThisTurn;

            if (canDrag) {
                ctx.save();
                ctx.font = '8px PixelFont, monospace';
                ctx.fillStyle = '#22c55e';
                ctx.textAlign = 'center';
                ctx.fillText('DRAG TO PLANET', c.x, c.y + 50);
                ctx.restore();
            }
        });

        // Game title (top center, stylized)
        ctx.save();
        ctx.font = '14px PixelFont, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Title glow
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 10;

        // Title gradient
        const titleGrad = ctx.createLinearGradient(
            engine.width / 2 - 80, 0,
            engine.width / 2 + 80, 0
        );
        titleGrad.addColorStop(0, '#4ecdc4');
        titleGrad.addColorStop(0.5, '#66fff0');
        titleGrad.addColorStop(1, '#a855f7');

        ctx.fillStyle = titleGrad;
        ctx.fillText('SPACE CARD GAME', this.boardX + this.boardW / 2, 3);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Research and Energy sidebar (left side)
        ctx.save();
        const sidebarX = 10;
        const sidebarY = 120;
        const sidebarW = 100;
        const sidebarH = 140;

        // Sidebar background
        ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
        Draw.roundRect(ctx, sidebarX, sidebarY, sidebarW, sidebarH, 8);
        ctx.fill();
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '9px PixelFont, monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText('P1 RESOURCES', sidebarX + 8, sidebarY + 16);

        // Research
        ctx.fillStyle = '#a855f7';
        ctx.fillText(`Research: ${this.p1Research}`, sidebarX + 8, sidebarY + 32);

        // Discovery chance
        const chance = Math.round(this.getDiscoveryChance(true) * 100);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`Discovery: ${chance}%`, sidebarX + 8, sidebarY + 46);

        // Energy
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`Energy: ${this.p1Energy}/${this.p1MaxEnergy || 10}`, sidebarX + 8, sidebarY + 60);

        // Divider
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(sidebarX + 8, sidebarY + 70);
        ctx.lineTo(sidebarX + sidebarW - 8, sidebarY + 70);
        ctx.stroke();

        // P2 Resources
        ctx.fillStyle = '#a855f7';
        ctx.fillText('P2 RESOURCES', sidebarX + 8, sidebarY + 86);

        ctx.fillStyle = '#a855f7';
        ctx.fillText(`Research: ${this.p2Research}`, sidebarX + 8, sidebarY + 102);

        const chance2 = Math.round(this.getDiscoveryChance(false) * 100);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`Discovery: ${chance2}%`, sidebarX + 8, sidebarY + 116);

        ctx.fillStyle = '#22c55e';
        ctx.fillText(`Energy: ${this.p2Energy}/${this.p2MaxEnergy || 10}`, sidebarX + 8, sidebarY + 130);

        ctx.restore();

        // Turn indicators - stylized badges
        const badgeW = 60;
        const badgeH = 22;

        // P2 indicator (top left)
        const p2Active = !this.isPlayer1Turn;
        const p2BadgeX = 3;
        const p2BadgeY = 45;

        ctx.save();
        if (p2Active) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
        }
        Draw.roundRect(ctx, p2BadgeX, p2BadgeY, badgeW, badgeH, 4);
        ctx.fillStyle = p2Active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(30, 30, 40, 0.5)';
        ctx.fill();
        ctx.strokeStyle = p2Active ? '#ef4444' : '#444';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = p2Active ? '#ef4444' : '#555';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CRYSTAL', p2BadgeX + badgeW / 2, p2BadgeY + badgeH / 2);
        ctx.restore();

        // P1 indicator (bottom left)
        const p1Active = this.isPlayer1Turn;
        const p1BadgeX = 3;
        const p1BadgeY = engine.height - badgeH - 45;

        ctx.save();
        if (p1Active) {
            ctx.shadowColor = '#4ecdc4';
            ctx.shadowBlur = 8;
        }
        Draw.roundRect(ctx, p1BadgeX, p1BadgeY, badgeW, badgeH, 4);
        ctx.fillStyle = p1Active ? 'rgba(78, 205, 196, 0.3)' : 'rgba(30, 30, 40, 0.5)';
        ctx.fill();
        ctx.strokeStyle = p1Active ? '#4ecdc4' : '#444';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = p1Active ? '#4ecdc4' : '#555';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TERRAN', p1BadgeX + badgeW / 2, p1BadgeY + badgeH / 2);
        ctx.restore();

        // Turn counter (center left, vertical)
        ctx.save();
        ctx.font = '7px PixelFont, monospace';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TURN', 33, engine.height / 2 - 8);
        ctx.font = '12px PixelFont, monospace';
        ctx.fillStyle = '#888';
        ctx.fillText(this.turn.toString(), 33, engine.height / 2 + 6);
        ctx.restore();

        // Add Gate button (stylized)
        const btnX = this.boardX + this.boardW - 85;
        const btnY = this.isPlayer1Turn ? engine.height - 55 : 50;
        const btnW = 75;
        const btnH = 28;
        const btnHover = engine.mouse.x >= btnX && engine.mouse.x <= btnX + btnW &&
                        engine.mouse.y >= btnY && engine.mouse.y <= btnY + btnH;

        if (!this.gateActionUsed) {
            ctx.save();
            if (btnHover) {
                ctx.shadowColor = '#4ecdc4';
                ctx.shadowBlur = 10;
            }

            const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
            btnGrad.addColorStop(0, btnHover ? '#3a7a7a' : '#2a5a5a');
            btnGrad.addColorStop(1, btnHover ? '#1a4a4a' : '#1a3a3a');

            Draw.roundRect(ctx, btnX, btnY, btnW, btnH, 6);
            ctx.fillStyle = btnGrad;
            ctx.fill();

            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = btnHover ? 2 : 1;
            ctx.stroke();

            // Inner highlight
            ctx.strokeStyle = 'rgba(102, 255, 240, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(btnX + 10, btnY + 3);
            ctx.lineTo(btnX + btnW - 10, btnY + 3);
            ctx.stroke();

            ctx.font = '8px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+ GATE', btnX + btnW / 2, btnY + btnH / 2);

            ctx.restore();

            if (engine.mouse.clicked && btnHover) {
                this.addGate();
            }

            // Gate action hint (subtle)
            ctx.font = '6px PixelFont, monospace';
            ctx.fillStyle = '#555';
            ctx.textAlign = 'center';
            const hintY = this.isPlayer1Turn ? engine.height - 62 : 82;
            ctx.fillText('Click gate to upgrade', this.boardX + this.boardW / 2, hintY);
        }

        // End Turn button (stylized) - only show for player 1's turn
        if (this.isPlayer1Turn) {
            const endX = this.boardX + 70;
            const endY = engine.height - 55;
            const endW = 85;
            const endH = 28;
            const endHover = engine.mouse.x >= endX && engine.mouse.x <= endX + endW &&
                            engine.mouse.y >= endY && engine.mouse.y <= endY + endH;

            ctx.save();
            if (endHover) {
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 10;
            }

            const endGrad = ctx.createLinearGradient(endX, endY, endX, endY + endH);
            endGrad.addColorStop(0, endHover ? '#2a6a3e' : '#1a4a2e');
            endGrad.addColorStop(1, endHover ? '#1a4a2e' : '#0a2a1a');

            Draw.roundRect(ctx, endX, endY, endW, endH, 6);
            ctx.fillStyle = endGrad;
            ctx.fill();

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = endHover ? 2 : 1;
            ctx.stroke();

            // Inner highlight
            ctx.strokeStyle = 'rgba(74, 222, 128, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(endX + 10, endY + 3);
            ctx.lineTo(endX + endW - 10, endY + 3);
            ctx.stroke();

            ctx.font = '9px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('END TURN', endX + endW / 2, endY + endH / 2);

            ctx.restore();

            if (engine.mouse.clicked && endHover) {
                this.endTurn();
            }
        }

        // Render hands
        this._renderHand(ctx, engine, this.p1Hand, true);
        this._renderHand(ctx, engine, this.p2Hand, false);

        // Render event animations (above battlefield cards)
        this.eventAnimations.forEach(e => e.render(ctx));

        // Render hovered card preview (on top of everything)
        if (this.hoveredCard) {
            this._renderCardPreview(ctx, engine);
        }

        // Gate selection mode overlay
        if (this.selectingGate) {
            // Dim the rest of the screen slightly
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, engine.width, engine.height);

            // Selection message box
            const msgW = 300;
            const msgH = 60;
            const msgX = engine.width / 2 - msgW / 2;
            const msgY = engine.height / 2 - msgH / 2;

            ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
            Draw.roundRect(ctx, msgX, msgY, msgW, msgH, 8);
            ctx.fill();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#22c55e';
            ctx.textAlign = 'center';
            ctx.fillText(this.message, engine.width / 2, msgY + 22);

            ctx.font = '9px PixelFont, monospace';
            ctx.fillStyle = '#888';
            ctx.fillText('Right-click or click elsewhere to cancel', engine.width / 2, msgY + 42);
        }

        // Combat selection mode overlay
        if (this.inCombatSelection && this.combatAttackers.length > 0) {
            // Combat info box at top
            const msgW = 400;
            const msgH = 70;
            const msgX = engine.width / 2 - msgW / 2;
            const msgY = 100;

            ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
            Draw.roundRect(ctx, msgX, msgY, msgW, msgH, 8);
            ctx.fill();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Calculate total attack power
            let totalPower = 0;
            for (const a of this.combatAttackers) {
                totalPower += this.getEffectiveAttack(a);
            }

            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.fillText(`COMBAT: ${this.combatAttackers.length} attacker(s) - Total Power: ${totalPower}`, engine.width / 2, msgY + 22);

            ctx.font = '9px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText('Click friendly units to add/remove from attack', engine.width / 2, msgY + 40);

            ctx.fillStyle = '#888';
            ctx.fillText('Click enemy to attack | Right-click generator to garrison | Right-click to cancel', engine.width / 2, msgY + 56);
        }

        // Event card targeting mode UI (Orbital Bombardment, etc.)
        if (this.eventCard) {
            // Highlight valid targets (enemy ground units)
            const enemyPlanet = this.eventIsPlayer1 ? this.p2Planet : this.p1Planet;
            for (const card of enemyPlanet) {
                const highlightColor = card.hovered ? '#ef4444' : '#ff6b6b';
                ctx.save();
                ctx.strokeStyle = highlightColor;
                ctx.lineWidth = card.hovered ? 4 : 2;
                ctx.shadowColor = highlightColor;
                ctx.shadowBlur = card.hovered ? 15 : 8;
                ctx.beginPath();
                const scale = card.baseScale * (card.hovered ? 1.15 : 1);
                const w = CARD_WIDTH * scale;
                const h = CARD_HEIGHT * scale;
                ctx.rect(card.x - w/2, card.y - h/2, w, h);
                ctx.stroke();
                ctx.restore();
            }

            // Show the event card on the left side
            const cardScale = 1.5;
            const cardW = CARD_WIDTH * cardScale;
            const cardH = CARD_HEIGHT * cardScale;
            const cardX = 80;
            const cardY = engine.height / 2;

            ctx.save();
            ctx.translate(cardX, cardY);

            // Card background
            const typeColor = this._getTypeColor(this.eventCard.type);
            const gradient = ctx.createLinearGradient(-cardW/2, -cardH/2, cardW/2, cardH/2);
            gradient.addColorStop(0, '#1a2a3a');
            gradient.addColorStop(1, '#050508');

            Draw.roundRect(ctx, -cardW/2, -cardH/2, cardW, cardH, 10);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = typeColor;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Glow effect
            ctx.shadowColor = typeColor;
            ctx.shadowBlur = 20;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Card name
            ctx.font = '14px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(this.eventCard.name || 'Event', 0, -cardH/2 + 30);

            // Ability text
            const ability = this.eventCard.ability || this.eventCard.effect || '';
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#ccc';
            const words = ability.split(' ');
            let lines = [];
            let currentLine = '';
            for (const word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                if (ctx.measureText(testLine).width > cardW - 20 && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
            lines.slice(0, 4).forEach((line, i) => {
                ctx.fillText(line, 0, -20 + i * 16);
            });

            ctx.restore();

            // Targeting instructions
            ctx.font = '14px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.fillText('SELECT TARGET GROUND UNIT', engine.width / 2, 40);
            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#888';
            ctx.fillText('Click enemy ground unit to target | Right-click to cancel', engine.width / 2, 60);
        }

        // Message (when not in selection mode)
        if (!this.selectingGate && !this.inCombatSelection && this.messageTimer > 0 && this.message) {
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

        // Enlarged card view (right-click inspection, 700-1000% scale)
        if (this.enlargedCard) {
            // Dim background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, engine.width, engine.height);

            const cardData = this.enlargedCard.data || this.enlargedCard;
            const scale = 3; // 300% scale
            const cardW = CARD_WIDTH * scale;
            const cardH = CARD_HEIGHT * scale;
            const centerX = engine.width / 2;
            const centerY = engine.height / 2;

            ctx.save();
            ctx.translate(centerX, centerY);

            // Card background gradient (no shadow effects)
            const typeColor = this._getTypeColor(cardData.type);
            const gradient = ctx.createLinearGradient(-cardW/2, -cardH/2, cardW/2, cardH/2);
            gradient.addColorStop(0, '#1a2a3a');
            gradient.addColorStop(1, '#050508');
            Draw.roundRect(ctx, -cardW/2, -cardH/2, cardW, cardH, 20);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Border
            ctx.strokeStyle = typeColor;
            ctx.lineWidth = 6;
            ctx.stroke();

            // Type bar at top
            ctx.fillStyle = typeColor;
            ctx.fillRect(-cardW/2 + 20, -cardH/2 + 20, cardW - 40, 80);

            // Cost orb
            if (cardData.cost !== undefined) {
                const orbR = 50;
                const orbX = -cardW/2 + 70;
                const orbY = -cardH/2 + 60;

                const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
                orbGrad.addColorStop(0, '#fde047');
                orbGrad.addColorStop(1, '#ca8a04');

                ctx.beginPath();
                ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
                ctx.fillStyle = orbGrad;
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
                ctx.stroke();

                ctx.font = '40px PixelFont, monospace';
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cardData.cost.toString(), orbX, orbY);
            }

            // Type text
            ctx.font = '24px PixelFont, monospace';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const typeLabel = (cardData.type || 'UNKNOWN').toUpperCase().replace('_', ' ');
            ctx.fillText(typeLabel, 50, -cardH/2 + 60);

            // Card name
            ctx.font = '36px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(cardData.name || 'UNKNOWN', 0, -cardH/2 + 140);

            // Art placeholder area
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(-cardW/2 + 40, -cardH/2 + 180, cardW - 80, cardH * 0.4);
            ctx.strokeStyle = typeColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(-cardW/2 + 40, -cardH/2 + 180, cardW - 80, cardH * 0.4);

            // Faction icon/text in art area
            ctx.font = '60px PixelFont, monospace';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('☆', 0, -cardH/2 + 180 + cardH * 0.2);

            // Stats bar (power/defense)
            if (cardData.power !== undefined || cardData.defense !== undefined) {
                const statY = -cardH/2 + 180 + cardH * 0.4 + 30;

                // Power (attack)
                if (cardData.power !== undefined) {
                    ctx.font = '32px PixelFont, monospace';
                    ctx.fillStyle = '#ef4444';
                    ctx.textAlign = 'left';
                    ctx.fillText(`⚔ ${cardData.power}`, -cardW/2 + 60, statY);
                }

                // Defense - show current toughness if this is a battlefield card with buffs
                if (cardData.defense !== undefined) {
                    ctx.font = '32px PixelFont, monospace';
                    const isBattlefieldCard = this.enlargedCard.toughness !== undefined;
                    const defenseValue = isBattlefieldCard ? this.enlargedCard.toughness : cardData.defense;
                    const isBuffed = isBattlefieldCard && this.enlargedCard.defenseBuffed;
                    ctx.fillStyle = isBuffed ? '#22c55e' : '#3b82f6';
                    ctx.textAlign = 'right';
                    ctx.fillText(`${defenseValue} ⛊`, cardW/2 - 60, statY);
                }
            }

            // Ability text
            if (cardData.ability) {
                ctx.font = '20px PixelFont, monospace';
                ctx.fillStyle = '#ccc';
                ctx.textAlign = 'center';

                const words = cardData.ability.split(' ');
                const maxWidth = cardW - 100;
                let lines = [];
                let currentLine = '';

                for (const word of words) {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine) lines.push(currentLine);

                const startY = cardH/2 - 200;
                lines.slice(0, 6).forEach((line, i) => {
                    ctx.fillText(line, 0, startY + i * 32);
                });
            }

            ctx.restore();

            // Instructions
            ctx.font = '14px PixelFont, monospace';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('Click anywhere to close', engine.width / 2, engine.height - 30);
        }

        // Graveyard view overlay
        if (this.viewingGraveyard) {
            const graveyard = this.viewingGraveyard === 'p1' ? this.p1Graveyard : this.p2Graveyard;
            const cards = graveyard.cards;
            const isP1 = this.viewingGraveyard === 'p1';

            // Dim background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, engine.width, engine.height);

            // Title
            ctx.font = '16px PixelFont, monospace';
            ctx.fillStyle = isP1 ? '#4ecdc4' : '#a855f7';
            ctx.textAlign = 'center';
            ctx.fillText(`${isP1 ? 'PLAYER 1' : 'PLAYER 2'} GRAVEYARD (${cards.length} cards)`, engine.width / 2, 40);

            // Render cards in rows
            const cardW = 100;
            const cardH = 140;
            const padding = 15;
            const cardsPerRow = Math.floor((engine.width - 100) / (cardW + padding));
            const startX = (engine.width - (Math.min(cards.length, cardsPerRow) * (cardW + padding) - padding)) / 2;
            const startY = 80;

            cards.forEach((card, i) => {
                const row = Math.floor(i / cardsPerRow);
                const col = i % cardsPerRow;
                const x = startX + col * (cardW + padding);
                const y = startY + row * (cardH + padding);

                ctx.save();
                ctx.translate(x + cardW / 2, y + cardH / 2);

                // Card background
                const typeColor = this._getTypeColor(card.type);
                const gradient = ctx.createLinearGradient(-cardW/2, -cardH/2, cardW/2, cardH/2);
                gradient.addColorStop(0, '#1a2a3a');
                gradient.addColorStop(1, '#050508');

                Draw.roundRect(ctx, -cardW/2, -cardH/2, cardW, cardH, 6);
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.strokeStyle = typeColor;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Type bar
                ctx.fillStyle = typeColor;
                ctx.fillRect(-cardW/2 + 4, -cardH/2 + 4, cardW - 8, 16);

                // Cost orb
                if (card.cost !== undefined) {
                    const orbR = 10;
                    const orbX = -cardW/2 + 12;
                    const orbY = -cardH/2 + 12;
                    ctx.beginPath();
                    ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
                    ctx.fillStyle = '#ca8a04';
                    ctx.fill();
                    ctx.font = '8px PixelFont, monospace';
                    ctx.fillStyle = '#000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(card.cost.toString(), orbX, orbY);
                }

                // Card name
                ctx.font = '7px PixelFont, monospace';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                let name = card.name || 'UNKNOWN';
                if (name.length > 14) name = name.substring(0, 12) + '..';
                ctx.fillText(name, 0, -cardH/2 + 24);

                // Stats
                if (card.stats?.attack !== undefined) {
                    ctx.font = '8px PixelFont, monospace';
                    ctx.fillStyle = '#ef4444';
                    ctx.textAlign = 'left';
                    ctx.fillText(`${card.stats.attack}`, -cardW/2 + 6, cardH/2 - 12);
                    ctx.fillStyle = '#3b82f6';
                    ctx.textAlign = 'right';
                    ctx.fillText(`${card.stats.defense || 1}`, cardW/2 - 6, cardH/2 - 12);
                }

                ctx.restore();
            });

            // Instructions
            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('Click anywhere to close', engine.width / 2, engine.height - 30);
        }

        // Game Over overlay with restart button
        if (this.gameOver && this.winner) {
            // Dim background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, engine.width, engine.height);

            // Winner text
            ctx.font = '32px PixelFont, monospace';
            ctx.fillStyle = this.winner === 'Player 1' ? '#4ecdc4' : '#a855f7';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${this.winner} WINS!`, engine.width / 2, engine.height / 2 - 60);

            ctx.font = '16px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('Planetary Consciousness achieved!', engine.width / 2, engine.height / 2 - 20);

            // Restart button
            const btnW = 150;
            const btnH = 40;
            const btnX = engine.width / 2 - btnW / 2;
            const btnY = engine.height / 2 + 30;
            const btnHover = engine.mouse.x >= btnX && engine.mouse.x <= btnX + btnW &&
                            engine.mouse.y >= btnY && engine.mouse.y <= btnY + btnH;

            ctx.save();
            if (btnHover) {
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 15;
            }

            const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
            btnGrad.addColorStop(0, btnHover ? '#2a6a3e' : '#1a4a2e');
            btnGrad.addColorStop(1, btnHover ? '#1a4a2e' : '#0a2a1a');

            Draw.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
            ctx.fillStyle = btnGrad;
            ctx.fill();

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = btnHover ? 3 : 2;
            ctx.stroke();

            ctx.font = '14px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('NEW GAME', btnX + btnW / 2, btnY + btnH / 2);

            ctx.restore();

            // Handle restart click
            if (engine.mouse.clicked && btnHover) {
                this.resetGame();
            }
        }
    }

    _renderHand(ctx, engine, hand, isPlayer1) {
        if (hand.length === 0) return;

        // Arena-style fan layout
        const cardW = 90;
        const cardH = 130;
        const centerX = this.boardX + this.boardW / 2;
        const baseY = isPlayer1 ? engine.height + 20 : -20;
        const arcRadius = 400; // Arc curve radius
        const maxSpread = Math.min(hand.length * 0.08, 0.5); // Max angle spread in radians

        // Faction colors
        const color = isPlayer1 ? '#4ecdc4' : '#a855f7';
        const isMyTurn = (isPlayer1 && this.isPlayer1Turn) || (!isPlayer1 && !this.isPlayer1Turn);
        const isMyHand = (isPlayer1 && this.isPlayer1Turn) || (!isPlayer1 && !this.isPlayer1Turn);

        // Calculate positions for each card in the fan
        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];

            // Skip if this card is being dragged
            if (this.draggingHandCard === card) continue;

            const t = hand.length === 1 ? 0 : (i / (hand.length - 1)) - 0.5; // -0.5 to 0.5
            const angle = t * maxSpread * (isPlayer1 ? 1 : -1);
            const popOut = (isMyHand && this.hoveredHandIndex === i && (isPlayer1 ? this.isPlayer1Turn : !this.isPlayer1Turn)) ? 60 : 0;

            // Position along arc
            const cardX = centerX + Math.sin(angle) * arcRadius;
            const cardY = baseY + (isPlayer1 ? -Math.cos(angle) * 80 - popOut : Math.cos(angle) * 80 + popOut);
            const rotation = angle * 0.6;

            const cost = card.cost || 0;
            const canPlay = isMyTurn && this.findAvailableGate(cost, isPlayer1);
            const isHovered = this.hoveredHandIndex === i && isMyHand;

            ctx.save();
            ctx.translate(cardX, cardY);
            ctx.rotate(rotation);

            // Card shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = isHovered ? 20 : 8;
            ctx.shadowOffsetY = isHovered ? 8 : 4;

            // Card background
            const typeColor = this._getTypeColor(card.type);
            const gradient = ctx.createLinearGradient(-cardW/2, -cardH/2, cardW/2, cardH/2);
            if (isHovered && canPlay) {
                gradient.addColorStop(0, '#1a4a2e');
                gradient.addColorStop(1, '#0a2a1a');
            } else {
                gradient.addColorStop(0, '#1a2a3a');
                gradient.addColorStop(1, '#050508');
            }

            Draw.roundRect(ctx, -cardW/2, -cardH/2, cardW, cardH, 8);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.shadowBlur = 0;

            // Border
            ctx.strokeStyle = canPlay ? '#22c55e' : (isHovered ? '#fff' : typeColor);
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.stroke();

            // Type bar at top
            ctx.fillStyle = typeColor;
            ctx.fillRect(-cardW/2 + 4, -cardH/2 + 4, cardW - 8, 18);

            // Cost orb
            if (card.cost !== undefined) {
                const orbR = 12;
                const orbX = -cardW/2 + 14;
                const orbY = -cardH/2 + 13;

                const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
                orbGrad.addColorStop(0, canPlay ? '#4ade80' : '#fde047');
                orbGrad.addColorStop(1, canPlay ? '#16a34a' : '#ca8a04');

                ctx.beginPath();
                ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
                ctx.fillStyle = orbGrad;
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.font = '10px PixelFont, monospace';
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(card.cost.toString(), orbX, orbY);
            }

            // Type label
            ctx.font = '6px PixelFont, monospace';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            const typeLabel = (card.type || '').toUpperCase().replace('_', ' ').substring(0, 10);
            ctx.fillText(typeLabel, 10, -cardH/2 + 13);

            // Card name
            ctx.font = '8px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            let name = card.name || 'UNKNOWN';
            if (name.length > 12) name = name.substring(0, 10) + '..';
            ctx.fillText(name, 0, -cardH/2 + 32);

            // Art placeholder area
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(-cardW/2 + 6, -cardH/2 + 40, cardW - 12, 45);

            // Stats (power/defense)
            if (card.power !== undefined || card.defense !== undefined) {
                ctx.font = '9px PixelFont, monospace';
                if (card.power !== undefined) {
                    ctx.fillStyle = '#ef4444';
                    ctx.textAlign = 'left';
                    ctx.fillText(`${card.power}`, -cardW/2 + 8, cardH/2 - 10);
                }
                if (card.defense !== undefined) {
                    ctx.fillStyle = '#3b82f6';
                    ctx.textAlign = 'right';
                    ctx.fillText(`${card.defense}`, cardW/2 - 8, cardH/2 - 10);
                }
            }

            // Ability preview (first line)
            if (card.ability) {
                ctx.font = '5px PixelFont, monospace';
                ctx.fillStyle = '#888';
                ctx.textAlign = 'center';
                const abilityPreview = card.ability.substring(0, 25) + (card.ability.length > 25 ? '..' : '');
                ctx.fillText(abilityPreview, 0, -cardH/2 + 95);
            }

            // Playable indicator
            if (isHovered && canPlay) {
                ctx.font = '7px PixelFont, monospace';
                ctx.fillStyle = '#22c55e';
                ctx.textAlign = 'center';
                ctx.fillText('DRAG TO PLAY', 0, cardH/2 - 25);
            }

            ctx.restore();
        }

        // Render dragged hand card on top
        if (this.draggingHandCard && this.draggingHandCardIsPlayer1 === isPlayer1) {
            this._renderDraggedHandCard(ctx, engine);
        }
    }

    _renderDraggedHandCard(ctx, engine) {
        const card = this.draggingHandCard;
        if (!card) return;

        // Calculate scale based on Y position - shrink as it approaches battlefield
        const handY = this.draggingHandCardIsPlayer1 ? engine.height : 0;
        const targetY = this.midY;
        const progress = Math.abs(this.handCardDragY - handY) / Math.abs(targetY - handY);
        const scale = Math.max(0.4, 1 - progress * 0.6); // Scale from 1.0 to 0.4

        const cardW = 90 * scale;
        const cardH = 130 * scale;
        const cost = card.cost || 0;
        const canPlay = this.findAvailableGate(cost, this.draggingHandCardIsPlayer1);
        const typeColor = this._getTypeColor(card.type);

        ctx.save();
        ctx.translate(this.handCardDragX, this.handCardDragY);

        // Glow effect if playable
        if (canPlay) {
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 15;
        }

        // Card background
        const gradient = ctx.createLinearGradient(-cardW/2, -cardH/2, cardW/2, cardH/2);
        gradient.addColorStop(0, canPlay ? '#1a4a2e' : '#1a2a3a');
        gradient.addColorStop(1, '#050508');

        Draw.roundRect(ctx, -cardW/2, -cardH/2, cardW, cardH, 8 * scale);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = canPlay ? '#22c55e' : typeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Type bar
        ctx.fillStyle = typeColor;
        ctx.fillRect(-cardW/2 + 4 * scale, -cardH/2 + 4 * scale, cardW - 8 * scale, 18 * scale);

        // Cost orb
        if (card.cost !== undefined) {
            const orbR = 12 * scale;
            const orbX = -cardW/2 + 14 * scale;
            const orbY = -cardH/2 + 13 * scale;

            const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
            orbGrad.addColorStop(0, canPlay ? '#4ade80' : '#fde047');
            orbGrad.addColorStop(1, canPlay ? '#16a34a' : '#ca8a04');

            ctx.beginPath();
            ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
            ctx.fillStyle = orbGrad;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5 * scale;
            ctx.stroke();

            ctx.font = `${10 * scale}px PixelFont, monospace`;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(card.cost.toString(), orbX, orbY);
        }

        // Card name
        ctx.font = `${8 * scale}px PixelFont, monospace`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        let name = card.name || 'UNKNOWN';
        if (name.length > 12) name = name.substring(0, 10) + '..';
        ctx.fillText(name, 0, -cardH/2 + 32 * scale);

        ctx.restore();
    }

    _renderCardPreview(ctx, engine) {
        const card = this.hoveredCard;
        const pos = this.hoveredCardPos;

        // Card dimensions for preview (larger, more readable)
        const cardW = 200;
        const cardH = 280;

        // Position the card above/below the hand
        let x = pos.x - cardW / 2;
        let y = pos.isPlayer1 ? pos.y - cardH - 10 : pos.y + 10;

        // Keep on screen
        x = Math.max(10, Math.min(x, engine.width - cardW - 10));
        y = Math.max(10, Math.min(y, engine.height - cardH - 10));

        const color = pos.isPlayer1 ? '#4ecdc4' : '#a855f7';
        const accent = pos.isPlayer1 ? '#66fff0' : '#c084fc';
        const isMyTurn = (pos.isPlayer1 && this.isPlayer1Turn) || (!pos.isPlayer1 && !this.isPlayer1Turn);
        const cost = card.cost || 0;
        const canPlay = isMyTurn && this.findAvailableGate(cost, pos.isPlayer1);

        ctx.save();

        // Outer glow
        ctx.shadowColor = canPlay ? 'rgba(34, 197, 94, 0.6)' : `${color}66`;
        ctx.shadowBlur = 25;

        // Card background
        const gradient = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
        gradient.addColorStop(0, pos.isPlayer1 ? '#1a3a4a' : '#2a1a3a');
        gradient.addColorStop(0.5, pos.isPlayer1 ? '#0d2530' : '#180d20');
        gradient.addColorStop(1, '#050508');
        Draw.roundRect(ctx, x, y, cardW, cardH, 10);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Outer border
        ctx.strokeStyle = canPlay ? '#22c55e' : color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner border
        ctx.strokeStyle = `${accent}44`;
        ctx.lineWidth = 1;
        Draw.roundRect(ctx, x + 4, y + 4, cardW - 8, cardH - 8, 7);
        ctx.stroke();

        // Type bar at top
        const typeColor = this._getPreviewTypeColor(card.type);
        ctx.fillStyle = typeColor;
        ctx.fillRect(x + 6, y + 6, cardW - 12, 24);

        // Cost orb (top left, overlapping type bar)
        if (card.cost !== undefined) {
            const orbX = x + 20;
            const orbY = y + 18;
            const orbR = 14;

            const orbGrad = ctx.createRadialGradient(orbX - 3, orbY - 3, 0, orbX, orbY, orbR);
            orbGrad.addColorStop(0, canPlay ? '#4ade80' : '#fde047');
            orbGrad.addColorStop(1, canPlay ? '#16a34a' : '#ca8a04');

            ctx.beginPath();
            ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
            ctx.fillStyle = orbGrad;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(card.cost.toString(), orbX, orbY + 1);
        }

        // Type text
        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const typeStr = (card.type || 'unknown').replace(/_/g, ' ').toUpperCase();
        ctx.fillText(typeStr, x + cardW / 2 + 10, y + 18);

        // Name
        ctx.font = '12px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(card.name, x + cardW / 2, y + 36);

        // Art placeholder area
        const artY = y + 54;
        const artH = 60;
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(x + 8, artY, cardW - 16, artH);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 8, artY, cardW - 16, artH);

        // Art description text
        if (card.art) {
            ctx.font = '6px PixelFont, monospace';
            ctx.fillStyle = '#444';
            ctx.textAlign = 'center';
            const artDesc = card.art.length > 30 ? card.art.substring(0, 28) + '..' : card.art;
            ctx.fillText(artDesc, x + cardW / 2, artY + artH / 2);
        }

        // Stats box
        if (card.stats) {
            const statsY = artY + artH + 8;
            const statsH = 32;

            // Stats background
            const statsBg = ctx.createLinearGradient(x + 8, statsY, x + cardW - 8, statsY);
            statsBg.addColorStop(0, 'rgba(0,0,0,0.5)');
            statsBg.addColorStop(0.5, 'rgba(30,30,40,0.5)');
            statsBg.addColorStop(1, 'rgba(0,0,0,0.5)');
            ctx.fillStyle = statsBg;
            ctx.fillRect(x + 8, statsY, cardW - 16, statsH);
            ctx.strokeStyle = `${color}33`;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 8, statsY, cardW - 16, statsH);

            ctx.font = '8px PixelFont, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let statsText = [];
            if (card.stats.attack !== undefined) statsText.push(`ATK:${card.stats.attack}`);
            if (card.stats.defense !== undefined) statsText.push(`DEF:${card.stats.defense}`);
            if (card.stats.speed !== undefined) statsText.push(`SPD:${card.stats.speed}`);
            if (card.stats.scan !== undefined) statsText.push(`SCN:${card.stats.scan}`);
            if (card.stats.science !== undefined) statsText.push(`SCI:${card.stats.science}`);

            ctx.fillStyle = accent;
            ctx.fillText(statsText.join('  '), x + cardW / 2, statsY + 10);

            // Additional stats row
            let extraStats = [];
            if (card.stats.range !== undefined) extraStats.push(`RNG:${card.stats.range}`);
            if (card.stats.mining !== undefined) extraStats.push(`MIN:${card.stats.mining}`);
            if (extraStats.length > 0) {
                ctx.fillStyle = '#60a5fa';
                ctx.fillText(extraStats.join('  '), x + cardW / 2, statsY + 24);
            }
        }

        // Ability text box
        const abilityY = card.stats ? artY + artH + 48 : artY + artH + 10;
        const abilityH = 70;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 8, abilityY, cardW - 16, abilityH);

        if (card.ability) {
            ctx.font = '7px PixelFont, monospace';
            ctx.fillStyle = '#ccc';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // Word wrap ability text
            const words = card.ability.split(' ');
            const maxWidth = cardW - 28;
            let lines = [];
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);

            lines.slice(0, 5).forEach((line, i) => {
                ctx.fillText(line, x + 14, abilityY + 6 + i * 12);
            });
        }

        // Special text
        if (card.special) {
            ctx.font = '6px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('★ SPECIAL ★', x + cardW / 2, y + cardH - 28);
            ctx.fillStyle = '#aaa';
            const specialTrunc = card.special.length > 45 ? card.special.substring(0, 43) + '..' : card.special;
            ctx.fillText(specialTrunc, x + cardW / 2, y + cardH - 16);
        }

        // Equip target
        if (card.equipTarget) {
            ctx.font = '6px PixelFont, monospace';
            ctx.fillStyle = '#60a5fa';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`⚡ EQUIP: ${card.equipTarget}`, x + cardW / 2, y + cardH - 6);
        }

        // Power/Toughness badge (bottom right corner, MTG style)
        if (card.stats?.attack !== undefined && card.stats?.defense !== undefined) {
            const ptW = 36;
            const ptH = 20;
            const ptX = x + cardW - ptW - 8;
            const ptY = y + cardH - ptH - 8;

            const ptGrad = ctx.createLinearGradient(ptX, ptY, ptX + ptW, ptY + ptH);
            ptGrad.addColorStop(0, pos.isPlayer1 ? '#1a3a4a' : '#2a1a3a');
            ptGrad.addColorStop(1, '#0a0a15');

            Draw.roundRect(ctx, ptX, ptY, ptW, ptH, 4);
            ctx.fillStyle = ptGrad;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = '10px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${card.stats.attack}/${card.stats.defense}`, ptX + ptW / 2, ptY + ptH / 2 + 1);
        }

        // Playable indicator
        if (canPlay) {
            ctx.font = '7px PixelFont, monospace';
            ctx.fillStyle = '#22c55e';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText('▶ CLICK TO PLAY', x + 10, y + cardH - 6);
        }

        ctx.restore();
    }

    _getPreviewTypeColor(type) {
        const t = (type || '').toLowerCase();
        if (t.includes('capital')) return '#ef4444';
        if (t.includes('scout') || t.includes('support') || t.includes('science')) return '#60a5fa';
        if (t.includes('mining')) return '#fbbf24';
        if (t.includes('station')) return '#a855f7';
        if (t.includes('surface')) return '#22c55e';
        if (t.includes('structure')) return '#fbbf24';
        if (t.includes('event')) return '#f97316';
        if (t.includes('equipment') || t.includes('upgrade') || t.includes('weapon')) return '#06b6d4';
        if (t.includes('artifact')) return '#ec4899';
        return '#666';
    }

    // Check if a card is a carrier that can deploy tokens
    isCarrier(card) {
        const name = (card.data?.name || '').toLowerCase();
        const ability = (card.data?.ability || '').toLowerCase();
        return name.includes('carrier') && (ability.includes('deploy') || ability.includes('scout'));
    }

    // Check if carrier can deploy this turn (not tapped, not summoning sick)
    canDeployToken(card) {
        if (!this.isCarrier(card)) return false;
        if (card.tapped || card.summoningSickness) return false;
        // Check if already deployed this turn
        if (card.deployedThisTurn) return false;
        return true;
    }

    // Deploy tokens from a carrier
    deployTokens(carrier, isPlayer1) {
        if (!this.canDeployToken(carrier)) {
            this.showMessage('Cannot deploy tokens!');
            return false;
        }

        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const name = (carrier.data?.name || '').toLowerCase();

        // Determine what tokens to deploy
        let tokenData;
        let tokenCount = 1;

        if (name.includes('liberator')) {
            // Liberator Carrier deploys 2 Scout Ships
            tokenData = {
                name: 'Scout Ship',
                type: 'scout_ship',
                cost: 0,
                stats: { attack: 1, defense: 1, speed: 2 },
                ability: 'Deployed from Liberator Carrier.',
                art: 'Small Terran reconnaissance craft'
            };
            tokenCount = 2;
        } else if (name.includes('crystalline')) {
            // Crystalline Carrier deploys Crystal Shard Scouts
            tokenData = {
                name: 'Crystal Shard Scout',
                type: 'scout_ship',
                cost: 0,
                stats: { attack: 1, defense: 1, speed: 3 },
                ability: 'Deployed from Crystalline Carrier.',
                art: 'Small crystalline scout formation'
            };
            tokenCount = 1;
        } else {
            this.showMessage('Unknown carrier type!');
            return false;
        }

        // Deploy the tokens
        for (let i = 0; i < tokenCount; i++) {
            const token = new BattlefieldCard(tokenData, carrier.x, carrier.y, isPlayer1);
            token.summoningSickness = true;
            orbit.push(token);
        }

        // Mark carrier as having deployed this turn
        carrier.deployedThisTurn = true;

        this._layoutOrbit(isPlayer1);
        this.showMessage(`${carrier.data.name} deployed ${tokenCount} ${tokenData.name}${tokenCount > 1 ? 's' : ''}!`);

        return true;
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
            this.showMessage(`${defender.data.name} reflects ${reflectedDamage} damage!`);
        }

        this.showMessage(`${attacker.data.name} attacks ${defender.data.name}!`);
        this._checkUnitDeaths();

        // Handle double attack
        if (this.hasDoubleAttack(attacker) && !attacker.attackedTwice) {
            attacker.attackedTwice = true;
            return true; // Can attack again
        }

        return false; // Attack finished
    }

    // Apply Crystal Monolith growing defense at start of turn
    applyMonolithGrowth() {
        const monoliths = [...this.p1Planet, ...this.p2Planet, ...this.p1Orbit, ...this.p2Orbit]
            .filter(c => (c.data?.name || '').toLowerCase().includes('crystal monolith'));

        for (const monolith of monoliths) {
            monolith.currentToughness += 1;
            monolith.toughness += 1;
        }
    }

    // Reset per-turn flags at end of turn
    resetTurnFlags() {
        const allCards = [...this.p1Orbit, ...this.p2Orbit, ...this.p1Planet, ...this.p2Planet];
        for (const card of allCards) {
            card.deployedThisTurn = false;
            card.attackedTwice = false;
        }
    }

    // Check if card is Survey Team
    isSurveyTeam(card) {
        const name = (card.data?.name || '').toLowerCase();
        return name.includes('survey team');
    }

    // Check if card is Planetary Consciousness Core
    isPlanetaryConsciousness(card) {
        const name = (card.data?.name || '').toLowerCase();
        return name.includes('planetary consciousness');
    }

    // Attempt artifact discovery with Survey Team (10% + 1% per research point)
    attemptArtifactDiscovery(surveyTeam, isPlayer1) {
        surveyTeam.tap();

        // Grant 1 research point for surveying
        this.addResearch(1, isPlayer1);

        // Check if generator already exists
        if (this.planetaryGenerator) {
            this.showMessage('Planetary Shield Generator already discovered!');
            return;
        }

        // Calculate discovery chance (10% base + 1% per research point)
        const chance = this.getDiscoveryChance(isPlayer1);
        const roll = Math.random();

        if (roll < chance) {
            this.spawnPlanetaryGenerator(isPlayer1);
            this.showMessage('DISCOVERY! Planetary Shield Generator found!');
        } else {
            const research = isPlayer1 ? this.p1Research : this.p2Research;
            const messages = [
                `Survey found nothing... (${Math.round(chance * 100)}% chance)`,
                'No artifacts detected in this sector.',
                'Scanning... no significant finds.',
                `The search continues... (Research: ${research})`,
                'Survey complete. No artifacts found.'
            ];
            this.showMessage(messages[Math.floor(Math.random() * messages.length)]);
        }
    }

    // Spawn Planetary Shield Generator in center of board
    spawnPlanetaryGenerator(isPlayer1) {
        const generatorData = {
            name: 'Planetary Shield Generator',
            type: 'structure_planetside',
            cost: 0,
            stats: { attack: 0, defense: 4 },
            ability: 'Garrison units to add their stats. Control with Planetary Consciousness to win. When destroyed, flips to enemy control.',
            art: 'Massive energy projection facility with emitter towers'
        };

        // Spawn in very center of board
        const centerX = this.boardX + this.boardW / 2;
        const centerY = this.midY;

        this.planetaryGenerator = new BattlefieldCard(generatorData, centerX, centerY, isPlayer1);
        this.planetaryGenerator.summoningSickness = false; // Can be interacted with immediately
        this.planetaryGenerator.isGenerator = true;
        this.planetaryGenerator.garrisonedUnits = [];
    }

    // Garrison a unit to the generator
    garrisonToGenerator(unit) {
        if (!this.planetaryGenerator) {
            this.showMessage('No generator to garrison to!');
            return;
        }

        // Must be same owner
        if (unit.isPlayer1 !== this.planetaryGenerator.isPlayer1) {
            this.showMessage('Can only garrison to your own generator!');
            return;
        }

        // Remove unit from planet zone
        const planet = unit.isPlayer1 ? this.p1Planet : this.p2Planet;
        const idx = planet.indexOf(unit);
        if (idx === -1) {
            this.showMessage('Unit not found on planet!');
            return;
        }
        planet.splice(idx, 1);

        // Add unit stats to generator
        this.planetaryGenerator.power += unit.power;
        this.planetaryGenerator.toughness += unit.toughness;
        this.planetaryGenerator.currentToughness += unit.toughness;

        // Track garrisoned units
        this.planetaryGenerator.garrisonedUnits.push(unit.data);

        this._layoutPlanet(unit.isPlayer1);
        this.showMessage(`${unit.data.name} garrisoned! Generator is now ${this.planetaryGenerator.power}/${this.planetaryGenerator.currentToughness}`);
    }

    // Attempt to win with Planetary Consciousness Core
    attemptConsciousnessVictory(isPlayer1) {
        // Must control the generator
        if (!this.planetaryGenerator) {
            this.showMessage('No Planetary Shield Generator discovered yet!');
            return false;
        }

        if (this.planetaryGenerator.isPlayer1 !== isPlayer1) {
            this.showMessage('You do not control the Planetary Shield Generator!');
            return false;
        }

        // Find the Planetary Consciousness card
        const myPlanet = isPlayer1 ? this.p1Planet : this.p2Planet;
        const myOrbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const consciousness = [...myPlanet, ...myOrbit].find(c => this.isPlanetaryConsciousness(c));

        if (!consciousness) {
            this.showMessage('Planetary Consciousness Core not in play!');
            return false;
        }

        if (consciousness.tapped || consciousness.summoningSickness) {
            this.showMessage('Planetary Consciousness Core cannot activate!');
            return false;
        }

        // Victory!
        consciousness.tap();
        this.gameOver = true;
        this.winner = isPlayer1 ? 'Player 1' : 'Player 2';
        this.showMessage(`${this.winner} WINS! Planetary Consciousness achieved!`);
        return true;
    }

    // Reset the game to initial state
    resetGame() {
        // Draw new static cards
        this.planet = pickRandom(planetDeck);
        this.artifact = pickRandom(artifactDeck);
        this.natives = pickRandom(nativesDeck);

        // Reset P1
        this.p1Deck = new Deck(0, 0, true, []);
        this.p1Graveyard = new Graveyard(0, 0, true);
        this.p1Gates = [new Gate(0, 0, true)];
        this.p1Orbit = [];
        this.p1Planet = [];
        this.p1Hand = [];

        // Reset P2
        this.p2Deck = new Deck(0, 0, false, []);
        this.p2Graveyard = new Graveyard(0, 0, false);
        this.p2Gates = [new Gate(0, 0, false)];
        this.p2Orbit = [];
        this.p2Planet = [];
        this.p2Hand = [];

        // Reset all state flags
        this.hoveredCard = null;
        this.hoveredBattlefieldCard = null;
        this.eventAnimations = [];
        this.selectingGate = false;
        this.selectedCardIndex = -1;
        this.equipmentCard = null;
        this.garrisonUnit = null;
        this.planetaryGenerator = null;
        this.combatAttackers = [];
        this.combatTarget = null;
        this.inCombatSelection = false;
        this.p1Research = 0;
        this.p2Research = 0;
        this.p1Energy = 0;
        this.p2Energy = 0;
        this.p1MaxEnergy = 0;
        this.p2MaxEnergy = 0;
        this.eventCard = null;
        this.enlargedCard = null;
        this.viewingGraveyard = null;
        this.draggingCard = null;
        this.draggingHandCard = null;
        this.draggingHandCardIndex = -1;
        this.hoveredHandIndex = -1;
        this.lastHoveredHandIndex = -1;

        // Reset display cards
        this.planetCard = new DisplayCard(0, 0, this.planet, 'PLANET');
        this.artifactCard = new DisplayCard(0, 0, this.artifact, 'ARTIFACT');
        this.nativesCard = new DisplayCard(0, 0, this.natives, 'NATIVES');

        // Reset game state
        this.turn = 1;
        this.isPlayer1Turn = true;
        this.gateActionUsed = false;
        this.gameOver = false;
        this.winner = null;
        this.message = '';
        this.messageTimer = 0;
        this.initialized = false;

        // Reload decks and start fresh
        this._loadDecks();
    }

    // Flip generator control when destroyed
    flipGeneratorControl() {
        if (!this.planetaryGenerator) return;

        const previousOwner = this.planetaryGenerator.isPlayer1;

        // Kill all garrisoned units - send to graveyard
        if (this.planetaryGenerator.garrisonedUnits && this.planetaryGenerator.garrisonedUnits.length > 0) {
            const graveyard = previousOwner ? this.p1Graveyard : this.p2Graveyard;
            for (const unit of this.planetaryGenerator.garrisonedUnits) {
                graveyard.add(unit.data || unit);
            }
            this.showMessage(`${this.planetaryGenerator.garrisonedUnits.length} garrisoned units destroyed!`);
        }

        // Flip ownership
        this.planetaryGenerator.isPlayer1 = !this.planetaryGenerator.isPlayer1;

        // Reset stats to base
        this.planetaryGenerator.power = 0;
        this.planetaryGenerator.toughness = 4;
        this.planetaryGenerator.currentToughness = 4;
        this.planetaryGenerator.damage = 0;
        this.planetaryGenerator.garrisonedUnits = [];

        // Update colors
        this.planetaryGenerator.colors = this.planetaryGenerator.isPlayer1 ? {
            border: '#4ecdc4',
            bg1: '#1a3a4a',
            bg2: '#0a1520',
            accent: '#66fff0'
        } : {
            border: '#a855f7',
            bg1: '#2a1a3a',
            bg2: '#150a1a',
            accent: '#c084fc'
        };

        const newOwner = this.planetaryGenerator.isPlayer1 ? 'Player 1' : 'Player 2';
        this.showMessage(`Generator flipped! ${newOwner} now controls it!`);
    }

    // Check generator death (flips instead of dying)
    checkGeneratorDeath() {
        if (!this.planetaryGenerator) return;

        if (this.planetaryGenerator.currentToughness - this.planetaryGenerator.damage <= 0) {
            this.flipGeneratorControl();
        }
    }

    // Cancel combat selection
    cancelCombatSelection() {
        // Unmark all attackers
        for (const attacker of this.combatAttackers) {
            attacker.isSelectedAttacker = false;
        }
        this.combatAttackers = [];
        this.combatTarget = null;
        this.inCombatSelection = false;
        this.showMessage('Combat cancelled');
    }

    // Add unit to combat stack
    addToCombatStack(unit) {
        if (this.combatAttackers.includes(unit)) {
            // Remove from stack if already in it
            const idx = this.combatAttackers.indexOf(unit);
            this.combatAttackers.splice(idx, 1);
            unit.isSelectedAttacker = false;
            this.showMessage(`${unit.data.name} removed from attack`);
        } else {
            // Add to stack
            this.combatAttackers.push(unit);
            unit.isSelectedAttacker = true;
            this.showMessage(`${unit.data.name} added to attack (${this.combatAttackers.length} attackers)`);
        }
    }

    // Execute combat stack attack
    executeCombatStack(defender) {
        if (this.combatAttackers.length === 0) {
            this.showMessage('No attackers selected!');
            return;
        }

        // Calculate total attacker power
        let totalAttackerPower = 0;
        for (const attacker of this.combatAttackers) {
            totalAttackerPower += this.getEffectiveAttack(attacker);
        }

        // Sort attackers by power (lowest first for defender targeting)
        const sortedAttackers = [...this.combatAttackers].sort((a, b) =>
            this.getEffectiveAttack(a) - this.getEffectiveAttack(b)
        );

        // Defender deals damage to attackers (lowest power first)
        // BUT only if defender can reach them (ground can't counter-attack orbital without anti-air)
        let defenderPower = this.getEffectiveAttack(defender);

        const defenderOnGround = this.p1Planet.includes(defender) || this.p2Planet.includes(defender);

        for (const attacker of sortedAttackers) {
            if (defenderPower <= 0) break;

            // Check if defender can counter-attack this attacker
            const attackerInOrbit = this.p1Orbit.includes(attacker) || this.p2Orbit.includes(attacker);

            // Ground defenders can't counter-attack orbital attackers unless they have anti-air
            if (defenderOnGround && attackerInOrbit && !this.hasAntiAir(defender)) {
                continue; // Skip this attacker - defender can't reach them
            }

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
        for (const attacker of this.combatAttackers) {
            attacker.tap();
            attacker.isSelectedAttacker = false;
        }

        this.showMessage(`${this.combatAttackers.length} units attack ${defender.data.name} for ${totalAttackerPower} damage!`);

        // Clear combat state
        this.combatAttackers = [];
        this.combatTarget = null;
        this.inCombatSelection = false;

        // Check for deaths
        this._checkUnitDeaths();
        this.checkGeneratorDeath();
    }

    // Get all cards that can be attacked (including generator)
    getAllAttackableCards(isPlayer1) {
        const enemyOrbit = isPlayer1 ? this.p2Orbit : this.p1Orbit;
        const enemyPlanet = isPlayer1 ? this.p2Planet : this.p1Planet;

        let targets = [...enemyOrbit, ...enemyPlanet];

        // Add generator if enemy controls it
        if (this.planetaryGenerator && this.planetaryGenerator.isPlayer1 !== isPlayer1) {
            targets.push(this.planetaryGenerator);
        }

        return targets;
    }

    // Check if card is an artifact (can't be attacked except Planetary Consciousness)
    isArtifact(card) {
        const type = (card.data?.type || '').toLowerCase();
        const name = (card.data?.name || '').toLowerCase();
        return type.includes('artifact') && !name.includes('planetary consciousness');
    }

    // Check if card grants research points
    grantsResearch(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const special = (card.data?.special || '').toLowerCase();
        return ability.includes('research') || ability.includes('science') ||
               ability.includes('scan') || special.includes('research');
    }

    // Add research points
    addResearch(amount, isPlayer1) {
        if (isPlayer1) {
            this.p1Research += amount;
        } else {
            this.p2Research += amount;
        }
        this.showMessage(`+${amount} Research Point${amount > 1 ? 's' : ''}!`);
    }

    // Get generator discovery chance (10% base + 1% per research point)
    getDiscoveryChance(isPlayer1) {
        const research = isPlayer1 ? this.p1Research : this.p2Research;
        return 0.1 + (research * 0.01); // 10% + 1% per point
    }

    // Generate energy from structures
    generateEnergy(isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;
        const allCards = [...orbit, ...planet];

        let energyGenerated = 0;
        let maxEnergyBonus = 0;

        for (const card of allCards) {
            const ability = (card.data?.ability || '').toLowerCase();
            const type = (card.data?.type || '').toLowerCase();

            // Check for energy generation
            const genMatch = ability.match(/generates?\s*(\d+)\s*energy/i);
            if (genMatch) {
                energyGenerated += parseInt(genMatch[1]);
            }

            // Orbital Factory generates 1 energy
            if ((card.data?.name || '').toLowerCase().includes('orbital factory')) {
                energyGenerated += 1;
            }

            // Crystal Nexus/Cathedral generate energy
            if ((card.data?.name || '').toLowerCase().includes('crystal nexus')) {
                energyGenerated += 1;
                maxEnergyBonus += 3; // Can store up to 3 excess
            }
            if ((card.data?.name || '').toLowerCase().includes('crystal cathedral')) {
                energyGenerated += 3;
            }
        }

        if (isPlayer1) {
            this.p1Energy += energyGenerated;
            this.p1MaxEnergy = 10 + maxEnergyBonus; // Base 10 + bonuses
            this.p1Energy = Math.min(this.p1Energy, this.p1MaxEnergy);
        } else {
            this.p2Energy += energyGenerated;
            this.p2MaxEnergy = 10 + maxEnergyBonus;
            this.p2Energy = Math.min(this.p2Energy, this.p2MaxEnergy);
        }

        if (energyGenerated > 0) {
            this.showMessage(`Generated ${energyGenerated} energy!`);
        }
    }

    // Spend energy
    spendEnergy(amount, isPlayer1) {
        if (isPlayer1) {
            if (this.p1Energy >= amount) {
                this.p1Energy -= amount;
                return true;
            }
        } else {
            if (this.p2Energy >= amount) {
                this.p2Energy -= amount;
                return true;
            }
        }
        return false;
    }

    // Get current energy
    getEnergy(isPlayer1) {
        return isPlayer1 ? this.p1Energy : this.p2Energy;
    }

    // Regenerate defense for all cards at end of turn
    regenerateDefense() {
        const allCards = [...this.p1Orbit, ...this.p2Orbit, ...this.p1Planet, ...this.p2Planet];
        if (this.planetaryGenerator) {
            allCards.push(this.planetaryGenerator);
        }

        for (const card of allCards) {
            // Heal all damage
            card.damage = 0;
        }
    }

    // Check if card has multiple actions
    getMaxActions(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const name = (card.data?.name || '').toLowerCase();

        // Vanguard Elite attacks twice
        if (name.includes('vanguard elite') || ability.includes('attack twice')) {
            return 2;
        }

        // Consciousness Nexus grants extra action
        // Check if player has Consciousness Nexus
        const myCards = card.isPlayer1 ? [...this.p1Orbit, ...this.p1Planet] : [...this.p2Orbit, ...this.p2Planet];
        const hasNexus = myCards.some(c => (c.data?.name || '').toLowerCase().includes('consciousness nexus'));
        if (hasNexus) {
            return 2;
        }

        return 1;
    }

    // Use an action (returns true if more actions available)
    useAction(card) {
        if (!card.actionsUsed) card.actionsUsed = 0;
        card.actionsUsed++;

        const maxActions = this.getMaxActions(card);
        if (card.actionsUsed >= maxActions) {
            card.tap();
            return false;
        }
        return true;
    }

    // Reset actions at start of turn
    resetActions(isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;

        [...orbit, ...planet].forEach(c => {
            c.actionsUsed = 0;
        });
    }

    // Execute EMP Blast - 2 damage to all enemies in orbit
    executeEMPBlast(isPlayer1) {
        const enemyOrbit = isPlayer1 ? this.p2Orbit : this.p1Orbit;

        let hitCount = 0;
        for (const card of enemyOrbit) {
            card.dealDamage(2);
            hitCount++;
        }

        this.showMessage(`EMP BLAST! ${hitCount} enemies hit for 2 damage each!`);
        this._checkUnitDeaths();
    }

    // Execute Orbital Strike event - 3 damage to target ground unit
    executeOrbitalStrikeEvent(target) {
        target.dealDamage(3);
        this.showMessage(`Orbital Strike hits ${target.data.name} for 3 damage!`);
        this._checkUnitDeaths();
    }

    // Draw a card (for Quantum Sensor)
    drawCardForPlayer(isPlayer1) {
        const card = this.drawCard(isPlayer1);
        if (card) {
            this.showMessage(`Drew ${card.name}!`);
        }
        return card;
    }

    // Check if card is an event
    isEvent(card) {
        const type = (card.type || '').toLowerCase();
        return type.includes('event');
    }

    // Play an event card
    playEventCard(card, isPlayer1) {
        const name = (card.name || '').toLowerCase();
        const effect = (card.effect || card.ability || '').toLowerCase();

        // EMP Blast / EMP Pulse
        if (name.includes('emp')) {
            this.executeEMPBlast(isPlayer1);
            return true;
        }

        // Orbital Strike / Bombardment (needs targeting)
        if (name.includes('orbital strike') || name.includes('bombardment')) {
            this.eventCard = card;
            this.eventIsPlayer1 = isPlayer1;
            // Don't show message - UI will show targeting instructions
            return false; // Don't complete yet, need target
        }

        // Shield Matrix - all friendly units get +1 defense
        if (name.includes('shield matrix') || name.includes('crystal resonance')) {
            const myCards = isPlayer1 ? [...this.p1Orbit, ...this.p1Planet] : [...this.p2Orbit, ...this.p2Planet];
            for (const c of myCards) {
                c.toughness += 1;
                c.currentToughness += 1;
            }
            this.showMessage('Shield Matrix activated! All units gain +1 Defense!');
            return true;
        }

        // Phase Shift - target becomes intangible
        if (name.includes('phase shift')) {
            // For now, just heal a unit
            const myCards = isPlayer1 ? [...this.p1Orbit, ...this.p1Planet] : [...this.p2Orbit, ...this.p2Planet];
            if (myCards.length > 0) {
                myCards[0].damage = 0;
                this.showMessage(`${myCards[0].data.name} phase shifted!`);
            }
            return true;
        }

        // Crystal Growth - repair a unit
        if (name.includes('crystal growth') || name.includes('repair')) {
            const myCards = isPlayer1 ? [...this.p1Orbit, ...this.p1Planet] : [...this.p2Orbit, ...this.p2Planet];
            const damaged = myCards.filter(c => c.damage > 0);
            if (damaged.length > 0) {
                damaged[0].damage = 0;
                this.showMessage(`${damaged[0].data.name} repaired!`);
            }
            return true;
        }

        // Diplomatic Initiative - draw cards
        if (name.includes('diplomatic') || name.includes('draw')) {
            this.drawCardForPlayer(isPlayer1);
            this.drawCardForPlayer(isPlayer1);
            return true;
        }

        // Default - just show message
        this.showMessage(`Event: ${card.name}`);
        return true;
    }

    // Check if a card is offensive (for AI targeting)
    isOffensiveUnit(card) {
        const name = (card.data?.name || '').toLowerCase();
        const type = (card.data?.type || '').toLowerCase();

        // Non-offensive units
        if (name.includes('survey') || name.includes('harvester') ||
            name.includes('mining') || name.includes('science') ||
            name.includes('emissary') || name.includes('explorer')) {
            return false;
        }

        // Support/utility types
        if (type.includes('mining') || type.includes('science') ||
            type.includes('support')) {
            return false;
        }

        // Must have attack power
        return card.power > 0;
    }

    // Check if Defense Grid is on the battlefield for a player
    hasDefenseGrid(isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        return orbit.some(card =>
            card.data?.name?.toLowerCase().includes('defense grid')
        );
    }

    // Apply passive bonuses like Defense Grid to all structures
    applyPassiveBuffs() {
        // Check for Defense Grid and apply +1 defense to all structures
        const p1HasGrid = this.hasDefenseGrid(true);
        const p2HasGrid = this.hasDefenseGrid(false);

        // Apply to P1 cards
        [...this.p1Orbit, ...this.p1Planet].forEach(card => {
            const type = (card.data?.type || '').toLowerCase();
            const isStructure = type.includes('structure') || type.includes('station');
            const baseDefense = card.data?.stats?.defense || 1;

            if (p1HasGrid && isStructure) {
                card.toughness = baseDefense + 1;
                card.currentToughness = Math.max(card.currentToughness, card.toughness);
                card.defenseBuffed = true;
            } else {
                card.toughness = baseDefense;
                card.defenseBuffed = false;
            }
        });

        // Apply to P2 cards
        [...this.p2Orbit, ...this.p2Planet].forEach(card => {
            const type = (card.data?.type || '').toLowerCase();
            const isStructure = type.includes('structure') || type.includes('station');
            const baseDefense = card.data?.stats?.defense || 1;

            if (p2HasGrid && isStructure) {
                card.toughness = baseDefense + 1;
                card.currentToughness = Math.max(card.currentToughness, card.toughness);
                card.defenseBuffed = true;
            } else {
                card.toughness = baseDefense;
                card.defenseBuffed = false;
            }
        });
    }

    // Get type color for rendering (used by enlarged card view)
    _getTypeColor(type) {
        const t = (type || '').toLowerCase();
        if (t.includes('capital')) return '#ef4444';
        if (t.includes('scout') || t.includes('support') || t.includes('science')) return '#60a5fa';
        if (t.includes('mining')) return '#fbbf24';
        if (t.includes('station')) return '#a855f7';
        if (t.includes('surface')) return '#22c55e';
        if (t.includes('structure')) return '#fbbf24';
        if (t.includes('event')) return '#f97316';
        if (t.includes('equipment') || t.includes('upgrade') || t.includes('weapon')) return '#06b6d4';
        if (t.includes('artifact')) return '#ec4899';
        return '#888';
    }

    // Quantum Sensor tap ability - draw a card
    activateQuantumSensor(card, isPlayer1) {
        if (card.tapped || card.summoningSickness) {
            this.showMessage('Cannot activate Quantum Sensor!');
            return false;
        }

        card.tap();
        this.drawCardForPlayer(isPlayer1);
        this.addResearch(1, isPlayer1); // Also grants 1 research
        return true;
    }

    // Check if card is Quantum Sensor
    isQuantumSensor(card) {
        return (card.data?.name || '').toLowerCase().includes('quantum sensor');
    }

    // Check if card is a ground unit (can be moved to planet)
    isGroundUnit(card) {
        const type = (card.data?.type || '').toLowerCase();
        return type.includes('surface') || type.includes('structure_planetside');
    }

    // Move a card from orbit to planet zone
    moveToPlanet(card) {
        const orbit = card.isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const planet = card.isPlayer1 ? this.p1Planet : this.p2Planet;

        const idx = orbit.indexOf(card);
        if (idx === -1) {
            this.showMessage('Card not in orbit!');
            return false;
        }

        // Remove from orbit
        orbit.splice(idx, 1);

        // Add to planet
        planet.push(card);

        // Mark as moved - can't do anything else this turn
        card.movedThisTurn = true;
        card.tap();
        card.actionsUsed = this.getMaxActions(card); // Exhaust all actions

        // Re-layout both zones
        this._layoutOrbit(card.isPlayer1);
        this._layoutPlanet(card.isPlayer1);

        this.showMessage(`${card.data.name} deployed to surface!`);
        return true;
    }

    // Reset movedThisTurn flag at end of turn
    resetMovementFlags() {
        const allCards = [...this.p1Orbit, ...this.p2Orbit, ...this.p1Planet, ...this.p2Planet];
        for (const card of allCards) {
            card.movedThisTurn = false;
        }
    }
}
