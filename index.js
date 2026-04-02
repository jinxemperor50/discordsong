// ===============================
// IMPORT MODULE
// ===============================
const { 
  getVoiceConnection,
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} = require('@discordjs/voice');

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const prism = require('prism-media');
const mongoose = require('mongoose');
 

// ===============================
// CONFIG
// ===============================
const LOG_CHANNEL_ID = '1488934054714802357';


// ===============================
// DATABASE
// ===============================
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected ✅"))
.catch(err=>console.log(err));

const userSchema = new mongoose.Schema({
  userId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  voiceTime: { type: Number, default: 0 },
  joinTime: { type: Number, default: null }
});

const User = mongoose.model("User", userSchema);


// ===============================
// CLIENT
// ===============================
const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// ===============================
// UTILITY FUNCTIONS
// ===============================

// silent message
function sendSilent(channel, options){
  return channel.send({
    ...options,
    flags:4096,
    allowedMentions:{ repliedUser:false }
  });
}

// bot log embed
function sendBotLog(client, embedData){

  const channel = client.channels.cache.get(LOG_CHANNEL_ID);
  if(!channel) return;

  channel.send({
    embeds:[embedData],
    flags:4096
  });
}

// rank system
function getRank(level){
  if(level>=50) return "🏆 Legend";
  if(level>=40) return "💎 Diamond";
  if(level>=30) return "🟣 Platinum";
  if(level>=20) return "🔵 Gold";
  if(level>=10) return "🟢 Silver";
  return "🟤 Bronze";
}

function getRankColor(level){
  if(level>=50) return 0xff0000;
  if(level>=40) return 0x00ffff;
  if(level>=30) return 0xff00ff;
  if(level>=20) return 0xffd700;
  if(level>=10) return 0x00ff00;
  return 0x8b4513;
}

function createProgressBar(current,max,size=10){
  const percentage=current/max;
  const progress=Math.round(size*percentage);
  const empty=size-progress;

  return "▰".repeat(progress)+"▱".repeat(empty);
}


// ===============================
// VOICE STAY SYSTEM
// ===============================
function playSilent(connection){

  const player=createAudioPlayer();

  const silence=new prism.opus.Encoder({
    rate:48000,
    channels:2,
    frameSize:960
  });

  const resource=createAudioResource(silence);

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle,()=>{
    playSilent(connection);
  });

}


// ===============================
// READY
// ===============================
client.once("ready",()=>{
  console.log(`Bot aktif sebagai ${client.user.tag}`);
});


