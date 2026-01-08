/**
 * DisplayCard - Static display card (for planet, artifact, natives)
 */

import { CARD_WIDTH, CARD_HEIGHT } from '../../card.js';
import { Draw } from '../../engine.js';

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
