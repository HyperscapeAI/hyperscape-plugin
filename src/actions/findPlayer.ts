/**
 * FIND_PLAYER Action
 * 
 * WHY THIS ACTION EXISTS:
 * Players often need to locate specific entities in the game world.
 * "Where is Bob?" "Have you seen Alice?" "Find my friend"
 * 
 * This action bridges the gap between:
 * - Current presence (who's nearby right now)
 * - Historical presence (where we last saw someone)
 * - Actionable search (actively looking for someone)
 * 
 * PROGRESSIVE ENHANCEMENT:
 * - Without plugin-presence: Uses HyperscapeService.getNearbyEntities()
 * - With plugin-presence: Also searches historical sightings
 * 
 * WHY AS AN ACTION:
 * This is something the agent decides to do based on conversation.
 * "I'll help you find Bob" → triggers FIND_PLAYER action
 */

import type { Action, ActionExample, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { logger } from '@elizaos/core';
import type { HyperscapeService } from '../services/HyperscapeService.js';
import type { PresenceService } from '@elizaos/plugin-presence';

/**
 * Search parameters extracted from message
 */
interface FindPlayerParams {
    playerName: string;
    searchReason?: string;
}

/**
 * Result of a player search
 */
interface PlayerSearchResult {
    found: boolean;
    playerName: string;
    nearbyMatch?: {
        id: string;
        name: string;
        distance: number;
        direction?: string;
        activity?: string;
    };
    historyMatch?: {
        entityId: string;
        displayName?: string;
        lastLocation?: string | [number, number, number];
        lastSeenAt: number;
        timeSinceMs: number;
        sightingCount: number;
    };
    suggestions?: string[];
}

export const findPlayerAction: Action = {
    name: 'FIND_PLAYER',
    description: 'Search for a specific player in the game world by name. Uses both current nearby presence and historical sightings.',

    similes: [
        'LOCATE_PLAYER',
        'SEARCH_FOR_PLAYER',
        'WHERE_IS_PLAYER',
        'FIND_FRIEND',
        'LOCATE_FRIEND',
    ],

    examples: [
        [
            {
                name: '{{user1}}',
                content: { text: "Have you seen Bob around?" },
            },
            {
                name: '{{agentName}}',
                content: {
                    text: "Let me look for Bob...",
                    actions: ['FIND_PLAYER'],
                },
            },
        ],
        [
            {
                name: '{{user1}}',
                content: { text: "Where is my friend Alice?" },
            },
            {
                name: '{{agentName}}',
                content: {
                    text: "I'll search for Alice in my area.",
                    actions: ['FIND_PLAYER'],
                },
            },
        ],
        [
            {
                name: '{{user1}}',
                content: { text: "Can you find the player named CoolDude99?" },
            },
            {
                name: '{{agentName}}',
                content: {
                    text: "Searching for CoolDude99...",
                    actions: ['FIND_PLAYER'],
                },
            },
        ],
    ] as ActionExample[][],

    /**
     * Validate that we can perform a player search
     */
    async validate(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> {
        const hsService = runtime.getService<HyperscapeService>('hyperscapeService');

        if (!hsService?.isConnected()) {
            logger.debug('[FIND_PLAYER] Not connected to Hyperscape');
            return false;
        }

        return true;
    },

    /**
     * Execute the player search
     */
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: Record<string, unknown>,
        callback?: HandlerCallback,
    ) => {
        try {
            // Extract search parameters from conversation
            const params = extractSearchParams(message);
            if (!params) {
                callback?.({ text: "I'm not sure who you want me to find. Can you tell me their name?" });
                return;
            }

            logger.info(`[FIND_PLAYER] Searching for player: ${params.playerName}`);

            // Perform the search
            const result = await searchForPlayer(runtime, params.playerName);

            // Format response
            const response = formatSearchResponse(result, params);
            callback?.({ text: response });
        } catch (error) {
            logger.error(`[FIND_PLAYER] Error: ${error instanceof Error ? error.message : String(error)}`);
            callback?.({ text: "I encountered an error while searching. Please try again." });
        }
    },
};

/**
 * Extract player name from message text using pattern matching
 * 
 * WHY simple parsing: LLM calls are expensive for simple extractions.
 * Most "find player" requests follow predictable patterns:
 * - "find Bob"
 * - "where is Alice"
 * - "have you seen CoolDude99"
 * - "locate player DarkKnight"
 */
function extractSearchParams(message: Memory): FindPlayerParams | null {
    const text = (message.content?.text || '').trim();
    if (!text) return null;

    // Patterns to extract player names
    const patterns = [
        // "find [player]"
        /\bfind\s+(?:player\s+)?([A-Za-z0-9_]+)/i,
        // "locate [player]"
        /\blocate\s+(?:player\s+)?([A-Za-z0-9_]+)/i,
        // "where is [player]"
        /\bwhere\s+is\s+(?:player\s+)?([A-Za-z0-9_]+)/i,
        // "have you seen [player]"
        /\bhave\s+you\s+seen\s+(?:player\s+)?([A-Za-z0-9_]+)/i,
        // "seen [player]"
        /\bseen\s+(?:player\s+)?([A-Za-z0-9_]+)/i,
        // "looking for [player]"
        /\blooking\s+for\s+(?:player\s+)?([A-Za-z0-9_]+)/i,
        // "search for [player]"
        /\bsearch\s+(?:for\s+)?(?:player\s+)?([A-Za-z0-9_]+)/i,
        // "[player] around"
        /\b([A-Za-z0-9_]+)\s+around\??/i,
        // "my friend [player]"
        /\bmy\s+friend\s+([A-Za-z0-9_]+)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const playerName = match[1].trim();
            // Skip common words that aren't player names
            const skipWords = ['the', 'a', 'an', 'is', 'my', 'your', 'their', 'anyone', 'someone', 'player'];
            if (!skipWords.includes(playerName.toLowerCase()) && playerName.length >= 2) {
                return { playerName };
            }
        }
    }

    return null;
}