// ===============================
// MESSAGE COMMANDS
// ===============================
client.on("messageCreate", async message=>{

if(message.author.bot) return;

const userId=message.author.id;

let user=await User.findOne({userId});
if(!user) user=new User({userId});


// ===============================
// XP SYSTEM (CHAT)
// ===============================
const randomXP=Math.floor(Math.random()*5)+5;
user.xp+=randomXP;

const nextLevelXP=user.level*100;

if(user.xp>=nextLevelXP){

user.level+=1;
user.xp=0;

sendBotLog(client,{
title:"🎉 LEVEL UP!",
description:`
🔥 **${message.author.username}** naik level!

⭐ Level Baru: **${user.level}**
🏆 Rank: **${getRank(user.level)}**
`,
color:0xffd700,
thumbnail:{ url:message.author.displayAvatarURL() },
timestamp:new Date()
});

}

await user.save();


// ===============================
// PROFILE
// ===============================
if(message.content==="!profile"||message.content==="!p"){

const rank=getRank(user.level);
const maxXP=user.level*100;
const bar=createProgressBar(user.xp,maxXP);

let totalTime=user.voiceTime;

if(user.joinTime){
totalTime+=Date.now()-user.joinTime;
}

const totalSeconds=Math.floor(totalTime/1000);
const hours=Math.floor(totalSeconds/3600);
const minutes=Math.floor((totalSeconds%3600)/60);
const seconds=totalSeconds%60;

const allUsers=await User.find().sort({level:-1,xp:-1});

const rankPosition=allUsers.findIndex(
u=>u.userId===message.author.id
)+1;

return message.reply({
embeds:[
{
author:{
name:message.author.username,
icon_url:message.author.displayAvatarURL()
},
title:"📊 USER PROFILE",
description:`
━━━━━━━━━━━━━━━━━━

🏆 Rank: ${rank}
⭐ Level: ${user.level}
📊 XP: ${user.xp}/${maxXP}

${bar}

━━━━━━━━━━━━━━━━━━

🎤 Voice Time
${hours}j ${minutes}m ${seconds}d

━━━━━━━━━━━━━━━━━━

🏅 Global Rank: #${rankPosition}

━━━━━━━━━━━━━━━━━━
`,
color:getRankColor(user.level),
footer:{ text:"Profile System • Yukii Bot" },
timestamp:new Date()
}
],
flags:4096
});

}


// ===============================
// LEVEL COMMAND
// ===============================
if(message.content==="!level"||message.content==="!lv"){

const rank=getRank(user.level);
const maxXP=user.level*100;
const bar=createProgressBar(user.xp,maxXP);

return message.reply({
embeds:[
{
title:"📊 Rank Info",
description:`
👤 ${message.author.username}

🏆 Rank: ${rank}
⭐ Level: ${user.level}

📈 XP: ${user.xp}/${maxXP}

${bar}
`,
color:getRankColor(user.level),
thumbnail: {
url: newState.member.user.displayAvatarURL()
},
timestamp: new Date()
}
],
flags:4096
});

}


// ===============================
// HELP COMMAND
// ===============================
if(
message.content==="!help"||
message.content==="!cmd"||
message.content==="!commands"
){

return message.reply({
embeds:[
{
title:"📖 Command List",
description:`
🎮 GENERAL
!help
!profile

🏆 LEVEL
!level
!leaderboard

🎤 VOICE
!voice
!voiceleaderboard

🔊 VOICE CONTROL
!join
!leave
`,
color:0x5865F2
}
],
flags:4096
});

}

// ===============================
// LEVEL LEADERBOARD
// ===============================
if (message.content === '!leaderboard' || message.content === '!lb') {

const topUsers = await User.find({
userId: { $ne: null }
})
.sort({ level: -1, xp: -1 })
.limit(10);

let leaderboard = '';
let rank = 1;

for (const data of topUsers) {

try{

const userFetch = await message.client.users.fetch(data.userId);

let medal='🔹';
if(rank===1) medal='🥇';
else if(rank===2) medal='🥈';
else if(rank===3) medal='🥉';

leaderboard+=`${medal} **#${rank} ${userFetch.username}**\n`;
leaderboard+=`⭐ Level ${data.level} | 📊 XP ${data.xp}\n\n`;

rank++;

}catch(err){
console.log(err);
}

}

return message.reply({
embeds:[
{
title:"🏆 SERVER LEADERBOARD",
description:leaderboard||"Belum ada data.",
color:0xFFD700,
timestamp:new Date()
}
],
flags:4096
});

}

// ===============================
// VOICE TIME
// ===============================
if(message.content==="!voice"||message.content==="!v"){

let totalTime=user.voiceTime;

if(user.joinTime){
totalTime+=Date.now()-user.joinTime;
}

const totalSeconds=Math.floor(totalTime/1000);
const minutes=Math.floor(totalSeconds/60);

return sendSilent(message.channel,{
content:`🎤 Kamu sudah voice selama **${minutes} menit**`
});

}

// ===============================
// VOICE LEADERBOARD
// ===============================
if(message.content==="!voiceleaderboard"||message.content==="!vlb"){

const topUsers=await User.find({
userId:{ $ne:null }
})
.sort({voiceTime:-1})
.limit(10);

let leaderboard="";
let rank=1;

for(const data of topUsers){

try{

const userFetch=await message.client.users.fetch(data.userId);

let totalTime=data.voiceTime||0;

if(data.joinTime){
totalTime+=Date.now()-data.joinTime;
}

const minutes=Math.floor(totalTime/60000);

let medal='🔹';
if(rank===1) medal='🥇';
else if(rank===2) medal='🥈';
else if(rank===3) medal='🥉';

leaderboard+=`${medal} **#${rank} ${userFetch.username}**\n`;
leaderboard+=`🎤 ${minutes} menit\n\n`;

rank++;

}catch(err){
console.log(err);
}

}

return message.reply({
embeds:[
{
title:"🎤 VOICE LEADERBOARD",
description:leaderboard||"Belum ada data.",
color:0x00ffff,
timestamp:new Date()
}
],
flags:4096
});

}

// ===============================
// JOIN VOICE
// ===============================
if(message.content==="!join"){

const channel=message.member.voice.channel;

if(!channel){
return sendSilent(message.channel,{
content:"Masuk voice channel dulu!"
});
}

const connection=joinVoiceChannel({
channelId:channel.id,
guildId:message.guild.id,
adapterCreator:message.guild.voiceAdapterCreator
});

playSilent(connection);

return sendSilent(message.channel,{
content:"Bot masuk voice 🔊"
});

}

// ===============================
// LEAVE VOICE
// ===============================
if(message.content==="!leave"){

const connection=getVoiceConnection(message.guild.id);

if(connection){
connection.destroy();

return sendSilent(message.channel,{
content:"Bot keluar voice ❌"
});
}

}
  
});


