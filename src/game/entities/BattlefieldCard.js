/**
 * BattlefieldCard - Cards deployed on the battlefield with combat mechanics
 */

import { Draw } from '../../engine.js';

// Full-size card dimensions (draw at full size, scale the transform)
export const CARD_FULL_W = 200;
export const CARD_FULL_H = 280;

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

        // State
        this.tapped = false;
        this.tapRotation = 0;
        this.summoningSickness = true;
        this.isAttackTarget = false;

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
            ctx.fillStyle = this.damage > 0 ? '#ef4444' : '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const toughnessDisplay = this.currentToughness - this.damage;
            ctx.fillText(`${this.power}/${toughnessDisplay}`, ptX + ptW/2, ptY + ptH/2 + 1);
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
