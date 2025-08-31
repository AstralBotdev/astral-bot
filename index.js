import 'dotenv/config';
import {
  Client, GatewayIntentBits, Partials, Events,
  AttachmentBuilder, REST, Routes, SlashCommandBuilder
} from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const {
  TOKEN, CLIENT_ID, GUILD_ID,
  WELCOME_CHANNEL_ID, WELCOME_BACKGROUND, WIKI_URL
} = process.env;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('règlement').setDescription('Affiche le règlement Astral'),
    new SlashCommandBuilder().setName('wiki').setDescription('Affiche le lien du wiki Astral'),
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Slash-commands (re)déployées.');
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Astral connecté en tant que ${c.user.tag}`);
  try { await registerCommands(); } catch (e) { console.error('Deploy cmds:', e); }
});

async function buildWelcomeCard(member) {
  const WIDTH = 1280, HEIGHT = 640;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  try {
    const bg = await loadImage(WELCOME_BACKGROUND);
    ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
  } catch {
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, '#0b0f1a');
    grad.addColorStop(1, '#1a1f3a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const AV_SIZE = 300, AV_X = 80, AV_Y = HEIGHT / 2 - AV_SIZE / 2;
  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });
  const avatar = await loadImage(avatarURL);

  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_X + AV_SIZE/2, AV_Y + AV_SIZE/2, AV_SIZE/2, 0, Math.PI*2);
  ctx.closePath(); ctx.clip();
  ctx.drawImage(avatar, AV_X, AV_Y, AV_SIZE, AV_SIZE);
  ctx.restore();

  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(AV_X + AV_SIZE/2, AV_Y + AV_SIZE/2, AV_SIZE/2, 0, Math.PI*2);
  ctx.stroke();

  const padLeft = AV_X + AV_SIZE + 70;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px Arial';
  ctx.fillText('Bienvenue sur Astral', padLeft, HEIGHT/2 - 30);

  const display = member.displayName ?? member.user.username;
  ctx.fillStyle = '#B7C4FF';
  ctx.font = 'bold 96px Arial';
  const maxWidth = WIDTH - padLeft - 80;
  let name = display;
  while (ctx.measureText(name).width > maxWidth && name.length > 3) name = name.slice(0, - 1);
  ctx.fillText(name, padLeft, HEIGHT/2 + 80);

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '28px Arial';
  ctx.fillText('Astral — 2025', padLeft, HEIGHT - 60);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'astral-welcome.png' });
}

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const ch = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!ch) return;
    const card = await buildWelcomeCard(member);
    await ch.send({ content: `Bienvenue ${member} sur **Astral** 🌌`, files: [card] });
  } catch (e) { console.error('Bienvenue:', e); }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'règlement') {
    await interaction.reply({
      content:
        '**📜 Règlement Astral**\n' +
        '1) Respect & bienveillance — pas d’insultes/harcèlement.\n' +
        '2) Contenus interdits — pas de NSFW/gore/spam/illégal.\n' +
        '3) Identité & sécurité — pas d’infos perso, respect de la modération.',
      ephemeral: false
    });
  }

  if (interaction.commandName === 'wiki') {
    await interaction.reply({
      content: `📘 Wiki Astral : ${WIKI_URL ?? 'à venir...'}`,
      ephemeral: false
    });
  }
});

client.login(TOKEN);
