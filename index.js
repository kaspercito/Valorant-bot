const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config(); // Para usar variables de entorno (opcional)

// Configura el cliente de Discord con los intents necesarios
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Cuando el bot esté listo
client.once('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  // ID del canal donde se enviará el mensaje
  const channelId = '1343749554905940058';
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('No se encontró el canal con el ID proporcionado.');
    return;
  }

  try {
    const embed = new EmbedBuilder()
      .setTitle('Todo lo que hice por vos')
      .setDescription(
        'Quería demostrarte cuánto te quise y todo lo que hice para que estuvieras bien. Creíste que en mí habías encontrado "el hombre que sabría cómo no romperte el corazón", pero parece que nunca viste todo lo que hice por vos. Acá está la prueba de mi esfuerzo y mi amor:\n\n' +
        '- **Una página que muestra cuánto te quería**: [Corazón animado](https://codepen.io/Kasper-Cito/pen/PoLeypo)\n' +
        '- **Un diseño para expresar mis sentimientos**: [Diseño romántico](https://codepen.io/Kasper-Cito/pen/PorvQoM)\n' +
        '- **Un mensaje que salió del alma**: [Mensaje especial](https://codepen.io/Kasper-Cito/pen/OJKRrvZ)\n' +
        '- **Un espacio para recordarte**: [Otro diseño para vos](https://codepen.io/Kasper-Cito/pen/jOgMRJR)\n' +
        '- **Una página dedicada a vos**: [Mensaje en GitHub](https://kaspercito.github.io/mensaje/)\n' +
        '- **Un proyecto entero que hice pensando en vos**: [Oliver-IA](https://github.com/kaspercito/Oliver-IA)\n' +
        '- **Un video que muestra mi esfuerzo**: [Video en YouTube](https://youtu.be/7vdpIhgxljg)\n\n' +
        'Todo esto lo hice con el corazón, porque para mí valías todo. Si no lo viste entonces, ojalá lo veas ahora.'
      )
      .setColor('#ff4d4d') // Color rojo para un toque emotivo
      .setFooter({ text: 'Con cariño, desde el fondo de mi corazón.' })
      .setTimestamp();

    // Envía el mensaje al canal especificado
    await channel.send({ embeds: [embed] });
    console.log(`Mensaje enviado al canal ${channelId}`);
  } catch (error) {
    console.error('Error al enviar el mensaje:', error);
  }
});

// Inicia el bot con tu token
client.login(process.env.DISCORD_TOKEN || 'TU_TOKEN_AQUÍ'); // Usa .env o reemplaza con tu token
