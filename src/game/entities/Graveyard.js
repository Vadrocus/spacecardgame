/**
 * Graveyard - Discard pile management and rendering
 */

import { CARD_WIDTH, CARD_HEIGHT } from '../../card.js';
import { Draw } from '../../engine.js';

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
}
