const axios = require("axios");
const Discord = require("discord.js");
const discordApiKey = process.env.DISCORD_API_KEY;
const channelId = process.env.CHANNEL_ID;
const botToken = process.env.DISCORD_TOKEN;
const OpenAI = require("openai");
const openai = process.env.OPENAI_API_KEY;
require('dotenv').config();


// Load the Davinci engine
const engine = "davinci";

// Set the required permissions for the bot user
const {
  PermissionsBitField
} = require('discord.js');

const flags = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.ManageRoles,
];

const permissions = new PermissionsBitField(flags);


const {
  Client,
  GatewayIntentBits
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// bot token
client.login(botToken);


client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

function startMonitoringChannel() {
  axios
    .get(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      headers: {
        Authorization: `Bot ${discordApiKey}`,
      },
      params: {
        limit: 1,
      },
    })
    .then((response) => {
      const messages = response.data;
      const latestMessage = messages[0];

      if (latestMessage.content.startsWith(".")) {
        sendGoodMessage(latestMessage);
      } else {
        generateResponseAndSendMessage(latestMessage);
      }

      setTimeout(startMonitoringChannel, 1000);
    })
    .catch((error) => {
      console.error(error);
      setTimeout(startMonitoringChannel, 5000);
    });
}

function sendGoodMessage(message) {
  axios
    .post(
      `https://discord.com/api/v9/channels/${message.channel_id}/messages`,
      {
        content: "good",
      },
      {
        headers: {
          Authorization: `Bot ${discordApiKey}`,
        },
      }
    )
    .then((response) => {
      setTimeout(() => {
        axios
          .delete(
            `https://discord.com/api/v9/channels/${response.data.channel_id}/messages/${response.data.id}`,
            {
              headers: {
                Authorization: `Bot ${discordApiKey}`,
              },
            }
          )
          .catch((error) => console.error(error));
      }, 2000);
    })
    .catch((error) => console.error(error));
}

async function generateResponseAndSendMessage(message) {
  try {
    const response = await openai.complete({
      engine: "davinci",
      prompt: `Conversation:\nUser: ${message.content}\nAI:`,
      maxTokens: 150,
      temperature: 0.7,
      n: 1,
      stop: "\nUser:",
    });

    axios
      .post(
        `https://discord.com/api/v9/channels/${message.channel_id}/messages`,
        {
          content: response.data.choices[0].text.trim(),
        },
        {
          headers: {
            Authorization: `Bot ${discordApiKey}`,
          },
        }
      )
      .catch((error) => console.error(error));
  } catch (err) {
    console.error(err);
    axios
      .post(
        `https://discord.com/api/v9/channels/${message.channel_id}/messages`,
        {
          content: "Sorry, something went wrong.",
        },
        {
          headers: {
            Authorization: `Bot ${discordApiKey}`,
          },
        }
      )
      .catch((error) => console.error(error));
  }
}

// Log in to Discord API and set the required permissions for the bot user
client
  .login(botToken)
  .then(() => {
    const channel = client.channels.cache.get(channelId);

    channel.overwritePermissions([
      {
        id: client.user.id,
        allow: permissions,
      },
    ]);

    console.log("Bot user permissions set!");
  })
  .catch((error) => console.error(error));

startMonitoringChannel();
