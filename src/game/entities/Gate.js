/**
 * Gate - Mana/power system for playing cards
 */

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
