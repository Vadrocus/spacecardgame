/**
 * Card - Rendering and interaction for game cards
 */

import { Draw } from './engine.js';

export const CARD_WIDTH = 180;
export const CARD_HEIGHT = 250;

export class Card {
    constructor(data, x = 0, y = 0) {
        this.data = data;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.rotation = 0;
        this.scale = 1;
        this.alpha = 1;
        this.zIndex = 0;

        // Hover state
        this.hovered = false;
        this.hoverProgress = 0;

        // 3D tilt effect
        this.tiltX = 0;
        this.tiltY = 0;

        // Shine effect position (0-1)
        this.shineX = 0.5;
        this.shineY = 0.5;

        // Animation state
        this.flipProgress = 0; // 0 = face up, 1 = face down

        // Tapped state (for lands and creatures)
        this.tapped = false;
        this.tapRotation = 0;

        // Creature stats
        this.attack = this.data.attack || 0;
        this.defense = this.data.defense || 0;
        this.currentHealth = this.defense;
        this.summoningSickness = true; // Can't attack first turn

        // Colors based on type
        this.colors = this._getColors();
    }

    _getColors() {
        if (this.data.type === 'creature') {
            return {
                border: '#ff6b6b',
                bg1: '#4a2c2c',
                bg2: '#2c1a1a',
                accent: '#ff8888'
            };
        } else if (this.data.type === 'land') {
            return {
                border: '#a855f7',
                bg1: '#3d2a5c',
                bg2: '#251a3a',
                accent: '#c084fc'
            };
        } else {
            return {
                border: '#4ecdc4',
                bg1: '#2c4a4a',
                bg2: '#1a2c2c',
                accent: '#66fff0'
            };
        }
    }

    get width() { return CARD_WIDTH * this.scale; }
    get height() { return CARD_HEIGHT * this.scale; }

    containsPoint(px, py) {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        return px >= this.x - halfW && px <= this.x + halfW &&
               py >= this.y - halfH && py <= this.y + halfH;
    }

    update(dt, engine) {
        const wasHovered = this.hovered;
        this.hovered = this.containsPoint(engine.mouse.x, engine.mouse.y);

        // Smooth hover transition
        const targetHover = this.hovered ? 1 : 0;
        this.hoverProgress += (targetHover - this.hoverProgress) * 10 * dt;

        // Update tilt based on mouse position
        if (this.hovered) {
            const halfW = this.width / 2;
            const halfH = this.height / 2;
            const relX = (engine.mouse.x - this.x) / halfW;
            const relY = (engine.mouse.y - this.y) / halfH;

            this.tiltX = relY * 15;  // Tilt on X axis based on Y position
            this.tiltY = -relX * 15; // Tilt on Y axis based on X position

            // Update shine position
            this.shineX = (relX + 1) / 2;
            this.shineY = (relY + 1) / 2;
        } else {
            this.tiltX *= 0.9;
            this.tiltY *= 0.9;
        }

        // Bring to front when hovered (very high z-index)
        if (this.hovered && !wasHovered) {
            this.zIndex = 1000;
        } else if (!this.hovered && wasHovered) {
            this.zIndex = this.baseZIndex || 0;
        }

        // Smooth tap rotation
        const targetTapRotation = this.tapped ? 90 : 0;
        this.tapRotation += (targetTapRotation - this.tapRotation) * 10 * dt;
    }

