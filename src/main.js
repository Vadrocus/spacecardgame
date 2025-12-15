/**
 * Main Entry Point
 */

import { Engine, Draw } from './engine.js';
import { Game } from './game.js';

// Wait for DOM
window.addEventListener('DOMContentLoaded', async () => {
    // Initialize engine
    const engine = new Engine('game');

    // Wait for font to load
    await new Promise(resolve => {
        const checkFont = () => {
            if (engine.fontLoaded) resolve();
            else setTimeout(checkFont, 50);
        };
        checkFont();
    });

    // Initialize game
    const game = new Game(engine);

    // Render UI elements
    const renderUI = (dt, engine) => {
        // Update game logic
        game.update(dt, engine);

        // Title
        Draw.pixelText(
            engine.ctx,
            'RETRO CARD BATTLER',
            engine.width / 2,
            20,
            18,
            '#00ff88',
            'center'
        );

        // Instructions
        Draw.pixelText(
            engine.ctx,
            'Click land to tap for mana | Click card to play | 1 land/turn',
            engine.width / 2,
            50,
            8,
            '#666',
            'center'
        );

        // Hand count
        Draw.pixelText(
            engine.ctx,
            `Hand: ${game.hand.count}/10`,
            120,
            20,
            10,
            '#888',
            'left'
        );

        // Render game UI (mana, turn, end turn button, messages)
        game.renderUI(engine.ctx, engine);
    };

    // Start game loop
    engine.start(renderUI);

    // Draw initial hands (7 cards each)
    for (let i = 0; i < 7; i++) {
        setTimeout(() => {
            game.drawCard();
            // Enemy also draws
            if (game.enemyDeck.count > 0) {
                const cardData = game.enemyDeck.draw();
                if (cardData) game.enemyHand.addCard(cardData, game.enemyDeck.x, game.enemyDeck.y);
            }
        }, 500 + i * 180);
    }
});
