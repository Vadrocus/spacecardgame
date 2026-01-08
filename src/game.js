/**
 * Space Card Game - Board, Zones, Gates, and Game Logic
 */

import { Card, CARD_WIDTH, CARD_HEIGHT } from './card.js?v=5';
import { planetDeck, artifactDeck, nativesDeck, shuffle, pickRandom, loadTerranDeck, loadCrystalDeck, getDeckCards } from './data.js?v=5';
import { Draw } from './engine.js?v=5';

// Import entity classes from modular structure
import {
    Deck,
    Graveyard,
    Gate,
    DisplayCard,
    BattlefieldCard,
    CARD_FULL_W,
    CARD_FULL_H,
    EventAnimation
} from './game/entities/index.js?v=5';

// Import renderer
import { GameRenderer } from './game/renderers/index.js?v=5';

// Import systems
import { CombatSystem, ResourceManager, EventSystem, AIPlayer } from './game/systems/index.js?v=5';

// Re-export entities for backward compatibility
export { Deck, Graveyard, Gate, DisplayCard, BattlefieldCard, EventAnimation };

// Main Game class
export class Game {
    constructor(engine, multiplayer = null, gameMode = 'single') {
        this.engine = engine;
        this.initialized = false;

        // Multiplayer state
        this.multiplayer = multiplayer;
        this.gameMode = gameMode;
        this.isMultiplayer = gameMode !== 'single';
        this.isLocalPlayer1 = !multiplayer || multiplayer.isPlayer1;  // In single player or as host, we're P1

        // Draw static cards at game start
        this.planet = pickRandom(planetDeck);
        this.artifact = pickRandom(artifactDeck);
        this.natives = pickRandom(nativesDeck);

        // Player 1 (bottom) - Terran
        this.p1Deck = new Deck(0, 0, true, []);
        this.p1Graveyard = new Graveyard(0, 0, true);
        this.p1Gates = [new Gate(0, 0, true)];
        this.p1Orbit = [];
        this.p1Planet = [];
        this.p1Hand = [];
        this.p1Faction = 'terran';

        // Player 2 (top) - Crystal
        this.p2Deck = new Deck(0, 0, false, []);
        this.p2Graveyard = new Graveyard(0, 0, false);
        this.p2Gates = [new Gate(0, 0, false)];
        this.p2Orbit = [];
        this.p2Planet = [];
        this.p2Hand = [];
        this.p2Faction = 'crystal';

        // Hovered card for preview (hand cards)
        this.hoveredCard = null;
        this.hoveredCardPos = { x: 0, y: 0 };

        // Hovered battlefield card
        this.hoveredBattlefieldCard = null;

        // Active event animations
        this.eventAnimations = [];

        // Gate selection mode - for choosing which gate to use
        this.selectingGate = false;
        this.selectedCardIndex = -1;
        this.selectedCardIsPlayer1 = true;

        // Equipment targeting mode
        this.equipmentCard = null;
        this.equipmentIsPlayer1 = true;

        // Garrison mode - for garrisoning units to generator
        this.garrisonUnit = null;

        // Planetary Shield Generator (spawned by Survey Team)
        this.planetaryGenerator = null;

        // MTG-style combat stack
        this.combatAttackers = [];
        this.combatTarget = null;
        this.inCombatSelection = false;

        // Research points system
        this.p1Research = 0;
        this.p2Research = 0;

        // Energy resource system
        this.p1Energy = 0;
        this.p2Energy = 0;
        this.p1MaxEnergy = 0;
        this.p2MaxEnergy = 0;

        // Event targeting mode
        this.eventCard = null;
        this.eventIsPlayer1 = true;

        // Enlarged card view (click to inspect)
        this.enlargedCard = null;

        // Drag-to-move state (battlefield cards)
        this.draggingCard = null;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Hand card drag-to-play state
        this.draggingHandCard = null;
        this.draggingHandCardIndex = -1;
        this.draggingHandCardIsPlayer1 = true;
        this.handCardDragX = 0;
        this.handCardDragY = 0;

        // Hand hover state (for pop-out effect)
        this.hoveredHandIndex = -1;
        this.lastHoveredHandIndex = -1;
        this.lastHoveredTime = 0;

        // Display cards
        this.planetCard = new DisplayCard(0, 0, this.planet, 'PLANET');
        this.artifactCard = new DisplayCard(0, 0, this.artifact, 'ARTIFACT');
        this.nativesCard = new DisplayCard(0, 0, this.natives, 'NATIVES');

        // Game state
        this.turn = 1;
        this.isPlayer1Turn = true;
        this.gateActionUsed = false;
        this.gameOver = false;
        this.winner = null;

        this.message = '';
        this.messageTimer = 0;

        // Board dimensions (calculated in update)
        this.boardX = 0;
        this.boardY = 0;
        this.boardW = 0;
        this.boardH = 0;
        this.midY = 0;

        // Initialize renderer
        this.renderer = new GameRenderer(this);

        // Initialize systems
        this.combatSystem = new CombatSystem(this);
        this.resourceManager = new ResourceManager(this);
        this.eventSystem = new EventSystem(this);
        this.aiPlayer = new AIPlayer(this);

        // Load faction decks
        this._loadDecks();
    }

    async _loadDecks() {
        try {
            const [terranDeck, crystalDeck] = await Promise.all([
                loadTerranDeck(),
                loadCrystalDeck()
            ]);

            // P1 gets Terran deck
            this.p1Deck.cards = shuffle(getDeckCards(terranDeck));
            this.p1Faction = terranDeck.faction;

            // P2 gets Crystal deck
            this.p2Deck.cards = shuffle(getDeckCards(crystalDeck));
            this.p2Faction = crystalDeck.faction;

            // Draw initial hands (7 cards each)
            for (let i = 0; i < 7; i++) {
                this.drawCard(true);
                this.drawCard(false);
            }

            this.initialized = true;
            this.showMessage('Decks loaded! Game ready.');
        } catch (error) {
            console.error('Failed to load decks:', error);
            this.showMessage('Error loading decks!');
        }
    }

    // Draw a card from deck to hand
    drawCard(isPlayer1) {
        const deck = isPlayer1 ? this.p1Deck : this.p2Deck;
        const hand = isPlayer1 ? this.p1Hand : this.p2Hand;
        const card = deck.draw();
        if (card) {
            hand.push(card);
            return card;
        }
        return null;
    }

    showMessage(msg, duration = 2) {
        this.message = msg;
        this.messageTimer = duration;
    }

    // Get current player's gates
    get currentGates() {
        return this.isPlayer1Turn ? this.p1Gates : this.p2Gates;
    }

    // ============================================
    // PERSPECTIVE HELPERS - For flipped view in multiplayer
    // "Local" = bottom of screen (the player's own stuff)
    // "Opponent" = top of screen (enemy stuff)
    // ============================================
    get localDeck() { return this.isLocalPlayer1 ? this.p1Deck : this.p2Deck; }
    get opponentDeck() { return this.isLocalPlayer1 ? this.p2Deck : this.p1Deck; }
    get localGraveyard() { return this.isLocalPlayer1 ? this.p1Graveyard : this.p2Graveyard; }
    get opponentGraveyard() { return this.isLocalPlayer1 ? this.p2Graveyard : this.p1Graveyard; }
    get localGates() { return this.isLocalPlayer1 ? this.p1Gates : this.p2Gates; }
    get opponentGates() { return this.isLocalPlayer1 ? this.p2Gates : this.p1Gates; }
    get localOrbit() { return this.isLocalPlayer1 ? this.p1Orbit : this.p2Orbit; }
    get opponentOrbit() { return this.isLocalPlayer1 ? this.p2Orbit : this.p1Orbit; }
    get localPlanet() { return this.isLocalPlayer1 ? this.p1Planet : this.p2Planet; }
    get opponentPlanet() { return this.isLocalPlayer1 ? this.p2Planet : this.p1Planet; }
    get localHand() { return this.isLocalPlayer1 ? this.p1Hand : this.p2Hand; }
    get opponentHand() { return this.isLocalPlayer1 ? this.p2Hand : this.p1Hand; }
    get localResearch() { return this.isLocalPlayer1 ? this.p1Research : this.p2Research; }
    get opponentResearch() { return this.isLocalPlayer1 ? this.p2Research : this.p1Research; }
    get localEnergy() { return this.isLocalPlayer1 ? this.p1Energy : this.p2Energy; }
    get opponentEnergy() { return this.isLocalPlayer1 ? this.p2Energy : this.p1Energy; }

    // Check if it's the local player's turn (for UI highlighting)
    get isLocalTurn() { return this.isPlayer1Turn === this.isLocalPlayer1; }

    // Resource management delegation methods
    addGate() {
        return this.resourceManager.addGate();
    }

    incrementGate(gate) {
        return this.resourceManager.incrementGate(gate);
    }

    // Check if local player can take actions
    canAct() {
        if (!this.isMultiplayer) return true;  // Single player - always can act when it's your turn
        // In multiplayer, can only act on your turn
        return this.isPlayer1Turn === this.isLocalPlayer1;
    }

