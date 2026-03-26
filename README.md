# Template Bot 🎯

A Discord bot that creates server structures from JSON templates. Perfect for quickly setting up organized communities with channels, categories, roles, and welcome messages.

## Features

- 🎯 **`!setup`** — Create entire server structure from templates
- 💬 **`.say`** — Send anonymous messages (admin only)
- 🎉 **`!welcomechannel`** — Enable/disable welcome messages in a channel
- 🤖 **`!invite`** — Get bot invite link
- 📋 **`!help`** — View all commands
- 🎭 **Dynamic Server Names** — Customize with `--name` flag
- 🔧 **Custom Templates** — Create your own server templates

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- A Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Evilman34/template-bot.git
   cd template-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```
   DISCORD_TOKEN=your_bot_token_here
   ```

4. **Enable Privileged Gateway Intents**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your bot application
   - Go to **Bot** section
   - Enable these intents:
     - ✅ Message Content Intent
     - ✅ Server Members Intent

5. **Start the bot**
   ```bash
   npm start
   ```

## Commands

### Public Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!ping` | Check if bot is online | `!ping` |
| `!help` | Show all available commands | `!help` |
| `!invite` | Get bot invite link | `!invite` |

### Admin Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!setup [template] [--name "Name"]` | Set up server from template | `!setup rimel.json --name "My Server"` |
| `.say <message>` | Send anonymous message | `.say Welcome everyone!` |
| `!welcomechannel` | Toggle welcome messages in current channel | `!welcomechannel` |

## Usage Examples

### Basic Setup
```
!setup
```
Sets up server with the default template

### Custom Template with Custom Name
```
!setup default.json --name "Trading Community"
```
Uses a template and names the server "Trading Community"

### Send Anonymous Message
```
.say Welcome to our community! Please introduce yourself.
```
Sends the message anonymously and deletes the command

### Enable Welcome Messages
```
!welcomechannel
```
Enables welcome messages in the current channel. New members will be welcomed with an embed

## Available Templates

### 1. **default.json** (Basic Community)
Simple template with General, Support, and Voice channels.
```bash
!setup default.json --name "My Community"
```

### 2. **template.json** (Template Bot Community)
Dedicated community for Template Bot users with showcase and support channels.
```bash
!setup template.json --name "Template Bot Community"
```



## Creating Your Own Template

### Template Structure

Create a new JSON file in the `templates/` folder with this structure:

```json
{
  "categories": [
    {
      "id": "category-id",
      "name": "📁 Category Name",
      "channels": [
        {
          "name": "channel-name",
          "type": "text",
          "topic": "Channel description",
          "initialMessage": "Welcome message for the channel"
        },
        {
          "name": "voice-channel",
          "type": "voice"
        }
      ]
    }
  ],
  "roles": [
    {
      "name": "Role Name",
      "color": "#FF0000",
      "permissions": ["administrator"]
    }
  ]
}
```

### Template Components

#### Categories
Each category contains a group of channels.

```json
{
  "id": "unique-id",           // Unique identifier (lowercase, no spaces)
  "name": "📁 Category Name",   // Display name with emoji (max 50 chars)
  "channels": [...]             // Array of channels in this category
}
```

#### Text Channels
Text channels for discussion and messages.

```json
{
  "name": "channel-name",       // Channel name (lowercase, use hyphens)
  "type": "text",              // Must be "text"
  "topic": "Channel description", // Channel topic/purpose (max 1024 chars)
  "initialMessage": "Welcome!" // Message posted when channel is created
}
```

#### Voice Channels
Voice channels for audio communication.

```json
{
  "name": "Voice Channel",      // Channel name
  "type": "voice"              // Must be "voice"
}
```

#### Roles
Server roles with colors and permissions.

```json
{
  "name": "Admin",                      // Role name
  "color": "#FF0000",                   // Hex color code
  "permissions": ["administrator"]      // Array of permission strings
}
```

### Common Permissions

- `administrator` - Full admin access
- `moderateMembers` - Kick/ban members
- `manageMessages` - Delete/pin messages
- `manageChannels` - Create/delete channels
- `manageRoles` - Create/manage roles
- `manageGuild` - Manage server settings

### Complete Example

Here's a complete custom template for a gaming community:

