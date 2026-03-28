// Load environment variables from .env file
require('dotenv').config();

// Import required Discord.js modules
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const handleModerationCommands = require('./moderation-commands');

// ===== DATABASE SETUP =====
// Initialize SQLite database for persistent settings
const db = new Database(path.join(__dirname, 'servermanager.db'));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS welcome_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT UNIQUE NOT NULL,
    channel_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Database initialized');

// ===== DATABASE FUNCTIONS =====
/**
 * Get welcome channel for a guild
 * @param {string} guildId - The guild/server ID
 * @returns {string|null} The channel ID if enabled, null otherwise
 */
function getWelcomeChannel(guildId) {
  const row = db.prepare('SELECT channel_id FROM welcome_channels WHERE guild_id = ? AND enabled = 1').get(guildId);
  return row ? row.channel_id : null;
}

/**
 * Enable welcome channel for a guild
 * @param {string} guildId - The guild/server ID
 * @param {string} channelId - The channel ID to enable
 */
function setWelcomeChannel(guildId, channelId) {
  db.prepare('INSERT OR REPLACE INTO welcome_channels (guild_id, channel_id, enabled) VALUES (?, ?, 1)')
    .run(guildId, channelId);
}

/**
 * Disable welcome channel for a guild
 * @param {string} guildId - The guild/server ID
 */