    endTurn() {
        // In multiplayer, only allow ending turn if it's our turn
        if (this.isMultiplayer && !this.canAct()) {
            this.showMessage("Wait for your turn!");
            return;
        }

        // Send action to opponent in multiplayer
        if (this.isMultiplayer && this.multiplayer) {
            this.multiplayer.sendAction('end_turn', {});
        }

        this._executeEndTurn();
    }

    // Internal end turn logic (called locally and from remote)
    _executeEndTurn() {
        // Remove summoning sickness from current player's cards (they've been out a full turn)
        const currentOrbit = this.isPlayer1Turn ? this.p1Orbit : this.p2Orbit;
        const currentPlanet = this.isPlayer1Turn ? this.p1Planet : this.p2Planet;
        currentOrbit.forEach(c => c.removeSummoningSickness());
        currentPlanet.forEach(c => c.removeSummoningSickness());

        // Cancel combat selection mode
        if (this.combatAttackers.length > 0) {
            this.cancelCombatSelection();
        }

        // Reset per-turn flags before switching
        this.resetTurnFlags();
        this.resetMovementFlags();

        this.isPlayer1Turn = !this.isPlayer1Turn;
        this.gateActionUsed = false;
        this.turn++;

        // Regenerate defense for all cards at end of turn
        this.regenerateDefense();

        // Apply Crystal Monolith growth at start of each turn
        this.applyMonolithGrowth();

        // Generate energy for the new active player
        this.generateEnergy(this.isPlayer1Turn);

        // Reset actions for the new active player
        this.resetActions(this.isPlayer1Turn);

        // Reset all gates for the new active player
        const gates = this.isPlayer1Turn ? this.p1Gates : this.p2Gates;
        gates.forEach(g => g.reset());

        // Untap all cards for the new active player
        const newOrbit = this.isPlayer1Turn ? this.p1Orbit : this.p2Orbit;
        const newPlanet = this.isPlayer1Turn ? this.p1Planet : this.p2Planet;
        newOrbit.forEach(c => c.untap());
        newPlanet.forEach(c => c.untap());

        // Draw a card for the new active player
        const drawnCard = this.drawCard(this.isPlayer1Turn);
        if (drawnCard) {
            this.showMessage(this.isPlayer1Turn ? "Player 1's turn - Drew a card!" : "Player 2's turn - Drew a card!");
        } else {
            this.showMessage(this.isPlayer1Turn ? "Player 1's turn" : "Player 2's turn");
        }

        // Run AI turn if it's player 2's turn (ONLY in single player mode)
        if (!this.isMultiplayer && !this.isPlayer1Turn) {
            this._runAITurn();
        }

        // In multiplayer, show whose turn it is
        if (this.isMultiplayer) {
            if (this.canAct()) {
                this.showMessage("Your turn!");
            } else {
                this.showMessage("Opponent's turn - waiting...");
            }
        }
    }

    // AI delegation methods
    _runAITurn() {
        this.aiPlayer.runAITurn();
    }

    // ============================================
    // MULTIPLAYER - Handle remote actions from opponent
    // ============================================
    handleRemoteAction(actionType, actionData) {
        console.log('Handling remote action:', actionType, actionData);

        try {
        switch (actionType) {
            case 'end_turn':
                this._executeEndTurn();
                break;

            case 'add_gate':
                this._remoteAddGate(actionData.isPlayer1);
                break;

            case 'increment_gate':
                this._remoteIncrementGate(actionData.gateIndex, actionData.isPlayer1);
                break;

            case 'play_card':
                this._remotePlayCard(actionData.cardIndex, actionData.isPlayer1, actionData.gateIndex, actionData.cardData);
                break;

            case 'land_dropship':
                this._remoteLandDropship(actionData.cardIndex, actionData.isPlayer1);
                break;

            case 'attack':
                this._remoteAttack(actionData.attackerIndices, actionData.targetIndex, actionData.attackerZone, actionData.targetZone, actionData.isPlayer1);
                break;

            case 'tap_card':
                this._remoteTapCard(actionData.cardIndex, actionData.zone, actionData.isPlayer1);
                break;

            case 'survey':
                this._remoteSurvey(actionData.cardIndex, actionData.zone, actionData.isPlayer1);
                break;

            case 'quantum_sensor':
                this._remoteQuantumSensor(actionData.cardIndex, actionData.zone, actionData.isPlayer1);
                break;

            case 'deploy_tokens':
                this._remoteDeployTokens(actionData.cardIndex, actionData.isPlayer1);
                break;

            case 'garrison':
                this._remoteGarrison(actionData.cardIndex, actionData.isPlayer1);
                break;

            case 'move_to_planet':
                this._remoteMoveToPlanet(actionData.cardIndex, actionData.isPlayer1);
                break;

            default:
                console.warn('Unknown remote action:', actionType);
        }
        } catch (error) {
            console.error('ERROR handling remote action:', actionType, error);
        }
    }

    _remoteDeployTokens(cardIndex, isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        if (cardIndex >= 0 && cardIndex < orbit.length) {
            this.deployTokens(orbit[cardIndex], isPlayer1, true);
        }
    }

    _remoteGarrison(cardIndex, isPlayer1) {
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;
        if (cardIndex >= 0 && cardIndex < planet.length) {
            this.garrisonToGenerator(planet[cardIndex], true);
        }
    }

    _remoteSurvey(cardIndex, zone, isPlayer1) {
        const array = zone === 'orbit'
            ? (isPlayer1 ? this.p1Orbit : this.p2Orbit)
            : (isPlayer1 ? this.p1Planet : this.p2Planet);

        if (cardIndex >= 0 && cardIndex < array.length) {
            this.attemptArtifactDiscovery(array[cardIndex], isPlayer1, true);
        }
    }

    _remoteQuantumSensor(cardIndex, zone, isPlayer1) {
        const array = zone === 'orbit'
            ? (isPlayer1 ? this.p1Orbit : this.p2Orbit)
            : (isPlayer1 ? this.p1Planet : this.p2Planet);

        if (cardIndex >= 0 && cardIndex < array.length) {
            this.activateQuantumSensor(array[cardIndex], isPlayer1, true);
        }
    }

    _remoteAddGate(isPlayer1) {
        const gates = isPlayer1 ? this.p1Gates : this.p2Gates;
        if (gates.length >= 3) return;
        gates.push(new Gate(0, 0, isPlayer1));
        this.gateActionUsed = true;
        this.showMessage(`Opponent added a gate!`);
    }

    _remoteIncrementGate(gateIndex, isPlayer1) {
        const gates = isPlayer1 ? this.p1Gates : this.p2Gates;
        if (gateIndex >= 0 && gateIndex < gates.length) {
            gates[gateIndex].increment();
            this.gateActionUsed = true;
            this.showMessage(`Opponent upgraded a gate!`);
        }
    }

    _remotePlayCard(cardIndex, isPlayer1, gateIndex, cardData) {
        const gates = isPlayer1 ? this.p1Gates : this.p2Gates;
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const graveyard = isPlayer1 ? this.p1Graveyard : this.p2Graveyard;

        if (gateIndex < 0 || gateIndex >= gates.length) return;
        if (!cardData) {
            console.error('Remote play_card missing card data');
            return;
        }

        const gate = gates[gateIndex];

        // Use the gate
        gate.use();

        // Check if this is an event card
        if (this.isEventCard(cardData)) {
            // Event cards: animate, trigger effect, go to graveyard
            const centerX = this.boardX + this.boardW / 2;
            const centerY = this.midY;
            const graveyardX = isPlayer1 ? this.p1Graveyard.x : this.p2Graveyard.x;
            const graveyardY = isPlayer1 ? this.p1Graveyard.y : this.p2Graveyard.y;

            const eventAnim = new EventAnimation(
                cardData,
                gate.x, gate.y,
                graveyardX, graveyardY,
                isPlayer1,
                () => {
                    graveyard.add(cardData);
                    this.showMessage(`Opponent's ${cardData.name} resolved!`);
                }
            );
            eventAnim.setCenter(centerX, centerY);
            this.eventAnimations.push(eventAnim);

            this.showMessage(`Opponent's ${cardData.name} triggered!`);
            this._triggerEventEffect(cardData, isPlayer1);
        } else if (this.isEquipment(cardData)) {
            // Equipment - store for targeting (handled separately)
            this.showMessage(`Opponent played ${cardData.name}`);
        } else {
            // Unit card - deploy to orbit using provided card data
            const battlefieldCard = new BattlefieldCard(cardData, gate.x, gate.y, isPlayer1);
            orbit.push(battlefieldCard);
            this._layoutOrbit(isPlayer1);
            this.showMessage(`Opponent's ${cardData.name} warped in!`);
        }
    }

    _remoteLandDropship(cardIndex, isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        if (cardIndex >= 0 && cardIndex < orbit.length) {
            this.landDropship(orbit[cardIndex], isPlayer1, true);  // true = remote action
        }
    }