    render(ctx, engine) {
        ctx.save();

        // Position at card center
        ctx.translate(this.x, this.y);

        // Apply hover lift (rise up significantly)
        const lift = this.hoverProgress * 80;
        ctx.translate(0, -lift);

        // Apply scale (including hover scale - zoom to ~150% on hover)
        const hoverScale = 1 + this.hoverProgress * 1.5;
        ctx.scale(this.scale * hoverScale, this.scale * hoverScale);

        // Apply tap rotation (for lands)
        if (this.tapRotation > 0.1) {
            ctx.rotate(this.tapRotation * Math.PI / 180);
        }

        // Simple 3D perspective simulation via skew
        // (Real 3D would need WebGL, but this gives a nice effect)
        const skewX = this.tiltY * 0.01;
        const skewY = this.tiltX * 0.01;
        ctx.transform(1, skewY, skewX, 1, 0, 0);

        const w = CARD_WIDTH;
        const h = CARD_HEIGHT;
        const halfW = w / 2;
        const halfH = h / 2;

        // Card shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20 + this.hoverProgress * 20;
        ctx.shadowOffsetY = 10 + this.hoverProgress * 10;

        // Card base
        const gradient = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
        gradient.addColorStop(0, this.colors.bg1);
        gradient.addColorStop(1, this.colors.bg2);

        Draw.roundRect(ctx, -halfW, -halfH, w, h, 12);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Reset shadow for other elements
        ctx.shadowColor = 'transparent';

        // Border
        ctx.strokeStyle = this.colors.border;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Pixel art border effect (double line)
        ctx.strokeStyle = this.colors.accent;
        ctx.lineWidth = 1;
        Draw.roundRect(ctx, -halfW + 6, -halfH + 6, w - 12, h - 12, 8);
        ctx.stroke();

        // Render card content
        this._renderContent(ctx, -halfW, -halfH, w, h);

        // Holographic shine effect (only when hovered)
        if (this.hoverProgress > 0.01) {
            this._renderShine(ctx, -halfW, -halfH, w, h);
        }

        // Tapped overlay (darken tapped cards)
        if (this.tapped && this.tapRotation > 45) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#000';
            Draw.roundRect(ctx, -halfW, -halfH, w, h, 12);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Summoning sickness indicator for creatures
        if (this.data.type === 'creature' && this.summoningSickness && this.inBattlefield) {
            ctx.globalAlpha = 0.7;
            ctx.font = '8px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('SUMMONING', 0, -halfH - 15);
            ctx.fillText('SICKNESS', 0, -halfH - 5);
            ctx.globalAlpha = 1;
        }

        // Attacking indicator (red pulsing glow)
        if (this.isAttacking) {
            ctx.save();
            const pulse = Math.sin(performance.now() / 150) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 6;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 20;
            Draw.roundRect(ctx, -halfW - 4, -halfH - 4, w + 8, h + 8, 14);
            ctx.stroke();
            ctx.restore();

            // "ATTACKING" label
            ctx.font = '8px PixelFont, monospace';
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center';
            ctx.fillText('ATTACKING', 0, -halfH - 12);
        }

        // Selected blocker indicator (yellow glow)
        if (this.isSelectedBlocker) {
            ctx.save();
            const pulse = Math.sin(performance.now() / 100) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 6;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 20;
            Draw.roundRect(ctx, -halfW - 4, -halfH - 4, w + 8, h + 8, 14);
            ctx.stroke();
            ctx.restore();

            ctx.font = '8px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.fillText('SELECT TARGET', 0, -halfH - 12);
        }

        // Blocking indicator (green glow)
        if (this.isBlocking) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 15;
            Draw.roundRect(ctx, -halfW - 3, -halfH - 3, w + 6, h + 6, 14);
            ctx.stroke();
            ctx.restore();

            ctx.font = '7px PixelFont, monospace';
            ctx.fillStyle = '#22c55e';
            ctx.textAlign = 'center';
            ctx.fillText('BLOCKING', 0, -halfH - 12);
        }

        // Creature stats display (ATK/HP) - show in hand and battlefield
        if (this.data.type === 'creature') {
            const statY = halfH + 15;
            const badgeSize = this.inBattlefield ? 14 : 10;
            const fontSize = this.inBattlefield ? 10 : 8;
            const xOffset = this.inBattlefield ? 25 : 18;

            // Attack badge
            ctx.beginPath();
            ctx.arc(-xOffset, statY, badgeSize, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fca5a5';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = `${fontSize}px PixelFont, monospace`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.attack.toString(), -xOffset, statY + 1);

            // Health badge (show defense in hand, currentHealth on battlefield)
            ctx.beginPath();
            ctx.arc(xOffset, statY, badgeSize, 0, Math.PI * 2);
            const displayHealth = this.inBattlefield ? this.currentHealth : this.defense;
            const healthColor = (this.inBattlefield && this.currentHealth < this.defense) ? '#f97316' : '#22c55e';
            ctx.fillStyle = healthColor;
            ctx.fill();
            ctx.strokeStyle = (this.inBattlefield && this.currentHealth < this.defense) ? '#fdba74' : '#86efac';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.fillText(displayHealth.toString(), xOffset, statY + 1);
        }

        ctx.restore();
    }