/**
 * Search for a player using all available sources
 */
async function searchForPlayer(
    runtime: IAgentRuntime,
    playerName: string,
): Promise<PlayerSearchResult> {
    const result: PlayerSearchResult = {
        found: false,
        playerName,
    };

    const hsService = runtime.getService<HyperscapeService>('hyperscapeService');
    if (!hsService) {
        return result;
    }

    // 1. Check nearby entities first (fastest, most relevant)
    const nearbyEntities = hsService.getNearbyEntities();
    const player = hsService.getPlayerEntity();
    const searchLower = playerName.toLowerCase();

    for (const entity of nearbyEntities) {
        if (!entity.name) continue;

        const nameLower = entity.name.toLowerCase();
        if (nameLower === searchLower || nameLower.includes(searchLower) || searchLower.includes(nameLower)) {
            // Calculate distance if we have positions
            let distance = 0;
            let direction: string | undefined;

            if (player?.position && entity.position) {
                const dx = entity.position[0] - player.position[0];
                const dz = entity.position[2] - player.position[2];
                distance = Math.sqrt(dx * dx + dz * dz);

                // Calculate direction
                const angle = Math.atan2(dz, dx) * (180 / Math.PI);
                direction = getCardinalDirection(angle);
            }

            result.nearbyMatch = {
                id: entity.id,
                name: entity.name,
                distance: Math.round(distance),
                direction,
                activity: 'inCombat' in entity && entity.inCombat ? 'in combat' : undefined,
            };
            result.found = true;
            break;
        }
    }

    // 2. If not found nearby, check historical presence (progressive enhancement)
    if (!result.nearbyMatch) {
        try {
            const presenceModule = await import('@elizaos/plugin-presence');
            const PresenceServiceClass = (presenceModule as Record<string, unknown>).PresenceService as { serviceType: string } | undefined;

            if (PresenceServiceClass) {
                const presenceService = runtime.getService(PresenceServiceClass.serviceType) as unknown as PresenceService | undefined;

                if (presenceService) {
                    // Search by name including history
                    const searchResults = presenceService.searchByName({
                        name: playerName,
                        domain: 'hyperscape',
                        includeHistory: true,
                    });

                    if (searchResults.length > 0) {
                        const bestMatch = searchResults[0];

                        // If currently visible
                        if (bestMatch.currentPresence) {
                            result.nearbyMatch = {
                                id: bestMatch.entityId,
                                name: bestMatch.displayName || bestMatch.entityId,
                                distance: bestMatch.currentPresence.context?.distance || 0,
                                direction: bestMatch.currentPresence.context?.metadata?.direction as string | undefined,
                                activity: bestMatch.currentPresence.context?.activity,
                            };
                            result.found = true;
                        }
                        // If only in history
                        else if (bestMatch.history) {
                            result.historyMatch = {
                                entityId: bestMatch.history.entityId,
                                displayName: bestMatch.history.displayName,
                                lastLocation: bestMatch.history.lastLocation,
                                lastSeenAt: bestMatch.history.lastSeenAt,
                                timeSinceMs: Date.now() - bestMatch.history.lastSeenAt,
                                sightingCount: bestMatch.history.sightingCount,
                            };
                            result.found = true;
                        }
                    }

                    // Add suggestions from recently seen players if search failed
                    if (!result.found) {
                        const recentlySeen = presenceService.getRecentlySeen('hyperscape', 3600000); // Last hour
                        const suggestions = recentlySeen
                            .filter(h => h.displayName)
                            .map(h => h.displayName!)
                            .slice(0, 5);

                        if (suggestions.length > 0) {
                            result.suggestions = suggestions;
                        }
                    }
                }
            }
        } catch {
            // plugin-presence not available, that's fine
            logger.debug('[FIND_PLAYER] plugin-presence not available for history search');
        }
    }

    return result;
}

