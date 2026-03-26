// Load environment variables from .env file
require('dotenv').config();

// Import required Discord.js modules
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ===== WELCOME FEATURE CONFIG =====
// Track enabled welcome channels per server (guildId => channelId)
const welcomeChannels = {};

/**
 * Load template JSON file from templates folder
 * @param {string} templateName - Name of the template file (default: server-template.json)
 * @returns {object} Parsed template JSON object
 * @throws {Error} If template file doesn't exist
 */
function loadTemplate(templateName = 'server-template.json') {
  const templatePath = path.join(__dirname, 'templates', templateName);
  
  // Check if specified template exists
  if (!fs.existsSync(templatePath)) {
    // Fall back to default template if file doesn't exist
    const defaultPath = path.join(__dirname, 'templates', 'server-template.json');
    if (!fs.existsSync(defaultPath)) {
      throw new Error('No template found! Create templates/server-template.json');
    }
    return JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
  }
  
  // Parse and return the template JSON
  return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
}

// Initialize Discord bot client with required intents
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,           // Required for guild events
    GatewayIntentBits.GuildMembers,     // Required for member join events
    GatewayIntentBits.GuildMessages,    // Required for message events
    GatewayIntentBits.MessageContent    // Required to read message content
  ] 
});

/**
 * Bot Ready Event - Fires once when bot successfully connects to Discord
 */
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/**
 * Message Create Event - Fires when a message is sent in any channel the bot can see
 */
