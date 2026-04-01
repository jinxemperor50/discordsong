const { getVoiceConnection } = require('@discordjs/voice');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const prism = require('prism-media');
const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected ✅'))
  .catch(err => console.log(err));
const userSchema = new mongoose.Schema({
  userId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
});
const User = mongoose.model('User', userSchema);
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

  if (message.author.bot) return;

  const userId = message.author.id;

  let user = await User.findOne({ userId });

  if (!user) {
    user = new User({ userId });
    await user.save();
  }

  // tambah XP
  const randomXP = Math.floor(Math.random() * 10) + 5;
  user.xp += randomXP;

  const nextLevelXP = user.level * 100;

  if (user.xp >= nextLevelXP) {
    user.level += 1;
    user.xp = 0;

    message.channel.send(`🎉 ${message.author} naik ke level ${user.level}!`);
  }

  await user.save();

  // ===== COMMAND !LEVEL =====
  if (message.content === '!level') {
    message.reply(`📊 Level: ${user.level}\nXP: ${user.xp}/${user.level * 100}`);
  }

  // ===== COMMAND LEADERBOARD =====
  if (message.content === '!leaderboard') {
    const topUsers = await User.find().sort({ level: -1, xp: -1 }).limit(5);

    let text = '🏆 **Leaderboard**\n\n';

    for (let i = 0; i < topUsers.length; i++) {
      const u = await message.client.users.fetch(topUsers[i].userId);
      text += `${i + 1}. ${u.username} - Level ${topUsers[i].level}\n`;
    }

    message.channel.send(text);
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
