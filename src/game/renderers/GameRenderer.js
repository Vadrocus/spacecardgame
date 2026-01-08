/**
 * GameRenderer - Handles all game rendering
 * Delegates to game for state access
 */

import { Draw } from '../../engine.js';
import { CARD_WIDTH, CARD_HEIGHT } from '../../card.js';

export class GameRenderer {
    constructor(game) {
        this.game = game;
    }

    renderBoard(ctx, engine) {
        const g = this.game;
        const { boardX, boardY, boardW, boardH, midY } = g;

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

        // Perspective-aware labels and colors
        const localLabel = g.isLocalPlayer1 ? 'YOUR' : 'YOUR';
        const oppLabel = g.isLocalPlayer1 ? 'OPP' : 'OPP';
        const localColor = g.isLocalPlayer1 ? '#4ecdc4' : '#a855f7';
        const oppColor = g.isLocalPlayer1 ? '#a855f7' : '#4ecdc4';

        // Local player zones (bottom half)
        this._renderZone(ctx, `${localLabel} GATE`, boardX, midY + zoneH * 2, boardW, zoneH, localColor, 0.15);
        this._renderZone(ctx, `${localLabel} ORBIT`, boardX, midY + zoneH, boardW, zoneH, '#60a5fa', 0.1);
        this._renderZone(ctx, `${localLabel} PLANET`, boardX, midY, boardW, zoneH, '#22c55e', 0.08);

        // Opponent zones (top half)
        this._renderZone(ctx, `${oppLabel} GATE`, boardX, boardY, boardW, zoneH, oppColor, 0.15);
        this._renderZone(ctx, `${oppLabel} ORBIT`, boardX, boardY + zoneH, boardW, zoneH, '#f97316', 0.1);
        this._renderZone(ctx, `${oppLabel} PLANET`, boardX, boardY + zoneH * 2, boardW, zoneH, '#a855f7', 0.08);
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

    _renderOpponentHandBacks(ctx, engine, hand) {
        if (hand.length === 0) return;

        const g = this.game;
        const cardW = 60;
        const cardH = 80;
        const centerX = g.boardX + g.boardW / 2;
        const baseY = 15;
        const spacing = Math.min(40, 300 / hand.length);
        const totalWidth = (hand.length - 1) * spacing;
        const startX = centerX - totalWidth / 2;

        for (let i = 0; i < hand.length; i++) {
            const cardX = startX + i * spacing;

            ctx.save();
            ctx.translate(cardX, baseY);

            // Card back
            Draw.roundRect(ctx, -cardW/2, 0, cardW, cardH, 6);
            const gradient = ctx.createLinearGradient(-cardW/2, 0, cardW/2, cardH);
            gradient.addColorStop(0, '#1a1a3a');
            gradient.addColorStop(1, '#0a0a1a');
            ctx.fillStyle = gradient;
            ctx.fill();

            // Border
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Pattern on card back
            ctx.fillStyle = '#2a2a4a';
            ctx.fillRect(-cardW/2 + 8, 8, cardW - 16, cardH - 16);
            ctx.strokeStyle = '#3a3a5a';
            ctx.lineWidth = 1;
            ctx.strokeRect(-cardW/2 + 8, 8, cardW - 16, cardH - 16);

            ctx.restore();
        }

        // Show card count
        ctx.font = '10px PixelFont, monospace';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText(`${hand.length} cards`, centerX, baseY + cardH + 15);
    }

    _renderHand(ctx, engine, hand, isLocalHand) {
        if (hand.length === 0) return;

        const g = this.game;
        const cardW = 90;
        const cardH = 130;
        const centerX = g.boardX + g.boardW / 2;
        const baseY = engine.height + 20;
        const arcRadius = 400;
        const maxSpread = Math.min(hand.length * 0.08, 0.5);

        const color = g.isLocalPlayer1 ? '#4ecdc4' : '#a855f7';
        const isMyTurn = g.isLocalTurn;
        const isMyHand = true;

        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];

            if (g.draggingHandCard === card) continue;

            const t = hand.length === 1 ? 0 : (i / (hand.length - 1)) - 0.5;
            const angle = t * maxSpread;
            const popOut = (isMyHand && g.hoveredHandIndex === i && g.isLocalTurn) ? 60 : 0;

            const cardX = centerX + Math.sin(angle) * arcRadius;
            const cardY = baseY - Math.cos(angle) * 80 - popOut;
            const rotation = angle * 0.6;

            const cost = card.cost || 0;
            const canPlay = isMyTurn && g.findAvailableGate(cost, g.isLocalPlayer1);
            const isHovered = g.hoveredHandIndex === i && isMyHand;

            ctx.save();
            ctx.translate(cardX, cardY);
            ctx.rotate(rotation);

            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = isHovered ? 20 : 8;
            ctx.shadowOffsetY = isHovered ? 8 : 4;

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
        if (g.draggingHandCard && g.draggingHandCardIsPlayer1 === g.isLocalPlayer1) {
            this._renderDraggedHandCard(ctx, engine);
        }
    }

