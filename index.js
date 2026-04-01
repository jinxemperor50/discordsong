const { getVoiceConnection } = require('@discordjs/voice');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const prism = require('prism-media');
const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected ✅'))
  .catch(err => {
    console.log('ERROR MONGO:');
    console.log(err);
  });
const userSchema = new mongoose.Schema({
  userId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  voiceTime: { type: Number, default: 0 },
  joinTime: { type: Number, default: null }
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
  let user = await User.findOne({ userId });
  if (message.author.bot) return;

  const userId = message.author.id;

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
  // ===== COMMAND VOICE LEADERBOARD =====
  if (message.content === '!voice') {
  const user = await User.findOne({ userId: message.author.id });

  if (!user) return message.reply('Belum ada data.');

  let totalTime = user.voiceTime;

  // kalau lagi di voice
  if (user.joinTime) {
    totalTime += Date.now() - user.joinTime;
  }

  const seconds = Math.floor(totalTime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  message.reply(
    `🎤 Kamu sudah di voice selama: ${hours} jam ${minutes % 60} menit`
  );
}

  if (message.content === '!voiceleaderboard') {

  const topUsers = await User.find()
    .sort({ voiceTime: -1 })
    .limit(5);

  let text = '🏆 **Voice Leaderboard**\n\n';

  for (let i = 0; i < topUsers.length; i++) {
    const data = topUsers[i];

    const user = await message.client.users.fetch(data.userId);

    const totalSeconds = Math.floor(data.voiceTime / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    text += `${i + 1}. ${user.username} - ${hours} jam ${minutes} menit\n`;
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


client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id;

  let user = await User.findOne({ userId });

  if (!user) {
    user = new User({ userId });
  }

  // JOIN VOICE
  if (!oldState.channelId && newState.channelId) {
    user.joinTime = Date.now();
  }

  // LEAVE VOICE
  if (oldState.channelId && !newState.channelId) {
    if (user.joinTime) {
      const duration = Date.now() - user.joinTime;
      user.voiceTime += duration;
      user.joinTime = null;
    }
  }

  await user.save();
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
