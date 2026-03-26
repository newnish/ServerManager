require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Function to load template
function loadTemplate(templateName = 'server-template.json') {
  const templatePath = path.join(__dirname, 'templates', templateName);
  
  if (!fs.existsSync(templatePath)) {
    // Fall back to default if file doesn't exist
    const defaultPath = path.join(__dirname, 'templates', 'server-template.json');
    if (!fs.existsSync(defaultPath)) {
      throw new Error('No template found! Create templates/server-template.json');
    }
    return JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
  }
  
  return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply('🏓 Pong!');
  }

  if (message.content === '!help') {
    const embed = {
      color: 0x0099ff,
      title: '📖 Available Commands',
      description: 'Here are all the commands you can use:',
      fields: [
        {
          name: '!ping',
          value: 'Check if the bot is online',
          inline: false,
        },
        {
          name: '!help',
          value: 'Show this help message',
          inline: false,
        },
        {
          name: '!invite',
          value: 'Get the bot invite link',
          inline: false,
        },
        {
          name: '!setup [template]',
          value: 'Setup the server with channels and categories\nExample: `!setup` or `!setup custom-template.json`',
          inline: false,
        },
        {
          name: '.say <message>',
          value: '**Admin only** - Send a message anonymously (deletes command)\nExample: `.say Hello everyone!`',
          inline: false,
        },
      ],
      footer: {
        text: 'For more info, contact the server admins',
      },
    };
    await message.channel.send({ embeds: [embed] });
  }

  if (message.content === '!invite') {
    const { PermissionsBitField } = require('discord.js');
    
    const inviteUrl = client.generateInvite({
      scopes: ['bot'],
      permissions: [PermissionsBitField.Flags.Administrator],
    });

    const embed = {
      color: 0x00ff00,
      title: '🤖 Bot Invite Link',
      description: 'Click the link below to invite this bot to your server:',
      fields: [
        {
          name: 'Permissions',
          value: '🔓 Administrator',
          inline: false,
        },
        {
          name: 'Invite URL',
          value: `[Click here to invite](${inviteUrl})`,
          inline: false,
        },
      ],
      footer: {
        text: 'This bot requires Administrator permission to function properly',
      },
    };

    await message.channel.send({ embeds: [embed] });
  }

  if (message.content.startsWith('.say ')) {
    // Check if user is admin
    if (!message.member.permissions.has('Administrator')) {
      return await message.channel.send('❌ Only server admins can use this command!');
    }

    // Get the message content
    const sayMessage = message.content.slice(5).trim();

    if (!sayMessage) {
      return await message.channel.send('❌ Please provide a message to send!');
    }

    try {
      // Send the anonymous message
      await message.channel.send(sayMessage);

      // Delete the original command message
      await message.delete();
    } catch (error) {
      console.error(error);
      await message.channel.send('❌ Error sending message!');
    }
  }

  if (message.content.startsWith('!setup')) {
    const guild = message.guild;
    if (!guild) return;

    // Check if user is admin
    if (!message.member.permissions.has('Administrator')) {
      return await message.channel.send('❌ Only server admins can use this command!');
    }

    try {
      // Parse template name from command
      const args = message.content.split(' ');
      const templateName = args[1] || 'server-template.json';
      
      // Load template
      const template = loadTemplate(templateName);

      // Delete all existing channels
      const channels = await guild.channels.fetch();
      for (const [, channel] of channels) {
        try {
          await channel.delete();
        } catch (err) {
          console.error(`Failed to delete ${channel.name}: ${err.message}`);
        }
      }

      // Create channels from template
      const categoryMap = {};

      for (const category of template.categories) {
        // Create category
        const categoryChannel = await guild.channels.create({
          name: category.name,
          type: ChannelType.GuildCategory,
        });

        categoryMap[category.id] = categoryChannel;

        // Create channels in this category
        for (const channel of category.channels) {
          const channelType = channel.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

          const createdChannel = await guild.channels.create({
            name: channel.name,
            type: channelType,
            parent: categoryChannel,
            topic: channel.topic || null,
          });

          // Post initial message if it's a text channel
          if (channel.type === 'text' && channel.initialMessage) {
            await createdChannel.send(channel.initialMessage);
          }
        }
      }

      const embed = {
        color: 0x00ff00,
        title: '✅ Community Setup Complete!',
        description: `Loaded template: **${templateName}**`,
        fields: [
          {
            name: 'Categories Created',
            value: template.categories.map(cat => `• ${cat.name}`).join('\n'),
          }
        ],
      };

      if (message.channel) {
        await message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      if (message.channel) {
        await message.channel.send(`❌ Error: ${error.message}`);
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
