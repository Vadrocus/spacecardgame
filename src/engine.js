/**
 * Core Engine - Canvas rendering, input handling, animation
 */

export class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.width = 0;
        this.height = 0;

        this.mouse = { x: 0, y: 0, down: false, clicked: false, rightClicked: false, doubleClicked: false };
        this.lastClickTime = 0;
        this.lastTime = 0;
        this.deltaTime = 0;

        this.entities = [];
        this.animations = [];

        this._setupCanvas();
        this._setupInput();

        // Load pixel font
        this.fontLoaded = false;
        this._loadFont();
    }

    async _loadFont() {
        const font = new FontFace('PixelFont', 'url(https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2)');
        try {
            await font.load();
            document.fonts.add(font);
            this.fontLoaded = true;
        } catch (e) {
            console.warn('Could not load pixel font, using fallback');
            this.fontLoaded = true; // Continue anyway
        }
    }

    _setupCanvas() {
        const resize = () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        };
        resize();
        window.addEventListener('resize', resize);
    }

    _setupInput() {
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.down = true;
                this.mouse.clicked = true;

                // Double-click detection (300ms window)
                const now = performance.now();
                if (now - this.lastClickTime < 300) {
                    this.mouse.doubleClicked = true;
                }
                this.lastClickTime = now;
            } else if (e.button === 2) {
                this.mouse.rightClicked = true;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = -1000;
            this.mouse.y = -1000;
        });

        // Prevent context menu on right-click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    add(entity) {
        this.entities.push(entity);
        this.entities.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    }

    remove(entity) {
        const idx = this.entities.indexOf(entity);
        if (idx !== -1) this.entities.splice(idx, 1);
    }

    // Animation system
    animate(target, props, duration, easing = 'easeOutCubic', onComplete = null) {
        const anim = {
            target,
            startProps: {},
            endProps: props,
            duration,
            elapsed: 0,
            easing,
            onComplete
        };

        for (const key in props) {
            anim.startProps[key] = target[key];
        }

        this.animations.push(anim);
        return anim;
    }

    _updateAnimations(dt) {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const anim = this.animations[i];
            anim.elapsed += dt;

            const t = Math.min(anim.elapsed / anim.duration, 1);
            const easedT = this._ease(t, anim.easing);

            for (const key in anim.endProps) {
                const start = anim.startProps[key];
                const end = anim.endProps[key];
                anim.target[key] = start + (end - start) * easedT;
            }

            if (t >= 1) {
                this.animations.splice(i, 1);
                if (anim.onComplete) anim.onComplete();
            }
        }
    }

    _ease(t, type) {
        switch (type) {
            case 'linear': return t;
            case 'easeInQuad': return t * t;
            case 'easeOutQuad': return t * (2 - t);
            case 'easeInOutQuad': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'easeOutCubic': return (--t) * t * t + 1;
            case 'easeOutBack': return 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
            case 'easeOutElastic':
                return t === 0 ? 0 : t === 1 ? 1 :
                    Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
            default: return t;
        }
    }

    start(updateCallback) {
        const loop = (time) => {
            this.deltaTime = (time - this.lastTime) / 1000;
            this.lastTime = time;

            // Cap delta time to prevent huge jumps
            if (this.deltaTime > 0.1) this.deltaTime = 0.016;

            // Update animations
            this._updateAnimations(this.deltaTime);

            // Clear
            this.ctx.fillStyle = '#0a0a12';
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Re-sort entities by zIndex every frame (for hover effects)
            this.entities.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

            // Update and render entities
            for (const entity of this.entities) {
                if (entity.update) entity.update(this.deltaTime, this);
                if (entity.render) entity.render(this.ctx, this);
            }

            // Custom update
            if (updateCallback) updateCallback(this.deltaTime, this);

            // Reset click state
            this.mouse.clicked = false;
            this.mouse.rightClicked = false;
            this.mouse.doubleClicked = false;

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}

// Utility drawing functions
export const Draw = {
    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    pixelText(ctx, text, x, y, size = 12, color = '#fff', align = 'left') {
        ctx.font = `${size}px PixelFont, monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'top';
        ctx.fillText(text, x, y);
    },

    // Wrap text within width
    wrapText(ctx, text, x, y, maxWidth, lineHeight, size = 10, color = '#fff') {
        ctx.font = `${size}px PixelFont, monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (const word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line, x, currentY);
                line = word + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }
};