    _renderDraggedHandCard(ctx, engine) {
        const g = this.game;
        const card = g.draggingHandCard;
        if (!card) return;

        const handY = g.draggingHandCardIsPlayer1 ? engine.height : 0;
        const targetY = g.midY;
        const progress = Math.abs(g.handCardDragY - handY) / Math.abs(targetY - handY);
        const scale = Math.max(0.4, 1 - progress * 0.6);

        const cardW = 90 * scale;
        const cardH = 130 * scale;
        const cost = card.cost || 0;
        const canPlay = g.findAvailableGate(cost, g.draggingHandCardIsPlayer1);
        const typeColor = this._getTypeColor(card.type);

        ctx.save();
        ctx.translate(g.handCardDragX, g.handCardDragY);

        if (canPlay) {
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 15;
        }

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

    renderUI(ctx, engine) {
        const g = this.game;

        // Render board
        this.renderBoard(ctx, engine);

        // Render decks and graveyards
        g.p1Deck.render(ctx);
        g.p2Deck.render(ctx);
        g.p1Graveyard.render(ctx);
        g.p2Graveyard.render(ctx);

        // Show "DROP TO VIEW" hint when dragging hand card toward sidebar
        if (g.draggingHandCard) {
            const sidebarX = g.boardX + g.boardW;
            const inSidebar = g.handCardDragX > sidebarX;

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
        g.planetCard.render(ctx);
        g.artifactCard.render(ctx);
        g.nativesCard.render(ctx);

        // Render gates (with selection mode highlighting)
        const selectedCard = g.selectingGate && g.selectedCardIndex >= 0
            ? (g.selectedCardIsPlayer1 ? g.p1Hand : g.p2Hand)[g.selectedCardIndex]
            : null;
        const cardCost = selectedCard?.cost || 0;

        // Only show selection UI for the selecting player's gates
        g.p1Gates.forEach(gate => {
            const inSelectionMode = g.selectingGate && g.selectedCardIsPlayer1;
            const canAfford = gate.power >= cardCost;
            gate.render(ctx, inSelectionMode, canAfford);
        });
        g.p2Gates.forEach(gate => {
            const inSelectionMode = g.selectingGate && !g.selectedCardIsPlayer1;
            const canAfford = gate.power >= cardCost;
            gate.render(ctx, inSelectionMode, canAfford);
        });

        // Render battlefield cards (sorted by zIndex) - includes planet units and generator
        const allBattlefieldCards = [...g.p1Orbit, ...g.p2Orbit, ...g.p1Planet, ...g.p2Planet];
        if (g.planetaryGenerator) {
            allBattlefieldCards.push(g.planetaryGenerator);
        }
        allBattlefieldCards.sort((a, b) => a.zIndex - b.zIndex);

        // Highlight valid attack targets when in combat selection mode
        allBattlefieldCards.forEach(c => {
            // Check if this is a valid attack target
            if (g.inCombatSelection && g.combatAttackers.length > 0 && !g.combatAttackers.includes(c)) {
                // Check if any attacker can hit this target
                let isValidTarget = false;
                for (const attacker of g.combatAttackers) {
                    const validTargets = g.getValidAttackTargets(attacker);
                    if (validTargets.includes(c)) {
                        isValidTarget = true;
                        break;
                    }
                }
                // Only show as target if it's an enemy
                const isEnemy = (g.isPlayer1Turn && !c.isPlayer1) || (!g.isPlayer1Turn && c.isPlayer1);
                c.isAttackTarget = isValidTarget && isEnemy;
            } else {
                c.isAttackTarget = false;
            }
            c.render(ctx);

            // "DRAG TO PLANET" indicator for ground units in orbit
            const isMyCard = g.isMultiplayer
                ? (c.isPlayer1 === g.isLocalPlayer1)
                : ((g.isPlayer1Turn && c.isPlayer1) || (!g.isPlayer1Turn && !c.isPlayer1));
            const inOrbit = g.p1Orbit.includes(c) || g.p2Orbit.includes(c);
            const canDrag = isMyCard && inOrbit && g.isGroundUnit(c) && !c.summoningSickness && !c.tapped && !c.movedThisTurn;

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
        ctx.fillText('SPACE CARD GAME', g.boardX + g.boardW / 2, 3);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Perspective-aware faction colors (used throughout UI)
        const localFactionColor = g.isLocalPlayer1 ? '#4ecdc4' : '#a855f7';
        const oppFactionColor = g.isLocalPlayer1 ? '#a855f7' : '#4ecdc4';

        // Research and Energy sidebar (left side)
        this._renderResourceSidebar(ctx, engine, localFactionColor, oppFactionColor);

        // Turn indicators - stylized badges (perspective-aware)
        this._renderTurnIndicators(ctx, engine, localFactionColor, oppFactionColor);

        // Add Gate button (stylized) - positioned based on local perspective
        this._renderGateButton(ctx, engine);

        // End Turn button (stylized) - positioned based on local perspective
        this._renderEndTurnButton(ctx, engine);

        // Render hands - local player's hand at bottom, opponent's hand at top (hidden/card backs)
        this._renderHand(ctx, engine, g.localHand, true);  // true = bottom position (local)
        this._renderOpponentHandBacks(ctx, engine, g.opponentHand);  // Show card backs at top

        // Render event animations (above battlefield cards)
        g.eventAnimations.forEach(e => e.render(ctx));

        // Render hovered card preview (on top of everything)
        if (g.hoveredCard) {
            this._renderCardPreview(ctx, engine);
        }

        // Gate selection mode overlay
        if (g.selectingGate) {
            this._renderGateSelectionOverlay(ctx, engine);
        }

        // Combat selection mode overlay
        if (g.inCombatSelection && g.combatAttackers.length > 0) {
            this._renderCombatSelectionOverlay(ctx, engine);
        }

        // Message (when not in selection mode)
        if (!g.selectingGate && !g.inCombatSelection && g.messageTimer > 0 && g.message) {
            ctx.globalAlpha = Math.min(1, g.messageTimer);
            ctx.font = '12px PixelFont, monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText(g.message, engine.width / 2, engine.height / 2);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // Enlarged card view (right-click inspection)
        if (g.enlargedCard) {
            this._renderEnlargedCard(ctx, engine);
        }
    }

    _renderResourceSidebar(ctx, engine, localFactionColor, oppFactionColor) {
        const g = this.game;

        ctx.save();
        const sidebarX = 10;
        const sidebarY = 120;
        const sidebarW = 100;
        const sidebarH = 140;

        // Sidebar background
        ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
        Draw.roundRect(ctx, sidebarX, sidebarY, sidebarW, sidebarH, 8);
        ctx.fill();
        ctx.strokeStyle = localFactionColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Perspective-aware resource display
        const localMaxEnergy = g.isLocalPlayer1 ? (g.p1MaxEnergy || 10) : (g.p2MaxEnergy || 10);
        const oppMaxEnergy = g.isLocalPlayer1 ? (g.p2MaxEnergy || 10) : (g.p1MaxEnergy || 10);
        const localChance = Math.round(g.getDiscoveryChance(g.isLocalPlayer1) * 100);
        const oppChance = Math.round(g.getDiscoveryChance(!g.isLocalPlayer1) * 100);

        ctx.font = '9px PixelFont, monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = localFactionColor;
        ctx.fillText('YOUR STATS', sidebarX + 8, sidebarY + 16);

        // Local Research
        ctx.fillStyle = '#a855f7';
        ctx.fillText(`Research: ${g.localResearch}`, sidebarX + 8, sidebarY + 32);

        // Local Discovery chance
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`Discovery: ${localChance}%`, sidebarX + 8, sidebarY + 46);

        // Local Energy
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`Energy: ${g.localEnergy}/${localMaxEnergy}`, sidebarX + 8, sidebarY + 60);

        // Divider
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(sidebarX + 8, sidebarY + 70);
        ctx.lineTo(sidebarX + sidebarW - 8, sidebarY + 70);
        ctx.stroke();

        // Opponent Resources
        ctx.fillStyle = oppFactionColor;
        ctx.fillText('OPP STATS', sidebarX + 8, sidebarY + 86);

        ctx.fillStyle = '#a855f7';
        ctx.fillText(`Research: ${g.opponentResearch}`, sidebarX + 8, sidebarY + 102);

        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`Discovery: ${oppChance}%`, sidebarX + 8, sidebarY + 116);

        ctx.fillStyle = '#22c55e';
        ctx.fillText(`Energy: ${g.opponentEnergy}/${oppMaxEnergy}`, sidebarX + 8, sidebarY + 130);

        ctx.restore();
    }

    _renderTurnIndicators(ctx, engine, localFactionColor, oppFactionColor) {
        const g = this.game;
        const badgeW = 60;
        const badgeH = 22;

        // Determine local and opponent factions based on perspective
        const localFaction = g.isLocalPlayer1 ? 'TERRAN' : 'CRYSTAL';
        const oppFaction = g.isLocalPlayer1 ? 'CRYSTAL' : 'TERRAN';

        // Opponent indicator (top left)
        const oppActive = g.isLocalPlayer1 ? !g.isPlayer1Turn : g.isPlayer1Turn;
        const oppBadgeX = 3;
        const oppBadgeY = 45;

        ctx.save();
        if (oppActive) {
            ctx.shadowColor = oppFactionColor;
            ctx.shadowBlur = 8;
        }
        Draw.roundRect(ctx, oppBadgeX, oppBadgeY, badgeW, badgeH, 4);
        ctx.fillStyle = oppActive ? `${oppFactionColor}4D` : 'rgba(30, 30, 40, 0.5)';
        ctx.fill();
        ctx.strokeStyle = oppActive ? oppFactionColor : '#444';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = oppActive ? oppFactionColor : '#555';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(oppFaction, oppBadgeX + badgeW / 2, oppBadgeY + badgeH / 2);
        ctx.restore();

        // Local player indicator (bottom left)
        const localActive = g.isLocalTurn;
        const localBadgeX = 3;
        const localBadgeY = engine.height - badgeH - 45;

        ctx.save();
        if (localActive) {
            ctx.shadowColor = localFactionColor;
            ctx.shadowBlur = 8;
        }
        Draw.roundRect(ctx, localBadgeX, localBadgeY, badgeW, badgeH, 4);
        ctx.fillStyle = localActive ? `${localFactionColor}4D` : 'rgba(30, 30, 40, 0.5)';
        ctx.fill();
        ctx.strokeStyle = localActive ? localFactionColor : '#444';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = '8px PixelFont, monospace';
        ctx.fillStyle = localActive ? localFactionColor : '#555';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(localFaction, localBadgeX + badgeW / 2, localBadgeY + badgeH / 2);
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
        ctx.fillText(g.turn.toString(), 33, engine.height / 2 + 6);
        ctx.restore();
    }

    _renderGateButton(ctx, engine) {
        const g = this.game;
        const btnX = g.boardX + g.boardW - 85;
        const btnY = g.isLocalTurn ? engine.height - 55 : 50;
        const btnW = 75;
        const btnH = 28;
        const btnHover = engine.mouse.x >= btnX && engine.mouse.x <= btnX + btnW &&
                        engine.mouse.y >= btnY && engine.mouse.y <= btnY + btnH;

        if (!g.gateActionUsed) {
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
                g.addGate();
            }

            // Gate action hint (subtle)
            ctx.font = '6px PixelFont, monospace';
            ctx.fillStyle = '#555';
            ctx.textAlign = 'center';
            const hintY = g.isLocalTurn ? engine.height - 62 : 82;
            ctx.fillText('Click gate to upgrade', g.boardX + g.boardW / 2, hintY);
        }
    }

    _renderEndTurnButton(ctx, engine) {
        const g = this.game;
        const endX = g.boardX + 70;
        const endY = g.isLocalTurn ? engine.height - 55 : 50;
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
            g.endTurn();
        }
    }

