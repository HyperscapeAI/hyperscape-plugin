/**
 * Plugin Information Providers for Hyperscape Plugin
 *
 * Two dynamic providers:
 * 1. hyperscapeInstructionsProvider - Usage instructions for the agent/LLM
 * 2. hyperscapeSettingsProvider - Current configuration (non-sensitive)
 *
 * WHY these providers:
 * - Help the LLM understand what actions are available in the game
 * - Prevent hallucination of non-existent commands
 * - Show current connection status so LLM knows if it can act
 * - Provide game-specific best practices
 */

import type { IAgentRuntime, Provider, ProviderResult, Memory, State } from '@elizaos/core';
import { HyperscapeService } from '../services/HyperscapeService.js';

/**
 * Instructions Provider
 *
 * Provides usage instructions for the Hyperscape plugin.
 * Helps the agent understand and explain game capabilities.
 */
export const hyperscapeInstructionsProvider: Provider = {
    name: 'hyperscapeInstructions',
    description: 'Instructions and capabilities for the Hyperscape game plugin',
    dynamic: true,

    get: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> => {
        const service = runtime.getService<HyperscapeService>('hyperscapeService');
        const isConnected = service?.isConnected() ?? false;

        const instructions = `
# Hyperscape Game Plugin

## What This Plugin Does

Hyperscape is a 3D multiplayer RPG. This plugin connects you to the game as a real player with:
- A physical avatar with health, stamina, skills
- Inventory and equipment
- Ability to move, fight, gather, and socialize

## Connection Status

${isConnected ? '✅ **Connected** - You can perform game actions' : '❌ **Not Connected** - Game actions will fail until connected'}

## Available Actions

### Movement
- **MOVE_TO**: Move to coordinates \`{ x, y, z }\`
- **FOLLOW_ENTITY**: Follow a player or NPC by name/ID
- **STOP_MOVEMENT**: Stop current movement

### Combat
- **ATTACK_ENTITY**: Attack a target (player, NPC, or mob)
- **CHANGE_COMBAT_STYLE**: Switch between melee/ranged/magic

### Gathering Skills
- **CHOP_TREE**: Chop a nearby tree (requires axe)
- **CATCH_FISH**: Fish at a fishing spot (requires rod)
- **LIGHT_FIRE**: Light a campfire
- **COOK_FOOD**: Cook food on a fire

### Inventory
- **EQUIP_ITEM**: Equip an item from inventory
- **USE_ITEM**: Use a consumable item
- **DROP_ITEM**: Drop an item on the ground

### Banking
- **BANK_DEPOSIT**: Deposit items/coins at a bank
- **BANK_WITHDRAW**: Withdraw items/coins from bank

### Social
- **CHAT_MESSAGE**: Send a chat message to nearby players
- **FIND_PLAYER**: Search for a player by name (uses presence history)

### Autonomous
- **EXPLORE**: Move to discover new areas
- **FLEE**: Run away from danger
- **IDLE**: Stand still and observe
- **APPROACH_ENTITY**: Move toward a specific entity

### Goals
- **SET_GOAL**: Set a new objective
- **NAVIGATE_TO**: Navigate toward goal location

## Best Practices

1. **Check Health**: Before combat, check your health in gameState
2. **Inventory Space**: Check free slots before gathering
3. **Flee When Low**: If health < 30%, consider fleeing
4. **Respect Others**: Don't spam chat or grief other players
5. **Use Context**: Check nearbyEntities to see what's around you

## Common Scenarios

### "I want to train woodcutting"
1. Check inventory for axe (EQUIP if needed)
2. Use nearbyEntities to find trees
3. MOVE_TO the tree location
4. CHOP_TREE

### "I'm being attacked"
1. Check health - if low, FLEE
2. If healthy, ATTACK_ENTITY the attacker
3. After combat, USE_ITEM food to heal

### "Where is my friend?"
1. Use FIND_PLAYER with their name
2. Check both nearby and historical presence
3. MOVE_TO their last known location
`;

        return {
            text: instructions.trim(),
            data: {
                pluginName: 'hyperscape',
                platform: 'Hyperscape',
                isConnected,
                actionCategories: {
                    movement: ['MOVE_TO', 'FOLLOW_ENTITY', 'STOP_MOVEMENT'],
                    combat: ['ATTACK_ENTITY', 'CHANGE_COMBAT_STYLE'],
                    skills: ['CHOP_TREE', 'CATCH_FISH', 'LIGHT_FIRE', 'COOK_FOOD'],
                    inventory: ['EQUIP_ITEM', 'USE_ITEM', 'DROP_ITEM'],
                    banking: ['BANK_DEPOSIT', 'BANK_WITHDRAW'],
                    social: ['CHAT_MESSAGE', 'FIND_PLAYER'],
                    autonomous: ['EXPLORE', 'FLEE', 'IDLE', 'APPROACH_ENTITY'],
                    goals: ['SET_GOAL', 'NAVIGATE_TO'],
                },
            },
        };
    },
};

