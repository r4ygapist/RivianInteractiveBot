// roblox/dispatchManager.js
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { GatewayIntentBits } = require('discord.js');
const config = require('../config');
const axios = require('axios');

const announcementQueue = [];
let isPlaying = false;
let voiceConnection = null;
let discordClient;

/**
 * Creates a playable audio stream from text using Google's TTS service.
 */
async function createTTSStream(text) {
    try {
        // By changing "tl=en" to "tl=en-gb", we switch to a British English voice.
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en-gb&client=tw-ob`;
        const response = await axios({
            method: 'get',
            url: ttsUrl,
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return response.data;
    } catch (error) {
        console.error('[Dispatch] Failed to fetch TTS audio stream:', error.message);
        return null;
    }
}

/**
 * Connects the bot to the configured dispatch voice channel.
 */
async function connectToChannel() {
    if (!discordClient) return;
    try {
        const guild = await discordClient.guilds.fetch(config.discord.guildId);
        if (!guild) return;

        const channel = await guild.channels.fetch(config.moderation.dispatchVoiceChannelId);
        if (!channel || !channel.isVoiceBased()) {
            console.error("[Dispatch] Invalid or missing dispatch voice channel ID.");
            return;
        }

        voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        voiceConnection.on(VoiceConnectionStatus.Ready, () => {
            console.log('[Dispatch] Voice connection is ready.');
            processQueue(); // Start processing any queued items on connect
        });

        voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                console.log('[Dispatch] Voice connection disconnected. Attempting to reconnect...');
                await Promise.race([
                    entersState(voiceConnection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(voiceConnection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                console.log('[Dispatch] Reconnection failed, destroying connection.');
                if (voiceConnection) voiceConnection.destroy();
                voiceConnection = null;
                setTimeout(() => connectToChannel(), 5000); // Attempt a full reconnect after 5s
            }
        });

    } catch (e) {
        console.error('[Dispatch] Could not connect to voice channel:', e);
    }
}

/**
 * Processes the next announcement in the queue.
 */
async function processQueue() {
    if (isPlaying || announcementQueue.length === 0 || !voiceConnection || voiceConnection.state.status !== VoiceConnectionStatus.Ready) {
        return;
    }
    isPlaying = true;

    const announcementText = announcementQueue.shift();
    
    try {
        const audioStream = await createTTSStream(announcementText);
        if (!audioStream) {
            isPlaying = false;
            processQueue();
            return;
        }
        
        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        const subscription = voiceConnection.subscribe(player);
        const resource = createAudioResource(audioStream);
        player.play(resource);

        player.once('idle', () => {
            subscription?.unsubscribe();
            player.stop();
            isPlaying = false;
            setTimeout(processQueue, 500); // Small delay before next item
        });

        player.once('error', error => {
            console.error('[Dispatch] Audio Player Error:', error);
            subscription?.unsubscribe();
            player.stop();
            isPlaying = false;
            processQueue();
        });

    } catch (error) {
        console.error('[Dispatch] Error processing announcement:', error);
        isPlaying = false;
        processQueue();
    }
}

/**
 * Adds a new TTS announcement to the queue.
 * @param {string} text - The text to be spoken.
 */
function queueTts(text) {
    if (!text) return;
    announcementQueue.push(text);
    processQueue();
}

module.exports = {
    init: (client) => {
        discordClient = client;
        if (!client.options.intents.has(GatewayIntentBits.GuildVoiceStates)) {
             console.error("[Dispatch] FATAL: GuildVoiceStates intent is required for TTS functionality.");
             return;
        }
        connectToChannel();
    },
    queueTts, // This now correctly exports the function
};

