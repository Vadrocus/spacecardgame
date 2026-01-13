/**
 * Space Card Game - Main Entry Point
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

    // Render callback
    const renderUI = (dt, engine) => {
        // Update game logic
        game.update(dt, engine);

        // Render game UI
        game.renderUI(engine.ctx, engine);

        // Title - top center
        Draw.pixelText(
            engine.ctx,
            'SPACE CARD GAME',
            engine.width / 2,
            10,
            14,
            '#4ecdc4',
            'center'
        );
    };

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        if (e.key === 'n' || e.key === 'N') {
            game.addGate();
        }
        if (e.key === ' ' || e.key === 'Enter') {
            game.endTurn();
        }
    });

    // Start game loop
    engine.start(renderUI);
});