client.on('messageCreate', async (message) => {
  // Ignore messages from bots to prevent infinite loops
  if (message.author.bot) return;

  // ===== !PING COMMAND =====
  // Simple health check - confirms bot is online and responsive
  if (message.content === '!ping') {
    message.reply('🏓 Pong!');
  }

  // ===== !HELP COMMAND =====
  // Displays all available commands in an embed
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
          name: '!setup [template] [--name "Server Name"]',
          value: 'Setup the server with channels and categories\nExamples:\n`!setup`\n`!setup template-bot-community.json`\n`!setup --name "My Server"`\n`!setup template-bot-community.json --name "Template Bot Community"`',
          inline: false,
        },
        {
          name: '!welcomechannel',
          value: '**Admin only** - Enable/disable welcome messages in current channel\nUsage: `!welcomechannel` to toggle',
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

  // ===== !WELCOMECHANNEL COMMAND =====
  // Toggle welcome messages for the current channel (admin only)
  if (message.content === '!welcomechannel') {
    // PERMISSION CHECK: Only server administrators can use this command
    if (!message.member.permissions.has('Administrator')) {
      return await message.channel.send('❌ Only server admins can use this command!');
    }

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    // Check if welcome is already enabled in this channel
    if (welcomeChannels[guildId] === channelId) {
      // DISABLE welcome channel
      delete welcomeChannels[guildId];
      await message.channel.send('✅ Welcome messages **disabled** for this channel.');
    } else {
      // ENABLE welcome channel
      welcomeChannels[guildId] = channelId;
      await message.channel.send('🎉 Welcome messages **enabled** for this channel!\n\nNew members will be welcomed here with a nice message.');
    }
  }

  // ===== !INVITE COMMAND =====
  // Generates a Discord OAuth2 invite link with Administrator permissions
  if (message.content === '!invite') {
    // Generate invite URL using bot's client ID
    // Requests: 'bot' scope and Administrator permission
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

  // ===== !SETUP COMMAND =====
  // Main command to set up server structure from templates
  // Syntax: !setup [template-name] [--name "Server Name"]
  if (message.content.startsWith('!setup')) {
    const guild = message.guild;
    if (!guild) return;

    // PERMISSION CHECK: Only server administrators can use this command
    if (!message.member.permissions.has('Administrator')) {
      return await message.channel.send('❌ Only server admins can use this command!');
    }

    try {
      // PARSE ARGUMENTS
      // Extract template name and custom server name from command
      const args = message.content.slice(6).trim().split(' ');
      let templateName = 'server-template.json';  // Default template
      let customServerName = null;

      // Check for template name (first arg, doesn't start with --)
      if (args[0] && !args[0].startsWith('--')) {
        templateName = args[0];
      }

      // Check for --name flag to set custom server name
      const nameIndex = message.content.indexOf('--name ');
      if (nameIndex !== -1) {
        const nameStart = nameIndex + 7;
        const nameEnd = message.content.indexOf('"', nameStart + 1);
        if (nameEnd !== -1) {
          customServerName = message.content.substring(nameStart + 1, nameEnd);
        }
      }
      
      // LOAD TEMPLATE
      // Load the JSON template file (falls back to default if not found)
      const template = loadTemplate(templateName);

      // DELETE ALL EXISTING CHANNELS
      // Fetch all channels and delete them to start fresh
      const channels = await guild.channels.fetch();
      for (const [, channel] of channels) {
        try {
          await channel.delete();
        } catch (err) {
          console.error(`Failed to delete ${channel.name}: ${err.message}`);
        }
      }

      // CREATE ROLES FROM TEMPLATE
      // Iterate through template roles and create them
      const roleMap = {};
      if (template.roles && template.roles.length > 0) {
        for (const roleData of template.roles) {
          try {
            // Convert permission strings to PermissionsBitField
            let permissions = [];
            if (roleData.permissions && roleData.permissions.length > 0) {
              permissions = roleData.permissions.map(perm => {
                // Map permission names to PermissionsBitField flags
                const permissionMap = {
                  'administrator': PermissionsBitField.Flags.Administrator,
                  'moderateMembers': PermissionsBitField.Flags.ModerateMembers,
                  'manageMessages': PermissionsBitField.Flags.ManageMessages,
                  'manageChannels': PermissionsBitField.Flags.ManageChannels,
                  'manageRoles': PermissionsBitField.Flags.ManageRoles,
                  'manageGuild': PermissionsBitField.Flags.ManageGuild,
                  'kickMembers': PermissionsBitField.Flags.KickMembers,
                  'banMembers': PermissionsBitField.Flags.BanMembers,
                };
                return permissionMap[perm] || null;
              }).filter(p => p !== null);
            }

            // Create role with specified color and permissions
            const role = await guild.roles.create({
              name: roleData.name,
              color: roleData.color,
              permissions: permissions,
              reason: 'Template Bot - Role creation',
            });
            roleMap[roleData.name] = role;
            console.log(`✅ Created role: ${roleData.name}`);
          } catch (err) {
            console.error(`Failed to create role ${roleData.name}: ${err.message}`);
          }
        }
      }

      // CREATE CHANNELS FROM TEMPLATE
      // Iterate through template categories and create them with their channels
      const categoryMap = {};

      for (const category of template.categories) {
        // Create category channel
        const categoryChannel = await guild.channels.create({
          name: category.name,
          type: ChannelType.GuildCategory,
        });

        categoryMap[category.id] = categoryChannel;

        // Create all channels within this category
        for (const channel of category.channels) {
          // Determine channel type (voice or text)
          const channelType = channel.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

          const createdChannel = await guild.channels.create({
            name: channel.name,
            type: channelType,
            parent: categoryChannel,
            topic: channel.topic || null,  // Set channel topic/description
          });

          // POST INITIAL MESSAGE
          // If channel is a text channel and has an initial message, post it
          if (channel.type === 'text' && channel.initialMessage) {
            await createdChannel.send(channel.initialMessage);
          }
        }
      }

      // Setup complete - no confirmation message shown
      // All channels and roles are now created and ready to use
    } catch (error) {
      // ERROR HANDLING
      console.error(error);
      if (message.channel) {
        await message.channel.send(`❌ Error: ${error.message}`);
      }
    }
  }

  // ===== .SAY COMMAND =====
  // Admin-only command to send anonymous messages (command message is deleted)
  if (message.content.startsWith('.say ')) {
    // PERMISSION CHECK: Only server administrators can use this command
    if (!message.member.permissions.has('Administrator')) {
      return await message.channel.send('❌ Only server admins can use this command!');
    }

    // Extract message content (remove ".say " prefix)
    const sayMessage = message.content.slice(5).trim();

    // Validate: message cannot be empty
    if (!sayMessage) {
      return await message.channel.send('❌ Please provide a message to send!');
    }

    try {
      // Send the anonymous message to the channel
      await message.channel.send(sayMessage);

      // Delete the original command message to hide who sent it
      await message.delete();
    } catch (error) {
      console.error(error);
      await message.channel.send('❌ Error sending message!');
    }
  }
});

/**
 * Guild Member Add Event - Fires when a new member joins the server
 * If welcome channel is enabled, sends a welcome message
 */
client.on('guildMemberAdd', async (member) => {
  const guildId = member.guild.id;
  const channelId = welcomeChannels[guildId];

  // Only send welcome if enabled for this server
  if (!channelId) return;

  try {
    // Get the welcome channel
    const channel = await member.guild.channels.fetch(channelId);
    if (!channel) return;

    // Create a nice welcome embed with emojis
    const welcomeEmbed = {
      color: 0x00FF00,
      title: '🎉 Welcome to the Server!',
      description: `Welcome ${member.user}! 👋\n\nWe're excited to have you join us!`,
      fields: [
        {
          name: '✨ Member Info',
          value: `**Username:** ${member.user.username}\n**Joined:** ${new Date().toLocaleDateString()}`,
          inline: false,
        },
        {
          name: '📋 Server Info',
          value: `**Server:** ${member.guild.name}\n**Total Members:** ${member.guild.memberCount}`,
          inline: false,
        },
        {
          name: '🚀 Getting Started',
          value: 'Check out the pinned messages and explore the channels. Don\'t hesitate to introduce yourself!',
          inline: false,
        },
      ],
      footer: {
        text: 'Thanks for joining us!',
        icon_url: member.guild.iconURL(),
      },
      timestamp: new Date(),
    };

    // Send the welcome message
    await channel.send({
      content: `🎊 **${member.user.username}** has joined the server!`,
      embeds: [welcomeEmbed],
    });
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
});

// ===== BOT LOGIN =====
// Load token from environment variable and connect to Discord
// Token must be set in .env file as DISCORD_TOKEN
client.login(process.env.DISCORD_TOKEN);