// ===============================
// VOICE TRACKING
// ===============================
client.on("voiceStateUpdate", async (oldState, newState) => {

if (!newState.member || newState.member.user.bot) return;

const userId = newState.id;

let user = await User.findOne({ userId });
if (!user) user = new User({ userId });


// ===============================
// JOIN VOICE
// ===============================
if (!oldState.channelId && newState.channelId) {
user.joinTime = Date.now();
}


// ===============================
// LEAVE VOICE
// ===============================
if (oldState.channelId && !newState.channelId) {

if (user.joinTime) {

const duration = Date.now() - user.joinTime;

user.voiceTime += duration;

const minutes = Math.floor(duration / 60000);
const seconds = Math.floor((duration % 60000) / 1000);


// ===============================
// VOICE XP
// ===============================
const voiceXP = minutes * 2;

user.xp += voiceXP;

const nextLevelXP = user.level * 100;


// ===============================
// DETAIL REPORT
// ===============================
sendBotLog(client, {
title: "🎤 Voice Activity",
description: `
👤 User: **${newState.member.user.username}**

⏱️ Durasi Voice
${minutes} menit ${seconds} detik

⭐ EXP Didapat
+${voiceXP} XP

📊 Total Voice
${Math.floor(user.voiceTime / 60000)} menit
`,
color: 0x00ffff,
thumbnail: {
url: newState.member.user.displayAvatarURL()
},
timestamp: new Date()
});


// ===============================
// LEVEL UP CHECK
// ===============================
if (user.xp >= nextLevelXP) {

user.level++;
user.xp = 0;

sendBotLog(client, {
title: "🎉 Voice Level Up",
description: `
🎧 **${newState.member.user.username}**

⭐ Level Baru: **${user.level}**
🏆 Rank: **${getRank(user.level)}**
`,
color: 0xffd700,
thumbnail: {
url: newState.member.user.displayAvatarURL()
},
timestamp: new Date()
});

}

user.joinTime = null;

}

}

await user.save();

});


// ===============================
// WELCOME MESSAGE
// ===============================
client.on("guildMemberAdd", member=>{

const channel=member.guild.channels.cache.get(LOG_CHANNEL_ID);

if(!channel) return;

const embed=new EmbedBuilder()
.setTitle("Welcome 🎉")
.setDescription(`Halo ${member}, selamat datang di **${member.guild.name}**`)
.setColor("Green");

sendSilent(channel,{embeds:[embed]});

});


// ===============================
client.login(process.env.TOKEN);
