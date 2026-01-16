/**
 * Space Card Game - Main Entry Point
 * Now with multiplayer support!
 */

import { Engine, Draw } from './engine.js';
import { Game } from './game.js';
import { Multiplayer } from './multiplayer.js';

// Global state
let engine = null;
let game = null;
let multiplayer = null;
let gameMode = null;  // 'single', 'multi-host', 'multi-join'
let lobbyState = 'menu';  // 'menu', 'creating', 'waiting', 'joining', 'playing'
let roomCodeInput = '';
let statusMessage = '';
let errorMessage = '';

// Wait for DOM
window.addEventListener('DOMContentLoaded', async () => {
    // Initialize engine
    engine = new Engine('game');

    // Wait for font to load
    await new Promise(resolve => {
        const checkFont = () => {
            if (engine.fontLoaded) resolve();
            else setTimeout(checkFont, 50);
        };
        checkFont();
    });

    // Initialize multiplayer
    multiplayer = new Multiplayer();
    await multiplayer.init();

    // Set up multiplayer callbacks
    multiplayer.onPlayerJoined = (data) => {
        console.log('Player joined!', data);
        statusMessage = 'Opponent connected!';
        if (lobbyState === 'waiting') {
            // Start game after short delay
            setTimeout(() => startGame(), 1000);
        }
    };

    multiplayer.onPlayerLeft = (data) => {
        console.log('Player left!', data);
        if (game) {
            statusMessage = 'Opponent disconnected!';
        }
    };

    // Start with lobby
    engine.start(renderLobby);
});

// Lobby rendering
function renderLobby(dt, eng) {
    const ctx = eng.ctx;
    const w = eng.width;
    const h = eng.height;

    // Clear
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    // Title
    Draw.pixelText(ctx, 'SPACE CARD GAME', w/2, 60, 24, '#4ecdc4', 'center');
    Draw.pixelText(ctx, 'Multiplayer Edition', w/2, 95, 12, '#888', 'center');

    if (lobbyState === 'menu') {
        renderMenu(ctx, w, h, eng);
    } else if (lobbyState === 'creating' || lobbyState === 'waiting') {
        renderWaiting(ctx, w, h);
    } else if (lobbyState === 'joining') {
        renderJoining(ctx, w, h, eng);
    }

    // Status/Error messages
    if (statusMessage) {
        Draw.pixelText(ctx, statusMessage, w/2, h - 80, 10, '#4ecdc4', 'center');
    }
    if (errorMessage) {
        Draw.pixelText(ctx, errorMessage, w/2, h - 50, 10, '#ff6b6b', 'center');
    }

    // Reset click state
    eng.mouse.clicked = false;
}

function renderMenu(ctx, w, h, eng) {
    const btnW = 280;
    const btnH = 50;
    const btnX = w/2 - btnW/2;
    const btnY = h/2 - 80;
    const gap = 70;

    // Single Player button
    const sp = { x: btnX, y: btnY, w: btnW, h: btnH };
    drawButton(ctx, sp, 'SINGLE PLAYER', eng.mouse, () => {
        gameMode = 'single';
        startGame();
    });

    // Create Room button
    const cr = { x: btnX, y: btnY + gap, w: btnW, h: btnH };
    drawButton(ctx, cr, 'CREATE ROOM', eng.mouse, async () => {
        lobbyState = 'creating';
        statusMessage = 'Creating room...';
        const result = await multiplayer.createRoom();
        if (result.success) {
            lobbyState = 'waiting';
            statusMessage = 'Waiting for opponent...';
            gameMode = 'multi-host';
        } else {
            lobbyState = 'menu';
            errorMessage = result.error || 'Failed to create room';
        }
    });

    // Join Room button
    const jr = { x: btnX, y: btnY + gap * 2, w: btnW, h: btnH };
    drawButton(ctx, jr, 'JOIN ROOM', eng.mouse, () => {
        lobbyState = 'joining';
        roomCodeInput = '';
        errorMessage = '';
    });
}

function renderWaiting(ctx, w, h) {
    Draw.pixelText(ctx, 'ROOM CODE:', w/2, h/2 - 40, 14, '#888', 'center');
    Draw.pixelText(ctx, multiplayer.roomCode || '------', w/2, h/2, 28, '#4ecdc4', 'center');
    Draw.pixelText(ctx, 'Share this code with your opponent', w/2, h/2 + 50, 10, '#666', 'center');
    Draw.pixelText(ctx, 'Waiting for player 2...', w/2, h/2 + 90, 12, '#888', 'center');

    // Cancel button
    const btnW = 150;
    const btnH = 40;
    const btn = { x: w/2 - btnW/2, y: h/2 + 140, w: btnW, h: btnH };
    drawButton(ctx, btn, 'CANCEL', engine.mouse, async () => {
        await multiplayer.leaveRoom();
        lobbyState = 'menu';
        statusMessage = '';
    });
}