    _renderContent(ctx, x, y, w, h) {
        const padding = 12;
        const innerX = x + padding;
        const innerY = y + padding;
        const innerW = w - padding * 2;

        // Cost orb
        const orbRadius = 16;
        const orbX = innerX + orbRadius;
        const orbY = innerY + orbRadius;

        // Orb gradient
        const orbGrad = ctx.createRadialGradient(orbX - 4, orbY - 4, 0, orbX, orbY, orbRadius);
        orbGrad.addColorStop(0, '#ffeb3b');
        orbGrad.addColorStop(1, '#f9a825');

        ctx.beginPath();
        ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = orbGrad;
        ctx.fill();
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Cost number
        ctx.font = 'bold 14px PixelFont, monospace';
        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.data.cost.toString(), orbX, orbY + 1);

        // Card name
        ctx.font = '10px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Wrap name if too long
        const nameX = innerX + orbRadius * 2 + 8;
        const nameMaxW = innerW - orbRadius * 2 - 12;
        this._drawTextWithShadow(ctx, this.data.name, nameX, innerY + 4, nameMaxW, 10);

        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Type badge
        const typeY = innerY + 36;
        const typeH = 20;
        const badgePadding = 8;
        ctx.font = '8px PixelFont, monospace';
        const typeText = this.data.type.toUpperCase();
        const typeWidth = ctx.measureText(typeText).width + badgePadding * 2;

        Draw.roundRect(ctx, innerX, typeY, typeWidth, typeH, 4);
        ctx.fillStyle = this.colors.border;
        ctx.fill();
        ctx.strokeStyle = this.colors.bg2;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        this._drawTextWithShadow(ctx, typeText, innerX + badgePadding, typeY + typeH / 2, typeWidth, 8);

        // Art box
        const artY = typeY + typeH + 8;
        const artH = 70;

        Draw.roundRect(ctx, innerX, artY, innerW, artH, 6);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Placeholder text
        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = '#444';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('[PIXEL ART]', x + w / 2, artY + artH / 2);

        // Effect box
        const effectY = artY + artH + 8;
        const effectH = h - (effectY - y) - padding;

        Draw.roundRect(ctx, innerX, effectY, innerW, effectH, 4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fill();
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Effect text
        ctx.font = '7px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        this._wrapText(ctx, this.data.effect, innerX + 6, effectY + 6, innerW - 12, 10);

        // Flavor text (if exists)
        if (this.data.flavor) {
            ctx.font = '6px PixelFont, monospace';
            ctx.fillStyle = '#888';
            const flavorY = effectY + 28;
            this._wrapText(ctx, this.data.flavor, innerX + 6, flavorY, innerW - 12, 9);
        }
    }

    _drawTextWithShadow(ctx, text, x, y, maxW, size) {
        ctx.font = `${size}px PixelFont, monospace`;
        ctx.fillStyle = '#000';
        ctx.fillText(text, x + 1, y + 1, maxW);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x, y, maxW);
    }

    _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const lines = text.split('\n');
        let currentY = y;

        for (const paragraph of lines) {
            const words = paragraph.split(' ');
            let line = '';

            for (const word of words) {
                const testLine = line + word + ' ';
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && line !== '') {
                    ctx.fillText(line.trim(), x, currentY);
                    line = word + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line.trim(), x, currentY);
            currentY += lineHeight;
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
            x + w * this.shineX - 100,
            y + h * this.shineY - 100,
            x + w * this.shineX + 100,
            y + h * this.shineY + 100
        );

        const hue = (time * 50) % 360;
        rainbow.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.3)`);
        rainbow.addColorStop(0.2, `hsla(${hue + 60}, 100%, 70%, 0.3)`);
        rainbow.addColorStop(0.4, `hsla(${hue + 120}, 100%, 70%, 0.3)`);
        rainbow.addColorStop(0.6, `hsla(${hue + 180}, 100%, 70%, 0.3)`);
        rainbow.addColorStop(0.8, `hsla(${hue + 240}, 100%, 70%, 0.3)`);
        rainbow.addColorStop(1, `hsla(${hue + 300}, 100%, 70%, 0.3)`);

        ctx.globalCompositeOperation = 'color-dodge';
        ctx.globalAlpha = this.hoverProgress * 0.6;
        ctx.fillStyle = rainbow;
        ctx.fillRect(x, y, w, h);

        // Shine highlight
        const shineGrad = ctx.createRadialGradient(
            x + w * this.shineX,
            y + h * this.shineY,
            0,
            x + w * this.shineX,
            y + h * this.shineY,
            150
        );
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        shineGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
        shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = this.hoverProgress * 0.5;
        ctx.fillStyle = shineGrad;
        ctx.fillRect(x, y, w, h);

        ctx.restore();
    }
}