    _remoteAttack(attackerIndices, targetIndex, attackerZone, targetZone, isPlayer1) {
        // Get target array based on zone (enemy's perspective)
        const targetArray = targetZone === 'orbit'
            ? (isPlayer1 ? this.p2Orbit : this.p1Orbit)
            : (isPlayer1 ? this.p2Planet : this.p1Planet);

        if (targetIndex < 0 || targetIndex >= targetArray.length) return;
        const defender = targetArray[targetIndex];

        // Clear existing combat state and build attacker list from remote data
        this.combatAttackers = [];

        for (const attackerInfo of attackerIndices) {
            // attackerInfo is either {zone, idx} or just a number for backwards compat
            let zone, idx;
            if (typeof attackerInfo === 'object') {
                zone = attackerInfo.zone;
                idx = attackerInfo.idx;
            } else {
                zone = attackerZone;
                idx = attackerInfo;
            }

            const attackerArray = zone === 'orbit'
                ? (isPlayer1 ? this.p1Orbit : this.p2Orbit)
                : (isPlayer1 ? this.p1Planet : this.p2Planet);

            if (idx >= 0 && idx < attackerArray.length) {
                this.combatAttackers.push(attackerArray[idx]);
            }
        }

        // Execute the combat stack with remote flag
        if (this.combatAttackers.length > 0) {
            this.executeCombatStack(defender, true);
        }
    }

    _remoteTapCard(cardIndex, zone, isPlayer1) {
        let array;
        if (zone === 'orbit') {
            array = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        } else {
            array = isPlayer1 ? this.p1Planet : this.p2Planet;
        }

        if (cardIndex >= 0 && cardIndex < array.length) {
            array[cardIndex].tap();
        }
    }

    findAvailableGate(cost, isPlayer1) {
        return this.resourceManager.findAvailableGate(cost, isPlayer1);
    }

    // Event system delegation
    isEventCard(card) {
        return this.eventSystem.isEventCard(card);
    }

    // Check if a card is a dropship
    isDropship(card) {
        const type = (card.data?.type || card.type || '').toLowerCase();
        return type.includes('dropship');
    }

    // Land a dropship - sacrifice it and spawn a ground unit
    landDropship(battlefieldCard, isPlayer1, remote = false) {
        // Check multiplayer permissions (skip if remote action)
        if (!remote && this.isMultiplayer && !this.canAct()) {
            this.showMessage("Wait for your turn!");
            return false;
        }

        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;
        const graveyard = isPlayer1 ? this.p1Graveyard : this.p2Graveyard;

        // Check if it's a dropship
        if (!this.isDropship(battlefieldCard)) {
            this.showMessage('Only dropships can land!');
            return false;
        }

        // Check summoning sickness
        if (battlefieldCard.summoningSickness) {
            this.showMessage('Summoning sickness - wait a turn!');
            return false;
        }

        // Check if already tapped
        if (battlefieldCard.tapped) {
            this.showMessage('Dropship is already tapped!');
            return false;
        }

        // Remove from orbit
        const idx = orbit.indexOf(battlefieldCard);
        if (idx === -1) return false;

        // Send action to multiplayer (if not a remote action)
        if (!remote && this.isMultiplayer && this.multiplayer) {
            this.multiplayer.sendAction('land_dropship', {
                cardIndex: idx,
                isPlayer1
            });
        }

        orbit.splice(idx, 1);

        // Add to graveyard
        graveyard.add(battlefieldCard.data);

        // Spawn ground unit
        const spawnedUnit = this.createGroundUnit(isPlayer1);
        planet.push(spawnedUnit);

        // Layout the planet zone
        this._layoutPlanet(isPlayer1);

        const unitName = isPlayer1 ? 'Marine Squad' : 'Crystal Golem';
        this.showMessage(`${battlefieldCard.data.name} landed! ${unitName} deployed!`);

        return true;
    }

    // Create a ground unit based on faction
    createGroundUnit(isPlayer1) {
        const unitData = isPlayer1 ? {
            name: 'Marine Squad',
            type: 'ground_unit',
            cost: 0,
            stats: { attack: 2, defense: 2 },
            ability: 'Deployed from Orbital Dropship. Can attack enemy ground units.',
            art: 'Terran marines in powered armor'
        } : {
            name: 'Crystal Golem',
            type: 'ground_unit',
            cost: 0,
            stats: { attack: 2, defense: 2 },
            ability: 'Deployed from Shard Lander. Can attack enemy ground units.',
            art: 'A humanoid crystal formation'
        };

        // Spawn in planet zone
        const zoneY = this.midY;
        return new BattlefieldCard(unitData, this.boardX + this.boardW / 2, zoneY, isPlayer1);
    }

    // Layout cards in planet zone (centered like orbit cards)
    _layoutPlanet(isPlayer1) {
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;
        const zoneH = this.boardH / 2 / 3;

        // Determine if this is the LOCAL player's planet zone (should be at bottom)
        const isLocalPlanet = (isPlayer1 === this.isLocalPlayer1);
        const zoneY = isLocalPlanet
            ? this.midY + zoneH / 2  // Local planet zone at BOTTOM (just below midY)
            : this.boardY + zoneH * 2 + zoneH / 2;  // Opponent planet zone at TOP (just above midY)

        const cardSpacing = 55;
        const totalWidth = (planet.length - 1) * cardSpacing;
        const startX = this.boardX + this.boardW / 2 - totalWidth / 2;

        planet.forEach((card, i) => {
            card.targetX = startX + i * cardSpacing;
            card.targetY = zoneY;
            card.baseZIndex = i;
        });
    }

    // Attack a ground unit
    attackGroundUnit(attacker, defender) {
        // Both deal damage to each other
        attacker.dealDamage(defender.power);
        defender.dealDamage(attacker.power);

        this.showMessage(`${attacker.data.name} attacks ${defender.data.name}!`);

        // Check for deaths
        this._checkGroundUnitDeaths();
    }