```json
{
  "categories": [
    {
      "id": "general",
      "name": "💬 General",
      "channels": [
        {
          "name": "welcome",
          "type": "text",
          "topic": "Welcome to our gaming community",
          "initialMessage": "🎮 **Welcome to our Gaming Community!**\n\nGlad to have you here! Feel free to introduce yourself and jump into conversations."
        },
        {
          "name": "announcements",
          "type": "text",
          "topic": "Game updates and events",
          "initialMessage": "📢 **Announcements**\n\nStay tuned for news about upcoming events and tournaments!"
        },
        {
          "name": "general-chat",
          "type": "text",
          "topic": "Casual conversation",
          "initialMessage": "💬 **General Chat**\n\nChat about anything gaming related!"
        }
      ]
    },
    {
      "id": "games",
      "name": "🎮 Games",
      "channels": [
        {
          "name": "valorant",
          "type": "text",
          "topic": "Valorant discussion and LFG",
          "initialMessage": "🎯 **Valorant Channel**\n\nFind teammates, discuss strategies, and organize matches!"
        },
        {
          "name": "valorant-voice",
          "type": "voice"
        },
        {
          "name": "minecraft",
          "type": "text",
          "topic": "Minecraft servers and mods",
          "initialMessage": "⛏️ **Minecraft Channel**\n\nShare builds, mods, and server info!"
        }
      ]
    },
    {
      "id": "voice",
      "name": "🎙️ Voice",
      "channels": [
        {
          "name": "Hangout",
          "type": "voice"
        },
        {
          "name": "Gaming",
          "type": "voice"
        }
      ]
    }
  ],
  "roles": [
    {
      "name": "Owner",
      "color": "#FF0000",
      "permissions": ["administrator"]
    },
    {
      "name": "Moderator",
      "color": "#0099FF",
      "permissions": ["moderateMembers", "manageMessages"]
    },
    {
      "name": "Streamer",
      "color": "#FF00FF",
      "permissions": []
    },
    {
      "name": "Member",
      "color": "#808080",
      "permissions": []
    }
  ]
}
```

### Best Practices

1. **Use descriptive names** - Make channel names clear and lowercase
2. **Add emojis to categories** - Helps users quickly identify sections
3. **Write helpful initial messages** - Give users context about each channel
4. **Organize logically** - Group related channels in categories
5. **Keep it simple** - Don't overcomplicate with too many channels
6. **Use consistent colors** - Make roles visually distinct
7. **Test templates** - Try `!setup your-template.json` to verify it works

### Naming Conventions

- **Channel names:** lowercase, use hyphens for spaces (e.g., `general-chat`)
- **Category IDs:** lowercase, no spaces (e.g., `general`, `support`)
- **Category names:** Use emoji prefix for easy identification
- **Role names:** Capitalized (e.g., `Admin`, `Moderator`)
- **Colors:** Use hex codes (e.g., `#FF0000` for red)

## Deploying Your Template

Once you've created your template:

1. **Save it** in the `templates/` folder (e.g., `templates/my-template.json`)
2. **Test it locally** with `!setup my-template.json --name "Test"`
3. **Push to GitHub:**
   ```bash
   git add templates/my-template.json
   git commit -m "Add my-template template"
   git push
   ```
4. **Share** the template with others!

## Bot Permissions

The bot requires the following permissions to function properly:

- ✅ Administrator (simplest option)
- Or individually:
  - Manage Channels
  - Manage Roles
  - Send Messages
  - Read Message History
  - Manage Guild

## Troubleshooting

### Bot doesn't respond to commands
- Check that bot has Administrator permissions
- Verify intents are enabled in Developer Portal
- Make sure bot is online: `!ping`

### Setup command fails
- Ensure template file exists in `templates/` folder
- Check JSON syntax is valid
- Verify bot has permission to delete channels and create new ones

### Welcome messages not working
- Enable Server Members intent in Developer Portal
- Use `!welcomechannel` to enable in desired channel
- Bot must have Send Messages permission

### Roles not created
- Check role name doesn't already exist
- Verify bot has Manage Roles permission
- Check role names are valid (max 100 characters)

## Support

Need help? Check the `!help` command in Discord or open an issue on GitHub.

## License

MIT License - Feel free to use and modify!

## Contributing

Have a great template idea? Submit a PR or open an issue!

---

**Made with ❤️ by Evilman34**
