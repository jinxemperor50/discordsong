const { getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const prism = require('prism-media');
const mongoose = require('mongoose');

// ===== MONGODB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected ✅'))
  .catch(err => console.log(err));

// ===== SCHEMA =====
const userSchema = new mongoose.Schema({
  userId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  voiceTime: { type: Number, default: 0 },
  joinTime: { type: Number, default: null }
});

const User = mongoose.model('User', userSchema);

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== 🔕 SILENT MESSAGE =====
function sendSilent(channel, options) {
  return channel.send({
    ...options,
    flags: 4096,
    allowedMentions: { repliedUser: false }
  });
}

// ===== 🏆 RANK SYSTEM =====
function getRank(level) {
  if (level >= 50) return '🏆 Legend';
  if (level >= 40) return '💎 Diamond';
  if (level >= 30) return '🟣 Platinum';
  if (level >= 20) return '🔵 Gold';
  if (level >= 10) return '🟢 Silver';
  return '🟤 Bronze';
}

function getRankColor(level) {
  if (level >= 50) return 0xff0000;
  if (level >= 40) return 0x00ffff;
  if (level >= 30) return 0xff00ff;
  if (level >= 20) return 0xffd700;
  if (level >= 10) return 0x00ff00;
  return 0x8b4513;
}

function createProgressBar(current, max, size = 10) {
  const percentage = current / max;
  const progress = Math.round(size * percentage);
  const empty = size - progress;
  return '▰'.repeat(progress) + '▱'.repeat(empty);
}

// ===== VOICE STAY =====
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
    playSilent(connection);
  });
}

// ===== READY =====
client.once('ready', () => {
  console.log(`Bot aktif sebagai ${client.user.tag}`);
});