function disableWelcomeChannel(guildId) {
  db.prepare('UPDATE welcome_channels SET enabled = 0 WHERE guild_id = ?').run(guildId);
}

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
  
  // Set bot presence - always listening to !help
  client.user.setPresence({
    activities: [
      {
        name: '!help',
        type: 2, // LISTENING
      }
    ],
    status: 'online',
  });
  
  console.log(`🎵 Presence set: Listening to !help`);
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
  // Displays all available commands in organized, beautiful embeds with categories
  if (message.content === '!help' || message.content.startsWith('!help ')) {
    // Extract category if provided
    const category = message.content.slice(6).trim().toLowerCase();

    // Main Overview Embed (shown when no category specified)
    const overviewEmbed = {
      color: 0x5865F2, // Discord blurple
      title: '📚 ServerManager Bot - Command Help',
      description: 'A powerful Discord bot for server management, setup, and moderation.',
      fields: [
        {
          name: '📋 Command Categories',
          value: '`!help general` — Public commands\n`!help admin` — Server setup & configuration\n`!help moderation` — Moderation & enforcement\n`!help utilities` — Utility commands',
          inline: false,
        },
        {
          name: '💡 Tip',
          value: 'Type `!help [category]` to see detailed info for each group!',
          inline: false,
        },
      ],
      footer: {
        text: 'ServerManager v1.0',
      },
      timestamp: new Date(),
    };

    // GENERAL COMMANDS (Public)
    const generalEmbed = {
      color: 0x57F287, // Discord green
      title: '🎯 General Commands',
      description: 'Public commands everyone can use',
      fields: [
        {
          name: '!ping',
          value: '🏓 Check if the bot is online and responsive\n**Usage:** `!ping`',
          inline: false,
        },
        {
          name: '!help [category]',
          value: '📚 Display help information\n**Usage:** `!help` or `!help moderation`\n**Categories:** general | admin | moderation | utilities',
          inline: false,
        },
        {
          name: '!invite',
          value: '🔗 Get the bot invite link to add it to another server\n**Usage:** `!invite`',
          inline: false,
        },
      ],
      footer: {
        text: 'Tip: Anyone can use these commands',
      },
      timestamp: new Date(),
    };

    // ADMIN COMMANDS (Admin Only)
    const adminEmbed = {
      color: 0xFAA61A, // Discord yellow/gold
      title: '⚙️ Admin & Setup Commands',
      description: '🔒 **Admin Only** — Server configuration & setup',
      fields: [
        {
          name: '!setup [template]',
          value: '🛠️ Build your server structure from a template\n**Usage:** `!setup` or `!setup template-name.json`\n**Effect:** Creates categories, channels, roles from template',
          inline: false,
        },
        {
          name: '!welcomechannel',
          value: '🎉 Toggle welcome messages in current channel\n**Usage:** `!welcomechannel`\n**Effect:** Enables/disables auto-welcome for new members',
          inline: false,
        },
        {
          name: '.say [message]',
          value: '💬 Send an anonymous message (command is hidden)\n**Usage:** `.say Hello everyone!`\n**Note:** Only admins can use, original message is deleted',
          inline: false,
        },
      ],
      footer: {
        text: 'Requires: Administrator permission',
      },
      timestamp: new Date(),
    };

    // MODERATION COMMANDS (Admin Only)
    const moderationEmbed = {
      color: 0xFF6B6B, // Discord red
      title: '🛡️ Moderation Commands',
      description: '🔒 **Admin Only** — Enforce server rules & manage users',
      fields: [
        {
          name: '👢 Member Removal',
          value: '**!kick** @user [reason]\n Remove user from server (they can rejoin)\n\n**!ban** @user [reason]\n Permanently ban user from server\n\n**!unban** [user-id]\n Unban a previously banned user',
          inline: false,
        },
        {
          name: '⚠️ Warning System',
          value: '**!warn** @user [reason]\n Issue a warning (auto-kick at 3 warnings)\n\n**!warns** @user\n View all warnings for a user',
          inline: false,
        },
        {
          name: '🔇 Muting',
          value: '**!mute** @user [duration]\n Temporarily mute a user (default: 10m)\n\n**!unmute** @user\n Remove mute from user',
          inline: false,
        },
      ],
      footer: {
        text: 'Requires: Administrator permission',
      },
      timestamp: new Date(),
    };

    // UTILITIES/OTHER
    const utilitiesEmbed = {
      color: 0x7289DA, // Discord light blue
      title: '🔧 Utilities & Info',
      description: 'Helpful commands and information',
      fields: [
        {
          name: 'Command Syntax',
          value: '**@user** = mention a user (e.g., @John)\n**[reason]** = optional explanation\n**[duration]** = time duration (e.g., 1h, 30m, 1d)',
          inline: false,
        },
        {
          name: 'Duration Examples',
          value: '`30m` = 30 minutes\n`1h` = 1 hour\n`1d` = 1 day\n`2h30m` = 2 hours 30 minutes',
          inline: false,
        },
      ],
      footer: {
        text: 'Need more help? Ask a server admin!',
      },
      timestamp: new Date(),
    };

    // Route to appropriate category or show overview
    if (!category) {
      // Show overview if no category specified
      return await message.channel.send({ embeds: [overviewEmbed] });
    }

    if (category === 'general') {
      return await message.channel.send({ embeds: [generalEmbed] });
    } else if (category === 'admin') {
      return await message.channel.send({ embeds: [adminEmbed] });
    } else if (category === 'moderation') {
      return await message.channel.send({ embeds: [moderationEmbed] });
    } else if (category === 'utilities' || category === 'utility') {
      return await message.channel.send({ embeds: [utilitiesEmbed] });
    } else {
      // Unknown category - show overview with error
      const errorEmbed = {
        color: 0xFF0000,
        title: '❌ Unknown Category',
        description: `"${category}" is not a valid category.`,
        fields: [
          {
            name: 'Available Categories',
            value: '`general` | `admin` | `moderation` | `utilities`',
            inline: false,
          },
          {
            name: 'Try:',
            value: '`!help general` or `!help moderation`',
            inline: false,
          },
        ],
      };
      return await message.channel.send({ embeds: [errorEmbed] });
    }
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
    const currentWelcomeChannel = getWelcomeChannel(guildId);
    
    if (currentWelcomeChannel === channelId) {
      // DISABLE welcome channel
      disableWelcomeChannel(guildId);
      await message.channel.send('✅ Welcome messages **disabled** for this channel.');
      console.log(`⚠️ Welcome channel disabled for guild ${guildId}`);
    } else {
      // ENABLE welcome channel
      setWelcomeChannel(guildId, channelId);
      await message.channel.send('🎉 Welcome messages **enabled** for this channel!\n\nNew members will be welcomed here with a nice message.');
      console.log(`✅ Welcome channel enabled for guild ${guildId} in channel ${channelId}`);
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
      // Extract template name from command
      const args = message.content.slice(6).trim().split(' ');
      let templateName = 'server-template.json';  // Default template

      // Check for template name (first arg)
      if (args[0] && args[0].trim()) {
        templateName = args[0];
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
            // Check if role already exists to avoid duplicates
            const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
            if (existingRole) {
              console.log(`⚠️ Role already exists: ${roleData.name}`);
              roleMap[roleData.name] = existingRole;
              continue;
            }

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

  // ===== MODERATION COMMANDS =====
  // Handle all moderation commands (!kick, !ban, !warn, !mute, etc.)
  handleModerationCommands(client, message);
});

/**
 * Guild Member Add Event - Fires when a new member joins the server
 * If welcome channel is enabled, sends a welcome message
 */
client.on('guildMemberAdd', async (member) => {
  const guildId = member.guild.id;
  
  // Get welcome channel from database
  const channelId = getWelcomeChannel(guildId);

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
