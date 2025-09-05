// roblox/dispatchManager.js
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { GatewayIntentBits } = require('discord.js');
const config = require('../config');
const axios = require('axios');

const announcementQueue = [];
let isPlaying = false;
let voiceConnection = null;
let discordClient;

async function createTTSStream(text) {
    try {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
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
            processQueue();
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
                if (voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
                    voiceConnection.destroy();
                }
                voiceConnection = null;
                // Add a delay before attempting a full reconnect.
                setTimeout(() => connectToChannel(), 10000); 
            }
        });

    } catch (e) {
        console.error('[Dispatch] Could not connect to voice channel:', e);
    }
}

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
            if (subscription) subscription.unsubscribe();
            player.stop();
            isPlaying = false;
            setTimeout(processQueue, 500);
        });

        player.once('error', error => {
            console.error('[Dispatch] Audio Player Error:', error);
            if (subscription) subscription.unsubscribe();
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
    queueTts,
};

