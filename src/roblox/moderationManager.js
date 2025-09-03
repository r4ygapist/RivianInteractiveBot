// roblox/moderationManager.js
const { EmbedBuilder } = require('discord.js');
const { randomUUID } = require('crypto');
const config = require('../config');

let discordClient;
// In-memory store for actions queued from Discord to be picked up by the game.
// Key: targetRobloxId (string), Value: Array of action objects
const pendingActions = new Map();

/**
 * Queues a new moderation action from a Discord command.
 * @param {object} actionDetails - The details of the action to be performed.
 */
function queueAction(actionDetails) {
    const action = {
        ...actionDetails,
        actionId: randomUUID(), // Give each action a unique ID to track completion
    };

    const userActions = pendingActions.get(action.targetRobloxId) || [];
    userActions.push(action);
    pendingActions.set(action.targetRobloxId, userActions);
    console.log(`[Moderation] Queued action '${action.actionType}' for Roblox ID ${action.targetRobloxId}.`);
}


/**
 * Handles incoming moderation action reports from Roblox to be logged in Discord.
 * This is called by the in-game admin system (_G.ReportModerationAction).
 */
async function handleLogAction(req, res) {
    const { actionType, targetRobloxUsername, reason, moderatorRobloxUsername, duration } = req.body;

    const logEmbed = new EmbedBuilder()
        .setTitle(`In-Game Moderation: ${actionType.toUpperCase()}`)
        .setColor(actionType.toLowerCase() === 'ban' ? '#E74C3C' : '#F1C40F')
        .addFields(
            { name: 'Target', value: targetRobloxUsername, inline: true },
            { name: 'Moderator', value: moderatorRobloxUsername, inline: true },
            { name: 'Reason', value: reason || 'No reason provided.' },
            { name: 'Duration', value: duration || 'N/A', inline: true },
        )
        .setFooter({ text: 'Action performed in-game' })
        .setTimestamp();

    try {
        const logChannel = await discordClient.channels.fetch(config.moderation.logChannelId);
        if (logChannel) {
            await logChannel.send({ embeds: [logEmbed] });
        }
        res.status(200).json({ status: 'ok' });
    } catch (error)
    {
        console.error('[Moderation] Failed to send log to Discord:', error);
        res.status(500).json({ error: 'Failed to send Discord log.' });
    }
}


/**
 * Called by the Roblox server every few seconds to check if there are pending actions for online players.
 */
async function handleGetActions(req, res) {
    const { userIds } = req.body; // Expects an array of online Roblox user IDs as strings
    if (!Array.isArray(userIds)) {
        return res.status(400).json({ status: "error", message: "Invalid payload. userIds must be an array." });
    }

    const actionsToRelay = [];
    for (const userId of userIds) {
        if (pendingActions.has(userId)) {
            actionsToRelay.push(...pendingActions.get(userId));
        }
    }

    if (actionsToRelay.length > 0) {
        return res.status(200).json({ status: "found", actions: actionsToRelay });
    } else {
        return res.status(200).json({ status: "not_found" });
    }
}

/**
 * Called by the Roblox server after it has successfully applied an action.
 * This removes the action from the queue so it doesn't get sent again.
 */
async function handleCompleteAction(req, res) {
    const { actionId } = req.params;
    let found = false;
    for (const [robloxId, actions] of pendingActions.entries()) {
        const filteredActions = actions.filter(action => action.actionId !== actionId);
        if (filteredActions.length < actions.length) {
            found = true;
            if (filteredActions.length === 0) {
                pendingActions.delete(robloxId);
            } else {
                pendingActions.set(robloxId, filteredActions);
            }
            console.log(`[Moderation] Completed action ${actionId}.`);
            break; // Assume actionId is unique
        }
    }
    res.status(200).json({ status: found ? 'completed' : 'not_found' });
}


module.exports = {
    init: (client) => {
        discordClient = client;
    },
    queueAction,
    handleLogAction,
    handleGetActions,
    handleCompleteAction,
};