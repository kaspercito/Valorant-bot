const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');
const fetch = require('node-fetch');
require('dotenv').config();

// Lista de agentes, mapas y lados válidos (actualizada para julio 2025)
const validAgents = [
  'Brimstone', 'Jett', 'Phoenix', 'Sage', 'Sova', 'Viper', 'Cypher', 'Reyna',
  'Killjoy', 'Breach', 'Omen', 'Raze', 'Skye', 'Yoru', 'Astra', 'KAY/O',
  'Chamber', 'Neon', 'Fade', 'Harbor', 'Gekko', 'Deadlock', 'Iso', 'Clove',
  'Vyse', 'Tejo', 'Waylay'
];
const validMaps = ['Ascent', 'Haven', 'Icebox', 'Lotus', 'Bind', 'Sunset', 'Corrode'];
const validSides = ['Attack', 'Defense'];

// Cache para almacenar resultados de búsqueda
const cache = new Map();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
  console.log(`Bot listo como ${client.user.tag}!`);

  // Definir comando de barra con autocompletado
  const command = new SlashCommandBuilder()
    .setName('lineup')
    .setDescription('Envía un enlace a un video de YouTube con un lineup de Valorant')
    .addStringOption(option =>
      option
        .setName('agent')
        .setDescription('Nombre del agente (ejemplo: Sova)')
        .setRequired(true)
        .setAutocomplete(true)
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

// Manejar autocompletado para agentes
client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name === 'agent') {
      const input = focusedOption.value.toLowerCase();
      const filteredAgents = validAgents
        .filter(agent => agent.toLowerCase().includes(input))
        .slice(0, 25); // Límite de 25 opciones para autocompletado
      await interaction.respond(
        filteredAgents.map(agent => ({ name: agent, value: agent }))
      );
    }
  }
});

// Función para buscar video en YouTube
async function searchLineupVideo(agent, map, side) {
  const cacheKey = `${agent}-${map}-${side}-video`;
  if (cache.has(cacheKey)) {
    console.log(`Usando caché para ${cacheKey}`);
    return cache.get(cacheKey);
  }

  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });

    const query = `${agent} ${map} ${side} Valorant lineup guide short`;
    const response = await youtube.search.list({
      part: 'snippet',
      q: query,
      maxResults: 1,
      type: 'video',
    });

    const video = response.data.items[0];
    if (!video) return null;

    const result = `https://www.youtube.com/watch?v=${video.id.videoId}`;
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error al buscar video en YouTube:', error);
    return null;
  }
}

// Función para buscar GIF en GIPHY
async function searchLineupGif(agent, map, side) {
  const cacheKey = `${agent}-${map}-${side}-gif`;
  if (cache.has(cacheKey)) {
    console.log(`Usando caché para ${cacheKey}`);
    return cache.get(cacheKey);
  }

  try {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) return null;
    const query = `${agent} ${map} Valorant lineup`;
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=1&rating=pg`
    );
    const data = await response.json();
    const gif = data.data[0];
    if (!gif) return null;

    const result = gif.images.original.url;
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error al buscar GIF en GIPHY:', error);
    return null;
  }
}

// Manejar comandos
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'lineup') {
    try {
      await interaction.deferReply({ ephemeral: false }); // Respuesta en el canal
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

      // Buscar video
      const videoUrl = await searchLineupVideo(agent, map, side);

      if (videoUrl) {
        // Buscar GIF (opcional)
        const gifUrl = process.env.GIPHY_API_KEY ? await searchLineupGif(agent, map, side) : null;
        if (gifUrl) {
          await interaction.editReply(`${gifUrl}\n${videoUrl}`);
        } else {
          await interaction.editReply(videoUrl);
        }
      } else {
        await interaction.editReply({
          content: `❌ No se encontró un video de lineup para ${agent} en ${map} (${side}). Intenta con otros parámetros.`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error en interacción:', error);
      await interaction.editReply({
        content: '❌ Error al procesar el comando. Intenta de nuevo más tarde.',
        ephemeral: true
      });
    }
  }
});

client.on('error', error => {
  console.error('Error del cliente:', error);
});

client.login(process.env.DISCORD_TOKEN);
