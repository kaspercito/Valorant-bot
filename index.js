const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const puppeteer = require('puppeteer');

// Lista de agentes, mapas y lados válidos (actualizada para julio 2025)
const validAgents = [
  'Brimstone', 'Jett', 'Phoenix', 'Sage', 'Sova', 'Viper', 'Cypher', 'Reyna',
  'Killjoy', 'Breach', 'Omen', 'Raze', 'Skye', 'Yoru', 'Astra', 'KAY/O',
  'Chamber', 'Neon', 'Fade', 'Harbor', 'Gekko', 'Deadlock', 'Iso', 'Clove',
  'Vyse', 'Tejo', 'Waylay'
];
const validMaps = ['Ascent', 'Haven', 'Icebox', 'Lotus', 'Bind', 'Sunset', 'Corrode'];
const validSides = ['Attack', 'Defense'];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
  console.log(`Bot listo como ${client.user.tag}!`);

  // Definir comando de barra
  const command = new SlashCommandBuilder()
    .setName('lineup')
    .setDescription('Obtiene un lineup de Valorant con imagen')
    .addStringOption(option =>
      option
        .setName('agent')
        .setDescription('Nombre del agente (ejemplo: Sova)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('map')
        .setDescription('Nombre del mapa')
        .setRequired(true)
        .addChoices(...validMaps.map(map => ({ name: map, value: map })))
    )
    .addStringOption(option =>
      option
        .setName('side')
        .setDescription('Lado (Attack/Defense)')
        .setRequired(true)
        .addChoices(...validSides.map(side => ({ name: side, value: side })))
    );

  try {
    await client.application.commands.create(command);
    console.log('Comando /lineup registrado!');
  } catch (error) {
    console.error('Error al registrar comando:', error);
  }
});

// Función para scrapear lineups de Tracker.gg
async function scrapeLineup(agent, map, side) {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const url = 'https://tracker.gg/valorant/guides';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const lineups = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.guide-card')); // Ajusta según el HTML de Tracker.gg
      return items.map(item => ({
        title: item.querySelector('.guide-title')?.textContent.trim() || 'Sin título',
        videoUrl: item.querySelector('a[href*="video"]')?.href || '',
        imageUrl: item.querySelector('img')?.src || ''
      }));
    });

    await browser.close();

    // Filtrar por agente, mapa y lado (case-insensitive)
    return lineups.find(
      l => l.title.toLowerCase().includes(agent.toLowerCase()) &&
           l.title.toLowerCase().includes(map.toLowerCase()) &&
           l.title.toLowerCase().includes(side.toLowerCase())
    ) || null;
  } catch (error) {
    console.error('Error al scrapear:', error);
    return null;
  }
}

// Manejar comandos
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'lineup') {
    await interaction.deferReply();
    const agent = interaction.options.getString('agent');
    const map = interaction.options.getString('map');
    const side = interaction.options.getString('side');

    // Validar entradas
    if (!validAgents.map(a => a.toLowerCase()).includes(agent.toLowerCase())) {
      await interaction.editReply({
        content: `❌ Agente inválido. Usa uno de: ${validAgents.join(', ')}.`,
        ephemeral: true
      });
      return;
    }
    if (!validMaps.includes(map) || !validSides.includes(side)) {
      await interaction.editReply({
        content: '❌ Mapa o lado inválidos. Usa mapas y lados válidos.',
        ephemeral: true
      });
      return;
    }

    // Obtener lineup
    const lineup = await scrapeLineup(agent, map, side);

    if (lineup && lineup.imageUrl) {
      // Crear embed con imagen
      const embed = new EmbedBuilder()
        .setTitle(`Lineup para ${agent} en ${map} (${side})`)
        .setDescription(lineup.title || 'Lineup de Valorant')
        .setColor('#FF4655')
        .setImage(lineup.imageUrl)
        .setURL(lineup.videoUrl || null)
        .setFooter({ text: 'Fuente: Tracker.gg | Bot creado por Kaspercito' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (lineup) {
      // Sin imagen, solo texto
      const embed = new EmbedBuilder()
        .setTitle(`Lineup para ${agent} en ${map} (${side})`)
        .setDescription(lineup.title || 'Lineup de Valorant')
        .setColor('#FF4655')
        .setURL(lineup.videoUrl || null)
        .setFooter({ text: 'Fuente: Tracker.gg | Bot creado por Kaspercito' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: `❌ No se encontró un lineup para ${agent} en ${map} (${side}). Intenta con otros parámetros.`,
        ephemeral: true
      });
    }
  }
});

client.on('error', error => {
  console.error('Error del cliente:', error);
});

client.login(process.env.DISCORD_TOKEN);