// ===== MESSAGE =====
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  if (!userId) return;

  let user = await User.findOne({ userId });
  if (!user) user = new User({ userId });

  // ===== XP SYSTEM =====
  const randomXP = Math.floor(Math.random() * 10) + 5;
  user.xp += randomXP;

  const nextLevelXP = user.level * 100;

  if (user.xp >= nextLevelXP) {
    user.level += 1;
    user.xp = 0;

    sendSilent(message.channel, {
      embeds: [{
        title: '🎉 LEVEL UP!',
        description: `
🔥 ${message.author.username} naik level!

⭐ Level: ${user.level}
🏆 Rank: ${getRank(user.level)}
        `,
        color: 0xffd700
      }]
    });
  }

  await user.save();

  // ===== PROFILE CMD=====
  if (message.content === '!profile' || message.content === '!p') {

  const userData = await User.findOne({ userId: message.author.id });

  if (!userData) {
    return message.reply({
      content: '❌ Data kamu belum ada.',
      flags: 4096
    });
  }

  // ===== RANK SYSTEM (PROFILE)=====
  const rank = getRank(userData.level);
  const maxXP = userData.level * 100;

  // ===== PROGRESS BAR (PROFILE) =====
  const bar = createProgressBar(userData.xp, maxXP);

  // ===== VOICE TIME (PROFILE) =====
  let totalTime = userData.voiceTime || 0;

  if (userData.joinTime) {
    totalTime += Date.now() - userData.joinTime;
  }

  const totalSeconds = Math.floor(totalTime / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const voiceText = `
  ${hours > 0 ? `⏰ ${hours} jam\n` : ''}
  ${minutes > 0 ? `🕐 ${minutes} menit\n` : ''}
  ⏱️ ${seconds} detik
  `;

  // ===== GLOBAL RANK (PROFILE) =====
  const allUsers = await User.find().sort({ level: -1, xp: -1 });

  const rankPosition = allUsers.findIndex(
    u => u.userId === message.author.id
  ) + 1;

  // ===== EMBED (PROFILE) =====
  return message.reply({
    embeds: [
      {
        author: {
          name: `${message.author.username}`,
          icon_url: message.author.displayAvatarURL()
        },
        title: '📊 USER PROFILE',
        description: `
        ━━━━━━━━━━━━━━━━━━
        
        🏆 **Rank:** ${rank}
        ⭐ **Level:** ${userData.level}
        📊 **XP:** ${userData.xp}/${maxXP}
        
        ${bar}
        
        ━━━━━━━━━━━━━━━━━━
        
        🎤 **Voice Activity**
        ${voiceText}
        
        ━━━━━━━━━━━━━━━━━━
        
        🏅 **Global Rank:** #${rankPosition}
        
        ━━━━━━━━━━━━━━━━━━
        `,
        color: getRankColor(userData.level),
        footer: {
          text: 'Profile System • Yukii Bot'
        },
        timestamp: new Date()
      }
    ],
    allowedMentions: { repliedUser: true },
    flags: 4096 // 🔕 silent
  });
}
  
  // ===== LEVEL =====
  if (message.content === '!level' || message.content === '!lv') {

  const rank = getRank(user.level);
  const maxXP = user.level * 100;
  const bar = createProgressBar(user.xp, maxXP);

  return message.reply({
    embeds: [{
      title: '📊 Profile Rank',
      description: `
        👤 **User:** ${message.author.username}
        
        🏆 **Rank:** ${rank}
        ⭐ **Level:** ${user.level}
        
        📈 **XP:** ${user.xp}/${maxXP}
        ${bar}
       `,
      color: getRankColor(user.level)
    }],
    allowedMentions: { repliedUser: true }, // ✅ mention user
    flags: 4096 // 🔕 tetap silent
  });
}

  // ===== LEADERBOARD =====
  if (message.content === '!leaderboard' || message.content === '!lb') {
    const topUsers = await User.find().sort({ level: -1, xp: -1 }).limit(5);

    let text = '🏆 **Leaderboard**\n\n';

    for (let i = 0; i < topUsers.length; i++) {
      const u = await message.client.users.fetch(topUsers[i].userId);
      text += `${i + 1}. ${u.username} - Level ${topUsers[i].level}\n`;
    }

    return sendSilent(message.channel, { content: text });
  }

  // ===== VOICE TIME =====
  if (message.content === '!voice' || message.content === '!v') {
    let totalTime = user.voiceTime;

    if (user.joinTime) {
      totalTime += Date.now() - user.joinTime;
    }

    const totalSeconds = Math.floor(totalTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const seconds = totalSeconds % 60;

    return sendSilent(message.channel, {
      content: `🎤 Kamu di voice selama: ${hours} jam ${minutes % 60} menit ${seconds} detik`
    });
  }

  // ===== VOICE LEADERBOARD =====
  if (message.content === '!voiceleaderboard' || message.content === '!vlb') {

    const topUsers = await User.find({ userId: { $ne: null } })
      .sort({ voiceTime: -1 })
      .limit(5);

    let text = '🏆 Voice Leaderboard\n\n';
    let rank = 1;

    for (const data of topUsers) {
      if (!data.userId) continue;

      try {
        const u = await message.client.users.fetch(data.userId);

        let totalTime = data.voiceTime || 0;

        if (data.joinTime) {
          totalTime += Date.now() - data.joinTime;
        }

        const totalSeconds = Math.floor(totalTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const seconds = totalSeconds % 60;

        let timeText = '';
        if (hours > 0) timeText += `${hours} jam `;
        if (minutes > 0) timeText += `${minutes} menit `;
        if (seconds > 0) timeText += `${seconds} detik`;

        text += `${rank}. ${u.username} - ${timeText}\n`;
        rank++;

      } catch (err) {
        console.log(err);
      }
    }

    return sendSilent(message.channel, { content: text });
  }

  // ===== JOIN =====
  if (message.content === '!join') {
    const channel = message.member.voice.channel;

    if (!channel) {
      return sendSilent(message.channel, {
        content: 'Masuk voice channel dulu!'
      });
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    playSilent(connection);

    return sendSilent(message.channel, {
      content: 'Bot masuk & stay di voice 🔊'
    });
  }

  // ===== LEAVE =====
  if (message.content === '!leave') {
    const connection = getVoiceConnection(message.guild.id);

    if (connection) {
      connection.destroy();

      return sendSilent(message.channel, {
        content: 'Bot keluar voice ❌'
      });
    }
  }

  // ===== HELP COMMAND BOT =====
  if (
  message.content === '!help' ||
  message.content === '!yuki' ||
  message.content === '!cmd' ||
  message.content === '!commands'
  ) {

    return message.reply({
    embeds: [
      {
        title: '📖 DAFTAR COMMAND BOT',
        description: `
        ━━━━━━━━━━━━━━━━━━
        
        🎮 **GENERAL**
        \`!help\` / \`!cmd\` → Lihat semua command  
        \`!profile\` / \`!p\` → Lihat profile lengkap  
        
        ━━━━━━━━━━━━━━━━━━
        
        🏆 **LEVEL SYSTEM**
        \`!level\` / \`!lv\` → Cek level kamu  
        \`!leaderboard\` / \`!lb\` → Rank leaderboard  
        
        ━━━━━━━━━━━━━━━━━━
        
        🎤 **VOICE SYSTEM**
        \`!voice\` / \`!v\` → Cek waktu voice  
        \`!voiceleaderboard\` / \`!vlb\` → Leaderboard voice  
        
        ━━━━━━━━━━━━━━━━━━
        
        🔊 **VOICE CONTROL**
        \`!join\` → Bot masuk voice  
        \`!leave\` → Bot keluar voice  
        
        ━━━━━━━━━━━━━━━━━━
        `,
        color: 0x5865F2,
        footer: {
          text: 'Yukii Bot • Command List'
        },
        timestamp: new Date()
      }
    ],
    allowedMentions: { repliedUser: true },
    flags: 4096 // 🔕 silent
  });
}
});

// ===== VOICE TRACK =====
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    if (!newState.member || newState.member.user.bot) return;

    const userId = newState.id;
    if (!userId) return;

    let user = await User.findOne({ userId });
    if (!user) user = new User({ userId });

    if (!oldState.channelId && newState.channelId) {
      user.joinTime = Date.now();
    }

    if (oldState.channelId && !newState.channelId) {
      if (user.joinTime) {
        const duration = Date.now() - user.joinTime;
        user.voiceTime += duration;
        user.joinTime = null;
      }
    }

    await user.save();

  } catch (err) {
    console.log(err);
  }
});

// ===== WELCOME =====
client.on('guildMemberAdd', (member) => {
  const channel = member.guild.channels.cache.get('1384054007559094415');

  const embed = new EmbedBuilder()
    .setTitle('Welcome 🎉')
    .setDescription(`Halo ${member}, selamat datang di **${member.guild.name}**!`)
    .setColor('Green');

  sendSilent(channel, { embeds: [embed] });
});

client.login(process.env.TOKEN);