function renderJoining(ctx, w, h, eng) {
    Draw.pixelText(ctx, 'ENTER ROOM CODE:', w/2, h/2 - 60, 14, '#888', 'center');

    // Room code input box
    const boxW = 200;
    const boxH = 50;
    const boxX = w/2 - boxW/2;
    const boxY = h/2 - 25;

    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Display input
    Draw.pixelText(ctx, roomCodeInput || '______', w/2, h/2, 24, '#fff', 'center');

    // Instructions
    Draw.pixelText(ctx, 'Type 6-character code', w/2, h/2 + 50, 10, '#666', 'center');

    // Join button (only if code is complete)
    if (roomCodeInput.length === 6) {
        const btnW = 150;
        const btnH = 40;
        const btn = { x: w/2 - btnW/2, y: h/2 + 80, w: btnW, h: btnH };
        drawButton(ctx, btn, 'JOIN', eng.mouse, async () => {
            statusMessage = 'Joining room...';
            const result = await multiplayer.joinRoom(roomCodeInput);
            if (result.success) {
                gameMode = 'multi-join';
                startGame();
            } else {
                errorMessage = result.error || 'Failed to join room';
            }
        });
    }

    // Back button
    const backBtn = { x: w/2 - 75, y: h/2 + 140, w: 150, h: 40 };
    drawButton(ctx, backBtn, 'BACK', eng.mouse, () => {
        lobbyState = 'menu';
        errorMessage = '';
    });
}

function drawButton(ctx, rect, text, mouse, onClick) {
    const hover = mouse.x >= rect.x && mouse.x <= rect.x + rect.w &&
                  mouse.y >= rect.y && mouse.y <= rect.y + rect.h;

    // Button background
    ctx.fillStyle = hover ? '#3a3a4e' : '#2a2a3e';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    // Border
    ctx.strokeStyle = hover ? '#4ecdc4' : '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    // Text
    Draw.pixelText(ctx, text, rect.x + rect.w/2, rect.y + rect.h/2 - 5, 12, hover ? '#4ecdc4' : '#888', 'center');

    // Click handler
    if (hover && mouse.clicked) {
        onClick();
    }
}

// Keyboard input for room code
window.addEventListener('keydown', (e) => {
    if (lobbyState === 'joining') {
        if (e.key === 'Backspace') {
            roomCodeInput = roomCodeInput.slice(0, -1);
        } else if (e.key.length === 1 && roomCodeInput.length < 6) {
            const char = e.key.toUpperCase();
            if (/[A-Z0-9]/.test(char)) {
                roomCodeInput += char;
            }
        } else if (e.key === 'Enter' && roomCodeInput.length === 6) {
            // Trigger join
            joinWithCode();
        } else if (e.key === 'Escape') {
            lobbyState = 'menu';
        }
    } else if (lobbyState === 'playing' && game) {
        // Game controls
        if (e.key === 'n' || e.key === 'N') {
            game.addGate();
        }
        if (e.key === ' ' || e.key === 'Enter') {
            game.endTurn();
        }
    }
});

async function joinWithCode() {
    statusMessage = 'Joining room...';
    const result = await multiplayer.joinRoom(roomCodeInput);
    if (result.success) {
        gameMode = 'multi-join';
        startGame();
    } else {
        errorMessage = result.error || 'Failed to join room';
    }
}

function startGame() {
    lobbyState = 'playing';
    statusMessage = '';
    errorMessage = '';

    // Initialize game with multiplayer context
    game = new Game(engine, multiplayer, gameMode);

    // Set up multiplayer action handler
    if (gameMode !== 'single') {
        multiplayer.onGameAction = (actionType, actionData) => {
            game.handleRemoteAction(actionType, actionData);
        };
    }

    // Render callback
    const renderGame = (dt, eng) => {
        // Update game logic
        game.update(dt, eng);

        // Render game UI
        game.renderUI(eng.ctx, eng);

        // Title with mode indicator
        const modeText = gameMode === 'single' ? 'vs AI' :
                        (multiplayer.isPlayer1 ? 'P1 (Host)' : 'P2 (Guest)');
        Draw.pixelText(
            eng.ctx,
            `SPACE CARD GAME - ${modeText}`,
            eng.width / 2,
            10,
            14,
            '#4ecdc4',
            'center'
        );

        // Show room code in multiplayer
        if (gameMode !== 'single' && multiplayer.roomCode) {
            Draw.pixelText(
                eng.ctx,
                `Room: ${multiplayer.roomCode}`,
                eng.width - 10,
                10,
                10,
                '#666',
                'right'
            );
        }
    };

    // Switch to game rendering
    engine.renderCallback = renderGame;
}