    // Check if any ground units died
    _checkGroundUnitDeaths() {
        // Check P1 units
        for (let i = this.p1Planet.length - 1; i >= 0; i--) {
            const unit = this.p1Planet[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p1Graveyard.add(unit.data);
                this.p1Planet.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Check P2 units
        for (let i = this.p2Planet.length - 1; i >= 0; i--) {
            const unit = this.p2Planet[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p2Graveyard.add(unit.data);
                this.p2Planet.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Re-layout
        this._layoutPlanet(true);
        this._layoutPlanet(false);
    }

    // Start gate selection for playing a card
    startGateSelection(cardIndex, isPlayer1) {
        const hand = isPlayer1 ? this.p1Hand : this.p2Hand;
        if (cardIndex < 0 || cardIndex >= hand.length) return false;

        const card = hand[cardIndex];
        const cost = card.cost || 0;

        // Check if any gates can afford this
        const gates = isPlayer1 ? this.p1Gates : this.p2Gates;
        const validGates = gates.filter(g => !g.used && g.power >= cost);

        if (validGates.length === 0) {
            this.showMessage(`No gate with power >= ${cost}!`);
            return false;
        }

        // Enter gate selection mode
        this.selectingGate = true;
        this.selectedCardIndex = cardIndex;
        this.selectedCardIsPlayer1 = isPlayer1;
        this.showMessage(`Select a gate for ${card.name} (cost ${cost})`);
        return true;
    }

    // Cancel gate selection
    cancelGateSelection() {
        this.selectingGate = false;
        this.selectedCardIndex = -1;
        this.showMessage('');
    }

    // Play a card from hand using a specific gate
    playCard(cardIndex, isPlayer1, gate, remote = false) {
        // Check multiplayer permissions (skip if remote action)
        if (!remote && this.isMultiplayer && !this.canAct()) {
            this.showMessage("Wait for your turn!");
            return false;
        }

        const hand = isPlayer1 ? this.p1Hand : this.p2Hand;
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const graveyard = isPlayer1 ? this.p1Graveyard : this.p2Graveyard;
        const gates = isPlayer1 ? this.p1Gates : this.p2Gates;

        if (cardIndex < 0 || cardIndex >= hand.length) return false;

        const card = hand[cardIndex];
        const cost = card.cost || 0;

        // Validate the gate
        if (!gate || gate.used || gate.power < cost) {
            this.showMessage(`Invalid gate selection!`);
            return false;
        }

        // Send action to multiplayer (if not a remote action)
        if (!remote && this.isMultiplayer && this.multiplayer) {
            const gateIndex = gates.indexOf(gate);
            this.multiplayer.sendAction('play_card', {
                cardIndex,
                isPlayer1,
                gateIndex,
                cardData: card  // Send full card data for sync
            });
        }

        // Use the gate
        gate.use();
        hand.splice(cardIndex, 1);

        // Clear selection mode
        this.selectingGate = false;
        this.selectedCardIndex = -1;

        // Check if this is an event card
        if (this.isEventCard(card)) {
            // Event cards: animate, trigger effect, go to graveyard
            const centerX = this.boardX + this.boardW / 2;
            const centerY = this.midY;
            const graveyardX = isPlayer1 ? this.p1Graveyard.x : this.p2Graveyard.x;
            const graveyardY = isPlayer1 ? this.p1Graveyard.y : this.p2Graveyard.y;

            const eventAnim = new EventAnimation(
                card,
                gate.x, gate.y,  // Start at gate
                graveyardX, graveyardY,  // End at graveyard
                isPlayer1,
                () => {
                    // On complete, add to graveyard
                    graveyard.add(card);
                    this.showMessage(`${card.name} resolved!`);
                }
            );

            // Set center position for display phase
            eventAnim.setCenter(centerX, centerY);

            this.eventAnimations.push(eventAnim);

            this.showMessage(`${card.name} triggered!`);
            this._triggerEventEffect(card, isPlayer1);
        } else if (this.isEquipment(card)) {
            // Equipment cards: enter targeting mode
            this.equipmentCard = card;
            this.equipmentIsPlayer1 = isPlayer1;
            this.showMessage(`Select a target for ${card.name}`);
            return true;
        } else {
            // All cards deploy to orbit first (ground units can move to planet next turn)
            const battlefieldCard = new BattlefieldCard(card, gate.x, gate.y, isPlayer1);
            orbit.push(battlefieldCard);
            this._layoutOrbit(isPlayer1);
            this.showMessage(`${card.name} warped in!`);
        }

        return true;
    }

    // Check if a card is a surface unit type
    isSurfaceUnit(card) {
        const type = (card.type || '').toLowerCase();
        return type.includes('surface_unit') || type.includes('surface unit');
    }

    // Check if a card is equipment/upgrade/weapon
    isEquipment(card) {
        const type = (card.type || '').toLowerCase();
        return type.includes('equipment') || type.includes('upgrade') || type.includes('weapon');
    }

    // Check if unit has orbital strike ability
    hasOrbitalStrike(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const name = (card.data?.name || '').toLowerCase();
        return ability.includes('orbital strike') ||
               ability.includes('surface target') ||
               name.includes('hyperion');
    }

    // Check if unit has anti-air ability (can attack orbital from ground)
    hasAntiAir(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        return ability.includes('target orbital') || ability.includes('orbital units from');
    }

    // Combat system delegation methods
    getValidAttackTargets(attacker) {
        return this.combatSystem.getValidAttackTargets(attacker);
    }

    performCombat(attacker, defender) {
        return this.combatSystem.performCombat(attacker, defender);
    }

    performOrbitalStrike(attacker, defender) {
        return this.combatSystem.performOrbitalStrike(attacker, defender);
    }

    getEffectiveAttack(card) {
        return this.combatSystem.getEffectiveAttack(card);
    }

    getEffectiveDefense(card) {
        return this.combatSystem.getEffectiveDefense(card);
    }

    getPassiveAttackBonus(card) {
        return this.combatSystem.getPassiveAttackBonus(card);
    }

    getPassiveDefenseBonus(card) {
        return this.combatSystem.getPassiveDefenseBonus(card);
    }

    // Check if equipment can target this card
    isValidEquipTarget(equipment, target) {
        const equipTarget = (equipment.equipTarget || '').toLowerCase();
        const targetType = (target.data?.type || '').toLowerCase();
        const targetName = (target.data?.name || '').toLowerCase();

        // "Any Terran card" or "Any Crystalline unit"
        if (equipTarget.includes('any')) {
            if (equipTarget.includes('capital ship') && targetType.includes('capital')) return true;
            if (equipTarget.includes('ship') && (targetType.includes('ship') || targetType.includes('capital'))) return true;
            if (equipTarget.includes('structure') && (targetType.includes('structure') || targetType.includes('station'))) return true;
            if (equipTarget.includes('unit') && targetType.includes('unit')) return true;
            if (equipTarget.includes('terran') || equipTarget.includes('crystalline') || equipTarget.includes('card')) return true;
        }

        return true; // Default allow for flexibility
    }

    // Attach equipment to a target
    attachEquipment(equipment, target) {
        if (!target.equipment) target.equipment = [];
        target.equipment.push(equipment);

        // Apply immediate stat changes
        const ability = (equipment.ability || '').toLowerCase();

        // +X Attack
        const attackMatch = ability.match(/\+(\d+)\s*attack/i);
        if (attackMatch) {
            target.power += parseInt(attackMatch[1]);
        }

        // +X Defense
        const defenseMatch = ability.match(/\+(\d+)\s*defense/i);
        if (defenseMatch) {
            target.toughness += parseInt(defenseMatch[1]);
            target.currentToughness += parseInt(defenseMatch[1]);
        }

        this.showMessage(`${equipment.name} equipped to ${target.data.name}!`);
    }

    // Check for unit deaths in all zones
    _checkUnitDeaths() {
        // Check P1 orbit
        for (let i = this.p1Orbit.length - 1; i >= 0; i--) {
            const unit = this.p1Orbit[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p1Graveyard.add(unit.data);
                this.p1Orbit.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Check P2 orbit
        for (let i = this.p2Orbit.length - 1; i >= 0; i--) {
            const unit = this.p2Orbit[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p2Graveyard.add(unit.data);
                this.p2Orbit.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Check P1 planet
        for (let i = this.p1Planet.length - 1; i >= 0; i--) {
            const unit = this.p1Planet[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p1Graveyard.add(unit.data);
                this.p1Planet.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Check P2 planet
        for (let i = this.p2Planet.length - 1; i >= 0; i--) {
            const unit = this.p2Planet[i];
            if (unit.currentToughness - unit.damage <= 0) {
                this.p2Graveyard.add(unit.data);
                this.p2Planet.splice(i, 1);
                this.showMessage(`${unit.data.name} destroyed!`);
            }
        }

        // Re-layout
        this._layoutOrbit(true);
        this._layoutOrbit(false);
        this._layoutPlanet(true);
        this._layoutPlanet(false);
    }

    _triggerEventEffect(card, isPlayer1) {
        return this.eventSystem.triggerEventEffect(card, isPlayer1);
    }

    // Layout cards in orbit zone
    _layoutOrbit(isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        if (orbit.length === 0) return;

        const zoneH = this.boardH / 2 / 3;

        // Determine if this is the LOCAL player's orbit (should be at bottom)
        const isLocalOrbit = (isPlayer1 === this.isLocalPlayer1);
        const orbitY = isLocalOrbit
            ? this.midY + zoneH + zoneH / 2  // Local orbit at BOTTOM
            : this.boardY + zoneH + zoneH / 2;  // Opponent orbit at TOP

        const cardSpacing = 45;
        const totalWidth = (orbit.length - 1) * cardSpacing;
        const startX = this.boardX + this.boardW / 2 - totalWidth / 2;

        orbit.forEach((card, i) => {
            card.targetX = startX + i * cardSpacing;
            card.targetY = orbitY;
            card.baseZIndex = i;
        });
    }

    _layoutGates() {
        const gateX = this.boardX + 50;

        // Layout LOCAL player's gates (left side, stacked vertically in BOTTOM half)
        const localCount = this.localGates.length;
        const localSpacing = Math.min(50, 120 / Math.max(localCount, 1));
        const localStartY = this.midY + 60;
        this.localGates.forEach((gate, i) => {
            gate.targetX = gateX;
            gate.targetY = localStartY + i * localSpacing;
        });

        // Layout OPPONENT's gates (left side, stacked vertically in TOP half)
        const oppCount = this.opponentGates.length;
        const oppSpacing = Math.min(50, 120 / Math.max(oppCount, 1));
        const oppStartY = this.midY - 60 - (oppCount - 1) * oppSpacing;
        this.opponentGates.forEach((gate, i) => {
            gate.targetX = gateX;
            gate.targetY = oppStartY + i * oppSpacing;
        });
    }

    update(dt, engine) {
        if (this.messageTimer > 0) this.messageTimer -= dt;

        // Calculate board dimensions
        const margin = 20;
        const sideWidth = 120;
        this.boardX = margin;
        this.boardY = margin;
        this.boardW = engine.width - margin * 2 - sideWidth;
        this.boardH = engine.height - margin * 2;
        this.midY = this.boardY + this.boardH / 2;

        // Update positions - use perspective (local player at bottom, opponent at top)
        const sidebarX = this.boardX + this.boardW + 60;

        // Local player's deck/graveyard at BOTTOM
        this.localDeck.x = sidebarX;
        this.localDeck.y = engine.height - 80;
        this.localGraveyard.x = sidebarX;
        this.localGraveyard.y = engine.height - 180;

        // Opponent's deck/graveyard at TOP
        this.opponentDeck.x = sidebarX;
        this.opponentDeck.y = 80;
        this.opponentGraveyard.x = sidebarX;
        this.opponentGraveyard.y = 180;

        // Display cards on the right side
        const sideX = this.boardX + this.boardW + 60;
        this.planetCard.x = sideX;
        this.planetCard.y = this.midY - 130;
        this.artifactCard.x = sideX;
        this.artifactCard.y = this.midY;
        this.nativesCard.x = sideX;
        this.nativesCard.y = this.midY + 130;

        // Layout gates
        this._layoutGates();

        // Layout orbit cards
        this._layoutOrbit(true);
        this._layoutOrbit(false);

        // Update all objects
        this.p1Deck.update(dt, engine);
        this.p2Deck.update(dt, engine);
        this.p1Gates.forEach(g => g.update(dt, engine));
        this.p2Gates.forEach(g => g.update(dt, engine));
        this.p1Orbit.forEach(c => c.update(dt, engine));
        this.p2Orbit.forEach(c => c.update(dt, engine));
        this.p1Planet.forEach(c => c.update(dt, engine));
        this.p2Planet.forEach(c => c.update(dt, engine));
        if (this.planetaryGenerator) {
            this.planetaryGenerator.update(dt, engine);
        }
        this.planetCard.update(dt, engine);
        this.artifactCard.update(dt, engine);
        this.nativesCard.update(dt, engine);

        // Update event animations
        this.eventAnimations.forEach(e => e.update(dt));
        this.eventAnimations = this.eventAnimations.filter(e => !e.complete);

        // Track hovered battlefield card (for z-index priority) - includes planet units and generator
        this.hoveredBattlefieldCard = null;
        const allCards = [...this.p1Orbit, ...this.p2Orbit, ...this.p1Planet, ...this.p2Planet];
        if (this.planetaryGenerator) {
            allCards.push(this.planetaryGenerator);
        }
        for (const card of allCards) {
            if (card.hovered) {
                this.hoveredBattlefieldCard = card;
                break;
            }
        }

        // Update hand hover detection (only if not hovering battlefield card)
        if (!this.hoveredBattlefieldCard) {
            this._updateHandHover(engine);
        } else {
            this.hoveredCard = null;
        }

        // Handle right-click to cancel gate selection
        if (engine.mouse.rightClicked && this.selectingGate) {
            this.cancelGateSelection();
        }

        // Handle right-click for garrison - if unit selected in combat mode and right-click generator
        if (engine.mouse.rightClicked && this.combatAttackers.length > 0 &&
            this.planetaryGenerator && this.hoveredBattlefieldCard === this.planetaryGenerator) {
            // Check if we control the generator
            const attackerIsP1 = this.combatAttackers[0].isPlayer1;
            if (this.planetaryGenerator.isPlayer1 === attackerIsP1) {
                // Garrison all selected units
                for (const unit of this.combatAttackers) {
                    const isGroundUnit = this.p1Planet.includes(unit) || this.p2Planet.includes(unit);
                    if (isGroundUnit) {
                        this.garrisonToGenerator(unit);
                    }
                }
                this.combatAttackers = [];
                this.inCombatSelection = false;
                return;
            }
        }

        // Handle right-click to cancel combat selection (if not garrisoning)
        if (engine.mouse.rightClicked && this.combatAttackers.length > 0 && !this.hoveredBattlefieldCard) {
            this.cancelCombatSelection();
        }

        // Click anywhere to close enlarged card view
        if (engine.mouse.clicked && this.enlargedCard) {
            this.enlargedCard = null;
            return; // Don't process other clicks
        }

        // Handle hand card drag-to-play: Start drag (local player's hand only)
        if (engine.mouse.down && this.hoveredHandIndex >= 0 && !this.draggingHandCard && !this.enlargedCard) {
            const hand = this.localHand;
            if (this.hoveredHandIndex < hand.length) {
                this.draggingHandCard = hand[this.hoveredHandIndex];
                this.draggingHandCardIndex = this.hoveredHandIndex;
                this.draggingHandCardIsPlayer1 = this.isLocalPlayer1;
                this.handCardDragX = engine.mouse.x;
                this.handCardDragY = engine.mouse.y;
            }
        }

        // Handle hand card drag movement
        if (this.draggingHandCard && engine.mouse.down) {
            this.handCardDragX = engine.mouse.x;
            this.handCardDragY = engine.mouse.y;
        }

        // Handle hand card drag release
        if (this.draggingHandCard && !engine.mouse.down) {
            const card = this.draggingHandCard;
            const isPlayer1 = this.draggingHandCardIsPlayer1;
            const cardIndex = this.draggingHandCardIndex;
            const cost = card.cost || 0;

            // Check if dropped in sidebar area (right side) - enter view mode
            const sidebarX = this.boardX + this.boardW;
            const inSidebar = this.handCardDragX > sidebarX;

            // Check if dropped in orbit/battlefield zone
            const orbitZoneY = isPlayer1 ? this.midY + 40 : this.midY - 40;
            const inOrbitZone = Math.abs(this.handCardDragY - orbitZoneY) < 100 && !inSidebar;

            if (inSidebar) {
                // View mode - enlarge the card for inspection
                this.enlargedCard = { data: card, isHandCard: true };
            } else if (inOrbitZone) {
                // Check if any gate can afford the card
                const gate = this.findAvailableGate(cost, isPlayer1);
                if (gate) {
                    // Enter gate selection mode - let player choose which gate
                    this.startGateSelection(cardIndex, isPlayer1);
                } else {
                    this.showMessage('No gate with enough power!');
                }
            }
            // Reset drag state
            this.draggingHandCard = null;
            this.draggingHandCardIndex = -1;
        }

        // Double-click on hand card to enlarge (for inspection)
        // Use lastHoveredHandIndex to handle slight mouse movement during double-click
        if (engine.mouse.doubleClicked && !this.enlargedCard && !this.draggingHandCard) {
            const idx = this.hoveredHandIndex >= 0 ? this.hoveredHandIndex : this.lastHoveredHandIndex;
            if (idx >= 0) {
                const hand = this.localHand;
                if (idx < hand.length) {
                    this.enlargedCard = { data: hand[idx], isHandCard: true };
                }
            }
        }

        // Track last hovered index for double-click reliability
        if (this.hoveredHandIndex >= 0) {
            this.lastHoveredHandIndex = this.hoveredHandIndex;
            this.lastHoveredTime = performance.now();
        } else if (performance.now() - this.lastHoveredTime > 500) {
            // Clear after 500ms of not hovering
            this.lastHoveredHandIndex = -1;
        }

        // Double-click on battlefield card to enlarge
        if (engine.mouse.doubleClicked && this.hoveredBattlefieldCard && !this.enlargedCard) {
            this.enlargedCard = this.hoveredBattlefieldCard;
        }

        // Handle drag start for moving ground units to planet
        if (engine.mouse.clicked && this.hoveredBattlefieldCard && !this.draggingCard) {
            const card = this.hoveredBattlefieldCard;
            // In multiplayer, "my card" is determined by local player ownership
            // In single player, it's based on whose turn it is
            const isMyCard = this.isMultiplayer
                ? (card.isPlayer1 === this.isLocalPlayer1)
                : ((this.isPlayer1Turn && card.isPlayer1) || (!this.isPlayer1Turn && !card.isPlayer1));
            const inOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);

            // Can drag ground units from orbit to planet (if not summoning sick and not tapped)
            if (isMyCard && inOrbit && this.isGroundUnit(card) && !card.summoningSickness && !card.tapped && !card.movedThisTurn) {
                this.draggingCard = card;
                this.dragStartX = card.x;
                this.dragStartY = card.y;
            }
        }

        // Handle drag movement
        if (this.draggingCard && engine.mouse.down) {
            this.draggingCard.x = engine.mouse.x;
            this.draggingCard.y = engine.mouse.y;
        }

        // Handle drag release - check if dropped in planet zone
        if (this.draggingCard && !engine.mouse.down) {
            const card = this.draggingCard;
            // In multiplayer, the planet zone is always at the bottom for local player's cards
            // (because perspective is flipped for P2)
            const isLocalCard = this.isMultiplayer
                ? (card.isPlayer1 === this.isLocalPlayer1)
                : card.isPlayer1;  // In single player, P1 cards go to bottom
            const planetZoneY = isLocalCard ? this.midY + 80 : this.midY - 80;
            const inPlanetZone = Math.abs(engine.mouse.y - planetZoneY) < 60;

            if (inPlanetZone) {
                // Move to planet zone
                this.moveToPlanet(card);
            } else {
                // Snap back to original position
                card.x = this.dragStartX;
                card.y = this.dragStartY;
            }
            this.draggingCard = null;
        }

        // Handle clicks
        if (engine.mouse.clicked) {
            // DEBUG: Log click state
            console.log('CLICK DEBUG:', {
                selectingGate: this.selectingGate,
                equipmentCard: !!this.equipmentCard,
                hoveredBattlefieldCard: this.hoveredBattlefieldCard?.data?.name || null,
                inCombatSelection: this.inCombatSelection,
                combatAttackersCount: this.combatAttackers.length,
                isPlayer1Turn: this.isPlayer1Turn,
                isLocalPlayer1: this.isLocalPlayer1,
                canAct: this.canAct(),
                isMultiplayer: this.isMultiplayer
            });

            // If in gate selection mode
            if (this.selectingGate) {
                const gates = this.selectedCardIsPlayer1 ? this.p1Gates : this.p2Gates;
                const hand = this.selectedCardIsPlayer1 ? this.p1Hand : this.p2Hand;
                const card = hand[this.selectedCardIndex];
                const cost = card?.cost || 0;

                // Check if clicked on a valid gate
                for (const gate of gates) {
                    if (gate.hovered && !gate.used && gate.power >= cost) {
                        this.playCard(this.selectedCardIndex, this.selectedCardIsPlayer1, gate);
                        return;
                    }
                }

                // Clicked elsewhere - cancel selection
                this.cancelGateSelection();
                return;
            }

            // Equipment targeting mode
            if (this.equipmentCard && this.hoveredBattlefieldCard) {
                const target = this.hoveredBattlefieldCard;
                const isMyCard = (this.equipmentIsPlayer1 && target.isPlayer1) || (!this.equipmentIsPlayer1 && !target.isPlayer1);

                if (isMyCard && this.isValidEquipTarget(this.equipmentCard, target)) {
                    this.attachEquipment(this.equipmentCard, target);
                    this.equipmentCard = null;
                    return;
                } else {
                    this.showMessage('Invalid target for equipment!');
                    return;
                }
            }

            // Cancel equipment mode if clicking empty space
            if (this.equipmentCard && !this.hoveredBattlefieldCard) {
                this.showMessage('Equipment cancelled');
                // Return equipment to graveyard (it was already played)
                const graveyard = this.equipmentIsPlayer1 ? this.p1Graveyard : this.p2Graveyard;
                graveyard.add(this.equipmentCard);
                this.equipmentCard = null;
                return;
            }

            // Check battlefield card clicks
            if (this.hoveredBattlefieldCard) {
                const card = this.hoveredBattlefieldCard;
                // In multiplayer, "my card" is determined by local player ownership
                // In single player, it's based on whose turn it is
                const isMyCard = this.isMultiplayer
                    ? (card.isPlayer1 === this.isLocalPlayer1)
                    : ((this.isPlayer1Turn && card.isPlayer1) || (!this.isPlayer1Turn && !card.isPlayer1));

                // DEBUG: Log battlefield card click details
                console.log('BATTLEFIELD CLICK:', {
                    cardName: card.data?.name,
                    cardIsPlayer1: card.isPlayer1,
                    isMyCard,
                    cardTapped: card.tapped,
                    cardSummoningSickness: card.summoningSickness,
                    isDropship: this.isDropship(card),
                    isGroundUnit: this.isGroundUnit(card),
                    isOffensive: this.isOffensiveUnit(card),
                    power: card.power
                });

                // Determine card locations
                const isDefenderInOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);
                const isDefenderOnGround = this.p1Planet.includes(card) || this.p2Planet.includes(card);

                // If in combat selection mode, clicking enemy executes the combat stack
                if (this.inCombatSelection && this.combatAttackers.length > 0 && !isMyCard) {
                    // Check if this is a valid target for all attackers
                    // For simplicity, check if any attacker can hit this target
                    let canAttack = false;

                    for (const attacker of this.combatAttackers) {
                        const validTargets = this.getValidAttackTargets(attacker);
                        if (validTargets.includes(card)) {
                            canAttack = true;
                            break;
                        }
                    }

                    // Also check if clicking on generator
                    if (card === this.planetaryGenerator) {
                        canAttack = true;
                    }

                    if (canAttack) {
                        this.executeCombatStack(card);
                        return;
                    } else {
                        this.showMessage('Invalid target for selected attackers!');
                        return;
                    }
                }

                // Cancel combat selection if clicking elsewhere (not on friendly unit)
                if (this.inCombatSelection && !isMyCard) {
                    this.cancelCombatSelection();
                    return;
                }

                // Only interact with your own cards
                if (isMyCard) {
                    // Check if it's a dropship in orbit
                    if (this.isDropship(card)) {
                        const inOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);
                        if (inOrbit && !card.summoningSickness && !card.tapped) {
                            this.landDropship(card, card.isPlayer1);
                            return;
                        }
                    }

                    // Check if it's a carrier that can deploy tokens
                    if (this.canDeployToken(card)) {
                        this.deployTokens(card, card.isPlayer1);
                        return;
                    }

                    // Ground units in orbit are "bricks" - they can only be dragged to surface
                    const inOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);
                    const onPlanet = this.p1Planet.includes(card) || this.p2Planet.includes(card);

                    if (this.isGroundUnit(card) && inOrbit) {
                        if (!card.summoningSickness && !card.tapped && !card.movedThisTurn) {
                            this.showMessage('Drag to planet surface to deploy!');
                        } else if (card.summoningSickness) {
                            this.showMessage('Wait a turn, then drag to surface');
                        }
                        return;
                    }

                    // Check for Survey Team artifact discovery (must be on planet surface)
                    if (this.isSurveyTeam(card) && onPlanet && !card.tapped && !card.summoningSickness) {
                        this.attemptArtifactDiscovery(card, card.isPlayer1);
                        return;
                    }

                    // Check for Quantum Sensor activation (non-combatant)
                    if (this.isQuantumSensor(card) && !card.tapped && !card.summoningSickness) {
                        this.activateQuantumSensor(card, card.isPlayer1);
                        return;
                    }

                    // Check for Planetary Consciousness win condition
                    if (this.isPlanetaryConsciousness(card) && !card.tapped && !card.summoningSickness) {
                        if (this.attemptConsciousnessVictory(card.isPlayer1)) {
                            return;
                        }
                    }

                    // Enter combat selection mode or add to combat stack
                    // ONLY for offensive units (not Survey Teams, Harvesters, Science ships, etc.)
                    if (!card.summoningSickness && !card.tapped && card.power > 0 && this.isOffensiveUnit(card)) {
                        const inOrbit = this.p1Orbit.includes(card) || this.p2Orbit.includes(card);
                        const onGround = this.p1Planet.includes(card) || this.p2Planet.includes(card);

                        if (inOrbit || onGround) {
                            // Check for valid targets
                            const hasTargets = this.getValidAttackTargets(card).length > 0;
                            if (hasTargets) {
                                // Add to combat stack (MTG style - select multiple attackers)
                                if (this.addToCombatStack(card)) {
                                    this.inCombatSelection = true;
                                }
                                return;
                            } else {
                                this.showMessage('No valid targets!');
                                return;
                            }
                        }
                    }

                    // No manual untapping - only tap abilities are allowed
                    if (card.tapped) {
                        this.showMessage('Card is already tapped!');
                    } else if (card.summoningSickness) {
                        this.showMessage('Summoning sickness - wait a turn!');
                    } else if (!this.isOffensiveUnit(card) && card.power > 0) {
                        this.showMessage(`${card.data.name} is a non-combatant!`);
                    }
                }
                return;
            }

            // Hand cards are now played via drag-to-play (handled above)

            // Check gate clicks for current player (upgrade gate if not in selection mode)
            if (!this.selectingGate) {
                const gates = this.currentGates;
                for (const gate of gates) {
                    if (gate.hovered) {
                        this.incrementGate(gate);
                        return;
                    }
                }
            }

            // DEBUG: Click deck to draw a card
            if (this.p1Deck.hovered && this.isPlayer1Turn) {
                this.drawCardForPlayer(true);
                this.showMessage('DEBUG: Drew a card');
                return;
            }
            if (this.p2Deck.hovered && !this.isPlayer1Turn) {
                this.drawCardForPlayer(false);
                this.showMessage('DEBUG: Drew a card');
                return;
            }
        }
    }

    _updateHandHover(engine) {
        this.hoveredCard = null;
        this.hoveredHandIndex = -1;
        const mx = engine.mouse.x;
        const my = engine.mouse.y;

        // Don't update hover while dragging
        if (this.draggingHandCard) return;

        // Arena-style fan layout parameters (must match _renderHand)
        const cardW = 90;
        const cardH = 130;
        const centerX = this.boardX + this.boardW / 2;
        const arcRadius = 400;

        // Check local player's hand (bottom) - only if it's local player's turn
        const hand = this.localHand;
        if (this.isLocalTurn && hand.length > 0) {
            const baseY = engine.height + 20;
            const maxSpread = Math.min(hand.length * 0.08, 0.5);

            // Check cards in reverse order (rightmost/topmost first for overlap)
            for (let i = hand.length - 1; i >= 0; i--) {
                const t = hand.length === 1 ? 0 : (i / (hand.length - 1)) - 0.5;
                const angle = t * maxSpread;

                const cardX = centerX + Math.sin(angle) * arcRadius;
                const cardY = baseY - Math.cos(angle) * 80;

                // Hit test - account for pop-out position (card moves up 60px when hovered)
                const isCurrentlyHovered = this.hoveredHandIndex === i;
                const popOut = isCurrentlyHovered ? 60 : 0;
                const hitW = cardW;
                const hitH = cardH + popOut; // Extend hit area to include pop-out region
                const hitY = cardY - popOut; // Shift hit center up when popped out

                if (mx >= cardX - hitW/2 && mx <= cardX + hitW/2 &&
                    my >= hitY - hitH/2 && my <= hitY + hitH/2) {
                    this.hoveredHandIndex = i;
                    this.hoveredCard = hand[i];
                    this.hoveredCardPos = {
                        x: cardX,
                        y: cardY - popOut - cardH/2 - 20,
                        isPlayer1: this.isLocalPlayer1
                    };
                    return;
                }
            }
        }
    }

    renderUI(ctx, engine) {
        // Delegate all rendering to the renderer
        this.renderer.renderUI(ctx, engine);
    }

    // Check if a card is a carrier that can deploy tokens
    isCarrier(card) {
        const name = (card.data?.name || '').toLowerCase();
        const ability = (card.data?.ability || '').toLowerCase();
        return name.includes('carrier') && (ability.includes('deploy') || ability.includes('scout'));
    }

    // Check if carrier can deploy this turn (not tapped, not summoning sick)
    canDeployToken(card) {
        if (!this.isCarrier(card)) return false;
        if (card.tapped || card.summoningSickness) return false;
        // Check if already deployed this turn
        if (card.deployedThisTurn) return false;
        return true;
    }

    // Deploy tokens from a carrier
    deployTokens(carrier, isPlayer1, remote = false) {
        // Check multiplayer permissions (skip if remote action)
        if (!remote && this.isMultiplayer && !this.canAct()) {
            this.showMessage("Wait for your turn!");
            return false;
        }

        if (!this.canDeployToken(carrier)) {
            this.showMessage('Cannot deploy tokens!');
            return false;
        }

        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const name = (carrier.data?.name || '').toLowerCase();

        // Send action to multiplayer (if not a remote action)
        if (!remote && this.isMultiplayer && this.multiplayer) {
            const cardIndex = orbit.indexOf(carrier);
            if (cardIndex >= 0) {
                this.multiplayer.sendAction('deploy_tokens', {
                    cardIndex,
                    isPlayer1
                });
            }
        }

        // Determine what tokens to deploy
        let tokenData;
        let tokenCount = 1;

        if (name.includes('liberator')) {
            // Liberator Carrier deploys 2 Scout Ships
            tokenData = {
                name: 'Scout Ship',
                type: 'scout_ship',
                cost: 0,
                stats: { attack: 1, defense: 1, speed: 2 },
                ability: 'Deployed from Liberator Carrier.',
                art: 'Small Terran reconnaissance craft'
            };
            tokenCount = 2;
        } else if (name.includes('crystalline')) {
            // Crystalline Carrier deploys Crystal Shard Scouts
            tokenData = {
                name: 'Crystal Shard Scout',
                type: 'scout_ship',
                cost: 0,
                stats: { attack: 1, defense: 1, speed: 3 },
                ability: 'Deployed from Crystalline Carrier.',
                art: 'Small crystalline scout formation'
            };
            tokenCount = 1;
        } else {
            this.showMessage('Unknown carrier type!');
            return false;
        }

        // Deploy the tokens
        for (let i = 0; i < tokenCount; i++) {
            const token = new BattlefieldCard(tokenData, carrier.x, carrier.y, isPlayer1);
            token.summoningSickness = true;
            orbit.push(token);
        }

        // Mark carrier as having deployed this turn
        carrier.deployedThisTurn = true;

        this._layoutOrbit(isPlayer1);
        this.showMessage(`${carrier.data.name} deployed ${tokenCount} ${tokenData.name}${tokenCount > 1 ? 's' : ''}!`);

        return true;
    }

    // Combat ability delegation methods
    hasDoubleAttack(card) {
        return this.combatSystem.hasDoubleAttack(card);
    }

    cannotCounterAttack(card) {
        return this.combatSystem.cannotCounterAttack(card);
    }

    reflectsDamage(card) {
        return this.combatSystem.reflectsDamage(card);
    }

    getReflectedDamage(card) {
        return this.combatSystem.getReflectedDamage(card);
    }

    performCombatWithAbilities(attacker, defender) {
        return this.combatSystem.performCombatWithAbilities(attacker, defender);
    }

    // Apply Crystal Monolith growing defense at start of turn
    applyMonolithGrowth() {
        const monoliths = [...this.p1Planet, ...this.p2Planet, ...this.p1Orbit, ...this.p2Orbit]
            .filter(c => (c.data?.name || '').toLowerCase().includes('crystal monolith'));

        for (const monolith of monoliths) {
            monolith.currentToughness += 1;
            monolith.toughness += 1;
        }
    }

    // Reset per-turn flags at end of turn
    resetTurnFlags() {
        const allCards = [...this.p1Orbit, ...this.p2Orbit, ...this.p1Planet, ...this.p2Planet];
        for (const card of allCards) {
            card.deployedThisTurn = false;
            card.attackedTwice = false;
        }
    }

    // Check if card is Survey Team
    isSurveyTeam(card) {
        const name = (card.data?.name || '').toLowerCase();
        return name.includes('survey team');
    }

    // Check if card is Planetary Consciousness Core
    isPlanetaryConsciousness(card) {
        const name = (card.data?.name || '').toLowerCase();
        return name.includes('planetary consciousness');
    }

    // Attempt artifact discovery with Survey Team (10% + 1% per research point)
    attemptArtifactDiscovery(surveyTeam, isPlayer1, remote = false) {
        // Check multiplayer permissions (skip if remote action)
        if (!remote && this.isMultiplayer && !this.canAct()) {
            this.showMessage("Wait for your turn!");
            return;
        }

        // Find card index for multiplayer sync
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;
        let cardIndex = planet.indexOf(surveyTeam);
        let zone = 'planet';
        if (cardIndex < 0) {
            cardIndex = orbit.indexOf(surveyTeam);
            zone = 'orbit';
        }

        // Send action to multiplayer (if not a remote action)
        if (!remote && this.isMultiplayer && this.multiplayer && cardIndex >= 0) {
            this.multiplayer.sendAction('survey', {
                cardIndex,
                zone,
                isPlayer1
            });
        }

        surveyTeam.tap();

        // Grant 1 research point for surveying
        this.addResearch(1, isPlayer1);

        // Check if generator already exists
        if (this.planetaryGenerator) {
            this.showMessage('Planetary Shield Generator already discovered!');
            return;
        }

        // Calculate discovery chance (10% base + 1% per research point)
        const chance = this.getDiscoveryChance(isPlayer1);
        const roll = Math.random();

        if (roll < chance) {
            this.spawnPlanetaryGenerator(isPlayer1);
            this.showMessage('DISCOVERY! Planetary Shield Generator found!');
        } else {
            const research = isPlayer1 ? this.p1Research : this.p2Research;
            const messages = [
                `Survey found nothing... (${Math.round(chance * 100)}% chance)`,
                'No artifacts detected in this sector.',
                'Scanning... no significant finds.',
                `The search continues... (Research: ${research})`,
                'Survey complete. No artifacts found.'
            ];
            this.showMessage(messages[Math.floor(Math.random() * messages.length)]);
        }
    }

    // Spawn Planetary Shield Generator in center of board
    spawnPlanetaryGenerator(isPlayer1) {
        const generatorData = {
            name: 'Planetary Shield Generator',
            type: 'structure_planetside',
            cost: 0,
            stats: { attack: 0, defense: 4 },
            ability: 'Garrison units to add their stats. Control with Planetary Consciousness to win. When destroyed, flips to enemy control.',
            art: 'Massive energy projection facility with emitter towers'
        };

        // Spawn in very center of board
        const centerX = this.boardX + this.boardW / 2;
        const centerY = this.midY;

        this.planetaryGenerator = new BattlefieldCard(generatorData, centerX, centerY, isPlayer1);
        this.planetaryGenerator.summoningSickness = false; // Can be interacted with immediately
        this.planetaryGenerator.isGenerator = true;
        this.planetaryGenerator.garrisonedUnits = [];
    }

    // Garrison a unit to the generator
    garrisonToGenerator(unit, remote = false) {
        // Check multiplayer permissions (skip if remote action)
        if (!remote && this.isMultiplayer && !this.canAct()) {
            this.showMessage("Wait for your turn!");
            return;
        }

        if (!this.planetaryGenerator) {
            this.showMessage('No generator to garrison to!');
            return;
        }

        // Must be same owner
        if (unit.isPlayer1 !== this.planetaryGenerator.isPlayer1) {
            this.showMessage('Can only garrison to your own generator!');
            return;
        }

        // Remove unit from planet zone
        const planet = unit.isPlayer1 ? this.p1Planet : this.p2Planet;
        const idx = planet.indexOf(unit);
        if (idx === -1) {
            this.showMessage('Unit not found on planet!');
            return;
        }

        // Send action to multiplayer (if not a remote action)
        if (!remote && this.isMultiplayer && this.multiplayer) {
            this.multiplayer.sendAction('garrison', {
                cardIndex: idx,
                isPlayer1: unit.isPlayer1
            });
        }

        planet.splice(idx, 1);

        // Add unit stats to generator
        this.planetaryGenerator.power += unit.power;
        this.planetaryGenerator.toughness += unit.toughness;
        this.planetaryGenerator.currentToughness += unit.toughness;

        // Track garrisoned units
        this.planetaryGenerator.garrisonedUnits.push(unit.data);

        this._layoutPlanet(unit.isPlayer1);
        this.showMessage(`${unit.data.name} garrisoned! Generator is now ${this.planetaryGenerator.power}/${this.planetaryGenerator.currentToughness}`);
    }

    // Attempt to win with Planetary Consciousness Core
    attemptConsciousnessVictory(isPlayer1) {
        // Must control the generator
        if (!this.planetaryGenerator) {
            this.showMessage('No Planetary Shield Generator discovered yet!');
            return false;
        }

        if (this.planetaryGenerator.isPlayer1 !== isPlayer1) {
            this.showMessage('You do not control the Planetary Shield Generator!');
            return false;
        }

        // Find the Planetary Consciousness card
        const myPlanet = isPlayer1 ? this.p1Planet : this.p2Planet;
        const myOrbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const consciousness = [...myPlanet, ...myOrbit].find(c => this.isPlanetaryConsciousness(c));

        if (!consciousness) {
            this.showMessage('Planetary Consciousness Core not in play!');
            return false;
        }

        if (consciousness.tapped || consciousness.summoningSickness) {
            this.showMessage('Planetary Consciousness Core cannot activate!');
            return false;
        }

        // Victory!
        consciousness.tap();
        this.gameOver = true;
        this.winner = isPlayer1 ? 'Player 1' : 'Player 2';
        this.showMessage(`${this.winner} WINS! Planetary Consciousness achieved!`);
        return true;
    }

    // Flip generator control when destroyed
    flipGeneratorControl() {
        if (!this.planetaryGenerator) return;

        // Flip ownership
        this.planetaryGenerator.isPlayer1 = !this.planetaryGenerator.isPlayer1;

        // Reset stats to base
        this.planetaryGenerator.power = 0;
        this.planetaryGenerator.toughness = 4;
        this.planetaryGenerator.currentToughness = 4;
        this.planetaryGenerator.damage = 0;
        this.planetaryGenerator.garrisonedUnits = [];

        // Update colors
        this.planetaryGenerator.colors = this.planetaryGenerator.isPlayer1 ? {
            border: '#4ecdc4',
            bg1: '#1a3a4a',
            bg2: '#0a1520',
            accent: '#66fff0'
        } : {
            border: '#a855f7',
            bg1: '#2a1a3a',
            bg2: '#150a1a',
            accent: '#c084fc'
        };

        const newOwner = this.planetaryGenerator.isPlayer1 ? 'Player 1' : 'Player 2';
        this.showMessage(`Generator flipped! ${newOwner} now controls it!`);
    }

    // Check generator death (flips instead of dying)
    checkGeneratorDeath() {
        if (!this.planetaryGenerator) return;

        if (this.planetaryGenerator.currentToughness - this.planetaryGenerator.damage <= 0) {
            this.flipGeneratorControl();
        }
    }

    // Combat stack delegation methods
    cancelCombatSelection() {
        return this.combatSystem.cancelCombatSelection();
    }

    addToCombatStack(unit) {
        return this.combatSystem.addToCombatStack(unit);
    }

    executeCombatStack(defender, remote = false) {
        return this.combatSystem.executeCombatStack(defender, remote);
    }

    getAllAttackableCards(isPlayer1) {
        return this.combatSystem.getAllAttackableCards(isPlayer1);
    }

    isArtifact(card) {
        return this.combatSystem.isArtifact(card);
    }

    // Resource delegation methods
    grantsResearch(card) {
        return this.resourceManager.grantsResearch(card);
    }

    addResearch(amount, isPlayer1) {
        return this.resourceManager.addResearch(amount, isPlayer1);
    }

    getDiscoveryChance(isPlayer1) {
        return this.resourceManager.getDiscoveryChance(isPlayer1);
    }

    generateEnergy(isPlayer1) {
        return this.resourceManager.generateEnergy(isPlayer1);
    }

    spendEnergy(amount, isPlayer1) {
        return this.resourceManager.spendEnergy(amount, isPlayer1);
    }

    getEnergy(isPlayer1) {
        return this.resourceManager.getEnergy(isPlayer1);
    }

    // Regenerate defense for all cards at end of turn
    regenerateDefense() {
        const allCards = [...this.p1Orbit, ...this.p2Orbit, ...this.p1Planet, ...this.p2Planet];
        if (this.planetaryGenerator) {
            allCards.push(this.planetaryGenerator);
        }

        for (const card of allCards) {
            // Heal all damage
            card.damage = 0;
        }
    }

    // Check if card has multiple actions
    getMaxActions(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const name = (card.data?.name || '').toLowerCase();

        // Vanguard Elite attacks twice
        if (name.includes('vanguard elite') || ability.includes('attack twice')) {
            return 2;
        }

        // Consciousness Nexus grants extra action
        // Check if player has Consciousness Nexus
        const myCards = card.isPlayer1 ? [...this.p1Orbit, ...this.p1Planet] : [...this.p2Orbit, ...this.p2Planet];
        const hasNexus = myCards.some(c => (c.data?.name || '').toLowerCase().includes('consciousness nexus'));
        if (hasNexus) {
            return 2;
        }

        return 1;
    }

    // Use an action (returns true if more actions available)
    useAction(card) {
        if (!card.actionsUsed) card.actionsUsed = 0;
        card.actionsUsed++;

        const maxActions = this.getMaxActions(card);
        if (card.actionsUsed >= maxActions) {
            card.tap();
            return false;
        }
        return true;
    }

    // Reset actions at start of turn
    resetActions(isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;

        [...orbit, ...planet].forEach(c => {
            c.actionsUsed = 0;
        });
    }

    // Event system delegation methods
    executeEMPBlast(isPlayer1) {
        return this.eventSystem.executeEMPBlast(isPlayer1);
    }

    executeOrbitalStrikeEvent(target) {
        return this.eventSystem.executeOrbitalStrikeEvent(target);
    }

    // Draw a card (for Quantum Sensor)
    drawCardForPlayer(isPlayer1) {
        const card = this.drawCard(isPlayer1);
        if (card) {
            this.showMessage(`Drew ${card.name}!`);
        }
        return card;
    }

    isEvent(card) {
        return this.eventSystem.isEvent(card);
    }

    playEventCard(card, isPlayer1) {
        return this.eventSystem.playEventCard(card, isPlayer1);
    }

    // Check if a card is offensive (for AI targeting)
    isOffensiveUnit(card) {
        const name = (card.data?.name || '').toLowerCase();
        const type = (card.data?.type || '').toLowerCase();

        // Non-offensive units
        if (name.includes('survey') || name.includes('harvester') ||
            name.includes('mining') || name.includes('science') ||
            name.includes('emissary') || name.includes('explorer')) {
            return false;
        }

        // Support/utility types
        if (type.includes('mining') || type.includes('science') ||
            type.includes('support')) {
            return false;
        }

        // Must have attack power
        return card.power > 0;
    }

    // Quantum Sensor tap ability - draw a card
    activateQuantumSensor(card, isPlayer1, remote = false) {
        // Check multiplayer permissions (skip if remote action)
        if (!remote && this.isMultiplayer && !this.canAct()) {
            this.showMessage("Wait for your turn!");
            return false;
        }

        if (card.tapped || card.summoningSickness) {
            this.showMessage('Cannot activate Quantum Sensor!');
            return false;
        }

        // Find card index for multiplayer sync
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const planet = isPlayer1 ? this.p1Planet : this.p2Planet;
        let cardIndex = orbit.indexOf(card);
        let zone = 'orbit';
        if (cardIndex < 0) {
            cardIndex = planet.indexOf(card);
            zone = 'planet';
        }

        // Send action to multiplayer (if not a remote action)
        if (!remote && this.isMultiplayer && this.multiplayer && cardIndex >= 0) {
            this.multiplayer.sendAction('quantum_sensor', {
                cardIndex,
                zone,
                isPlayer1
            });
        }

        card.tap();
        this.drawCardForPlayer(isPlayer1);
        this.addResearch(1, isPlayer1); // Also grants 1 research
        return true;
    }

    // Check if card is Quantum Sensor
    isQuantumSensor(card) {
        return (card.data?.name || '').toLowerCase().includes('quantum sensor');
    }

    // Check if card is a ground unit (can be moved to planet)
    isGroundUnit(card) {
        const type = (card.data?.type || '').toLowerCase();
        return type.includes('surface') || type.includes('structure_planetside');
    }

    // Move a card from orbit to planet zone
    moveToPlanet(card, remote = false) {
        // Check multiplayer permissions (skip if remote action)
        if (!remote && this.isMultiplayer && !this.canAct()) {
            this.showMessage("Wait for your turn!");
            return false;
        }

        const orbit = card.isPlayer1 ? this.p1Orbit : this.p2Orbit;
        const planet = card.isPlayer1 ? this.p1Planet : this.p2Planet;

        const idx = orbit.indexOf(card);
        if (idx === -1) {
            this.showMessage('Card not in orbit!');
            return false;
        }

        // Send action to multiplayer (if not a remote action)
        if (!remote && this.isMultiplayer && this.multiplayer) {
            this.multiplayer.sendAction('move_to_planet', {
                cardIndex: idx,
                isPlayer1: card.isPlayer1
            });
        }

        // Remove from orbit
        orbit.splice(idx, 1);

        // Add to planet
        planet.push(card);

        // Mark as moved - can't do anything else this turn
        card.movedThisTurn = true;
        card.tap();
        card.actionsUsed = this.getMaxActions(card); // Exhaust all actions

        // Re-layout both zones
        this._layoutOrbit(card.isPlayer1);
        this._layoutPlanet(card.isPlayer1);

        this.showMessage(`${card.data.name} deployed to surface!`);
        return true;
    }

    _remoteMoveToPlanet(cardIndex, isPlayer1) {
        const orbit = isPlayer1 ? this.p1Orbit : this.p2Orbit;
        if (cardIndex >= 0 && cardIndex < orbit.length) {
            this.moveToPlanet(orbit[cardIndex], true);
        }
    }

    // Reset movedThisTurn flag at end of turn
    resetMovementFlags() {
        const allCards = [...this.p1Orbit, ...this.p2Orbit, ...this.p1Planet, ...this.p2Planet];
        for (const card of allCards) {
            card.movedThisTurn = false;
        }
    }
}
