/**
 * Deck - Card deck management and rendering
 */

import { CARD_WIDTH, CARD_HEIGHT } from '../../card.js';
import { shuffle } from '../../data.js';
import { Draw } from '../../engine.js';

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
