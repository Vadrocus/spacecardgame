/**
 * ResourceManager - Handles resources: gates, research, energy
 * Manages gate creation/upgrades, research points, and energy generation
 */

import { Gate } from '../entities/Gate.js';

export class ResourceManager {
    constructor(game) {
        this.game = game;
    }

    // Add a new gate for current player
    addGate() {
        const g = this.game;
        // Check multiplayer permissions
        if (g.isMultiplayer && !g.canAct()) {
            g.showMessage("Wait for your turn!");
            return false;
        }

        if (g.gateActionUsed) {
            g.showMessage('Already used gate action!');
            return false;
        }
        const gates = g.currentGates;
        const newGate = new Gate(0, 0, g.isPlayer1Turn);
        gates.push(newGate);
        g.gateActionUsed = true;
        g.showMessage('New gate added!');
        g._layoutGates();

        // Send to multiplayer
        if (g.isMultiplayer && g.multiplayer) {
            g.multiplayer.sendAction('add_gate', { isPlayer1: g.isPlayer1Turn });
        }

        return true;
    }

    // Increment a gate
    incrementGate(gate) {
        const g = this.game;
        // Check multiplayer permissions
        if (g.isMultiplayer && !g.canAct()) {
            g.showMessage("Wait for your turn!");
            return false;
        }

        if (g.gateActionUsed) {
            g.showMessage('Already used gate action!');
            return false;
        }
        const gateIndex = g.currentGates.indexOf(gate);
        gate.increment();
        g.gateActionUsed = true;
        g.showMessage(`Gate upgraded to ${gate.power}!`);

        // Send to multiplayer
        if (g.isMultiplayer && g.multiplayer) {
            g.multiplayer.sendAction('increment_gate', { gateIndex, isPlayer1: g.isPlayer1Turn });
        }

        return true;
    }

    // Find a gate that can pay for this cost (unused and power >= cost)
    findAvailableGate(cost, isPlayer1) {
        const g = this.game;
        const gates = isPlayer1 ? g.p1Gates : g.p2Gates;
        return gates.find(gate => !gate.used && gate.power >= cost);
    }

    // Check if card grants research points
    grantsResearch(card) {
        const ability = (card.data?.ability || '').toLowerCase();
        const special = (card.data?.special || '').toLowerCase();
        return ability.includes('research') || ability.includes('science') ||
               ability.includes('scan') || special.includes('research');
    }

    // Add research points
    addResearch(amount, isPlayer1) {
        const g = this.game;
        if (isPlayer1) {
            g.p1Research += amount;
        } else {
            g.p2Research += amount;
        }
        g.showMessage(`+${amount} Research Point${amount > 1 ? 's' : ''}!`);
    }

    // Get generator discovery chance (10% base + 1% per research point)
    getDiscoveryChance(isPlayer1) {
        const g = this.game;
        const research = isPlayer1 ? g.p1Research : g.p2Research;
        return 0.1 + (research * 0.01); // 10% + 1% per point
    }

    // Generate energy from structures
    generateEnergy(isPlayer1) {
        const g = this.game;
        const orbit = isPlayer1 ? g.p1Orbit : g.p2Orbit;
        const planet = isPlayer1 ? g.p1Planet : g.p2Planet;
        const allCards = [...orbit, ...planet];

        let energyGenerated = 0;
        let maxEnergyBonus = 0;

        for (const card of allCards) {
            const ability = (card.data?.ability || '').toLowerCase();
            const type = (card.data?.type || '').toLowerCase();

            // Check for energy generation
            const genMatch = ability.match(/generates?\s*(\d+)\s*energy/i);
            if (genMatch) {
                energyGenerated += parseInt(genMatch[1]);
            }

            // Orbital Factory generates 1 energy
            if ((card.data?.name || '').toLowerCase().includes('orbital factory')) {
                energyGenerated += 1;
            }

            // Crystal Nexus/Cathedral generate energy
            if ((card.data?.name || '').toLowerCase().includes('crystal nexus')) {
                energyGenerated += 1;
                maxEnergyBonus += 3; // Can store up to 3 excess
            }
            if ((card.data?.name || '').toLowerCase().includes('crystal cathedral')) {
                energyGenerated += 3;
            }
        }

        if (isPlayer1) {
            g.p1Energy += energyGenerated;
            g.p1MaxEnergy = 10 + maxEnergyBonus; // Base 10 + bonuses
            g.p1Energy = Math.min(g.p1Energy, g.p1MaxEnergy);
        } else {
            g.p2Energy += energyGenerated;
            g.p2MaxEnergy = 10 + maxEnergyBonus;
            g.p2Energy = Math.min(g.p2Energy, g.p2MaxEnergy);
        }

        if (energyGenerated > 0) {
            g.showMessage(`Generated ${energyGenerated} energy!`);
        }
    }

    // Spend energy
    spendEnergy(amount, isPlayer1) {
        const g = this.game;
        if (isPlayer1) {
            if (g.p1Energy >= amount) {
                g.p1Energy -= amount;
                return true;
            }
        } else {
            if (g.p2Energy >= amount) {
                g.p2Energy -= amount;
                return true;
            }
        }
        return false;
    }

    // Get current energy
    getEnergy(isPlayer1) {
        const g = this.game;
        return isPlayer1 ? g.p1Energy : g.p2Energy;
    }
}