/**
 * Settings Provider
 *
 * Exposes current Hyperscape configuration (non-sensitive values only).
 * NEVER exposes tokens or secrets.
 */
export const hyperscapeSettingsProvider: Provider = {
    name: 'hyperscapeSettings',
    description: 'Current Hyperscape plugin configuration (non-sensitive)',
    dynamic: true,

    get: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> => {
        const service = runtime.getService<HyperscapeService>('hyperscapeService');

        // Get connection state
        const isConnected = service?.isConnected() ?? false;
        const gameState = isConnected ? service?.getGameState() : null;

        // Get non-sensitive settings
        const serverUrlRaw = runtime.getSetting('HYPERSCAPE_SERVER_URL');
        const serverUrl = typeof serverUrlRaw === 'string' ? serverUrlRaw : 'ws://localhost:5555/ws';
        const autoReconnect = runtime.getSetting('HYPERSCAPE_AUTO_RECONNECT') !== 'false';

        // Mask the server URL for privacy (show host but not full path)
        const maskedUrl = serverUrl.replace(/^(wss?:\/\/[^/]+).*$/, '$1/...');

        // Get player entity from game state
        const playerEntity = gameState?.playerEntity;

        const settings = {
            // Connection status
            isConnected,
            serverUrl: maskedUrl,
            autoReconnect,

            // Player info (if connected)
            playerName: playerEntity?.name || null,
            playerHealth: playerEntity?.health?.current ?? null,
            playerMaxHealth: playerEntity?.health?.max ?? null,
            playerPosition: playerEntity?.position || null,

            // Optional plugin enhancements
            hasHomeostasis: !!runtime.getService('homeostasis'),
            hasGoals: !!runtime.getService('goals'),
            hasPresence: !!runtime.getService('presence'),
            hasSkills: !!runtime.getService('skills'),
        };

        const text = `
# Hyperscape Plugin Settings

## Connection Status
- **Connected**: ${settings.isConnected ? 'Yes ✅' : 'No ❌'}
- **Server**: ${settings.serverUrl}
- **Auto-Reconnect**: ${settings.autoReconnect ? 'Enabled' : 'Disabled'}

${settings.isConnected && settings.playerName ? `
## Player Status
- **Character**: ${settings.playerName}
- **Health**: ${settings.playerHealth}/${settings.playerMaxHealth}
- **Position**: [${settings.playerPosition?.join(', ') || 'Unknown'}]
` : ''}

## Progressive Enhancements
- **Homeostasis** (emotional impact): ${settings.hasHomeostasis ? 'Active ✅' : 'Not installed'}
- **Goals** (goal tracking): ${settings.hasGoals ? 'Active ✅' : 'Not installed'}
- **Presence** (cross-domain): ${settings.hasPresence ? 'Active ✅' : 'Not installed'}
- **Skills** (namespaced): ${settings.hasSkills ? 'Active ✅' : 'Not installed'}

${!settings.isConnected ? `
## Troubleshooting
⚠️ Not connected to game server. Check:
1. Is the Hyperscape server running?
2. Is HYPERSCAPE_SERVER_URL correct?
3. Check logs for connection errors
` : ''}
`;

        return {
            text: text.trim(),
            data: settings,
            values: {
                isConnected: String(settings.isConnected),
                autoReconnect: String(settings.autoReconnect),
                hasHomeostasis: String(settings.hasHomeostasis),
                hasGoals: String(settings.hasGoals),
                hasPresence: String(settings.hasPresence),
                hasSkills: String(settings.hasSkills),
            },
        };
    },
};
