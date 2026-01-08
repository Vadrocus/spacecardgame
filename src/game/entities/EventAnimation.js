/**
 * EventAnimation - Visual effect animation for event cards
 */

import { Draw } from '../../engine.js';

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