    _renderGateSelectionOverlay(ctx, engine) {
        const g = this.game;

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
        ctx.fillText(g.message, engine.width / 2, msgY + 22);

        ctx.font = '9px PixelFont, monospace';
        ctx.fillStyle = '#888';
        ctx.fillText('Right-click or click elsewhere to cancel', engine.width / 2, msgY + 42);
    }

    _renderCombatSelectionOverlay(ctx, engine) {
        const g = this.game;

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
        for (const a of g.combatAttackers) {
            totalPower += g.getEffectiveAttack(a);
        }

        ctx.font = '12px PixelFont, monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText(`COMBAT: ${g.combatAttackers.length} attacker(s) - Total Power: ${totalPower}`, engine.width / 2, msgY + 22);

        ctx.font = '9px PixelFont, monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText('Click friendly units to add/remove from attack', engine.width / 2, msgY + 40);

        ctx.fillStyle = '#888';
        ctx.fillText('Click enemy to attack | Right-click generator to garrison | Right-click to cancel', engine.width / 2, msgY + 56);
    }

    _renderEnlargedCard(ctx, engine) {
        const g = this.game;

        // Dim background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, engine.width, engine.height);

        const cardData = g.enlargedCard.data || g.enlargedCard;
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

            // Defense
            if (cardData.defense !== undefined) {
                ctx.font = '32px PixelFont, monospace';
                ctx.fillStyle = '#3b82f6';
                ctx.textAlign = 'right';
                ctx.fillText(`${cardData.defense} ⛊`, cardW/2 - 60, statY);
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

    _renderCardPreview(ctx, engine) {
        const g = this.game;
        const card = g.hoveredCard;
        const pos = g.hoveredCardPos;

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
        const isMyTurn = (pos.isPlayer1 && g.isPlayer1Turn) || (!pos.isPlayer1 && !g.isPlayer1Turn);
        const cost = card.cost || 0;
        const canPlay = isMyTurn && g.findAvailableGate(cost, pos.isPlayer1);

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
}
