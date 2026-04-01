const { getVoiceConnection } = require('@discordjs/voice');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const prism = require('prism-media');
const { EmbedBuilder } = require('discord.js');
const xp = {};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function playSilent(connection) {
  const player = createAudioPlayer();

  const silence = new prism.opus.Encoder({
    rate: 48000,
    channels: 2,
    frameSize: 960,
  });

  const resource = createAudioResource(silence);

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    playSilent(connection); // ulang terus
  });
}

client.once('ready', () => {
  console.log(`Bot aktif sebagai ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {

  // ===== XP SYSTEM =====
  const userId = message.author.id;

  if (!xp[userId]) {
    xp[userId] = { xp: 0, level: 1 };
  }

  const randomXP = Math.floor(Math.random() * 10) + 5;
  xp[userId].xp += randomXP;

  const nextLevelXP = xp[userId].level * 100;

  if (xp[userId].xp >= nextLevelXP) {
    xp[userId].level += 1;
    xp[userId].xp = 0;

    message.channel.send(
      `🎉 ${message.author} naik ke level ${xp[userId].level}!`
    );
  }

  // ===== COMMAND !LEVEL =====
  if (message.content === '!level') {
  const user = xp[userId];
  const neededXP = user.level * 100;

  message.reply(
    `🎮 **LEVEL KAMU**\n` +
    `Level: ${user.level}\n` +
    `XP: ${user.xp} / ${neededXP}`
  );
}
  
  // COMMAND JOIN
  if (message.content === '!join') {
  const channel = message.member.voice.channel;

  if (!channel) {
    return message.reply('Masuk voice channel dulu!');
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
  });

  playSilent(connection);

  message.reply('Bot masuk & stay di voice 🔊');
}

  // COMMAND LEAVE (opsional)
  if (message.content === '!leave') {
    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy();
      message.reply('Bot keluar voice ❌');
    }
  }

});


client.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.member.id === client.user.id && !newState.channelId) {
    const channel = oldState.channel;
    if (channel) {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      playSilent(connection);
    }
  }
});

client.on('guildMemberAdd', (member) => {
  const channel = member.guild.channels.cache.get('1384054007559094415');
  
  const embed = new EmbedBuilder()
    .setTitle('Welcome 🎉')
    .setDescription(`Halo ${member}, selamat datang di **${member.guild.name}**!`)
    .setColor('Green');

  channel.send({ embeds: [embed] });
});

client.login(process.env.TOKEN);