/**
 * Format the search result as a human-readable response
 */
function formatSearchResponse(result: PlayerSearchResult, params: FindPlayerParams): string {
    if (result.nearbyMatch) {
        const { name, distance, direction, activity } = result.nearbyMatch;
        let response = `Found ${name}! They're ${distance}m away`;
        if (direction) {
            response += ` to the ${direction}`;
        }
        if (activity) {
            response += ` (${activity})`;
        }
        return response + '.';
    }

    if (result.historyMatch) {
        const { displayName, lastLocation, timeSinceMs, sightingCount } = result.historyMatch;
        const timeAgo = formatTimeAgo(timeSinceMs);
        const name = displayName || params.playerName;

        let response = `I haven't seen ${name} nearby, but I last saw them ${timeAgo}`;

        if (lastLocation) {
            if (Array.isArray(lastLocation)) {
                response += ` near coordinates (${lastLocation.map(Math.round).join(', ')})`;
            } else {
                response += ` at ${lastLocation}`;
            }
        }

        if (sightingCount > 1) {
            response += `. I've seen them ${sightingCount} times total`;
        }

        return response + '.';
    }

    // Not found
    let response = `I couldn't find anyone named "${params.playerName}" nearby or in my memory.`;

    if (result.suggestions && result.suggestions.length > 0) {
        response += ` Did you mean one of these players I've seen recently? ${result.suggestions.join(', ')}`;
    }

    return response;
}

/**
 * Convert angle to cardinal direction
 */
function getCardinalDirection(angle: number): string {
    const directions = ['east', 'northeast', 'north', 'northwest', 'west', 'southwest', 'south', 'southeast'];
    const index = Math.round(((angle + 180) % 360) / 45) % 8;
    return directions[index];
}

/**
 * Format milliseconds as human-readable time
 */
function formatTimeAgo(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return hours === 1 ? 'about an hour ago' : `about ${hours} hours ago`;
    }
    if (minutes > 0) {
        return minutes === 1 ? 'about a minute ago' : `about ${minutes} minutes ago`;
    }
    return 'just now';
}

