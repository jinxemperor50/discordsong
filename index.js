const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once('ready', () => {
  console.log(`Bot aktif sebagai ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!play')) {

    const args = message.content.split(' ');
    const url = args[1];

    if (!url) return message.reply('Masukkan link YouTube!');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('Masuk voice channel dulu!');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

  try {
  const ytInfo = await play.video_info(url);
  const stream = await play.stream(ytInfo.video_details.url);

  const resource = createAudioResource(stream.stream, {
    inputType: stream.type
  });

  const player = createAudioPlayer();
  player.play(resource);
  connection.subscribe(player);

  message.reply(`Memutar: ${ytInfo.video_details.title} 🎶`);

} catch (error) {
  console.error(error);
  message.reply('Gagal memutar lagu! Coba link lain.');
}
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    const player = createAudioPlayer();
    player.play(resource);
    connection.subscribe(player);

    message.reply('Memutar lagu 🎶');
  }
});

client.login(process.env.TOKEN);
