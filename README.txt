================================================================================
                         SERVERMANAGER DISCORD BOT
================================================================================

WHAT IT DOES
============
ServerManager is a Discord bot that automates server setup and moderation.
Use it to quickly create server structures, manage members, and keep things organized.

CORE FEATURES
=============
✓ !setup          - Deploy entire server from templates (channels, roles, categories)
✓ !help           - View all available commands (general, admin, moderation, utilities)
✓ !welcomechannel - Toggle welcome messages in specific channels
✓ !invite         - Get the bot invite link to add to other servers
✓ .say            - Send anonymous messages (admin only)
✓ !kick/@user     - Remove members with optional reason
✓ !ban/@user      - Permanently ban members with optional reason
✓ !mute/@user     - Silence users for specified duration (30m, 1h, 1d, etc.)
✓ !warn/@user     - Issue warnings (auto-kick after 3 warnings)
✓ !warns @user    - Check warning count for a member

HOW TO START IT
===============
1. npm install (already done - node_modules exists)
2. npm start  OR  node index.js
3. OR use pm2: pm2 start index.js --name servermanager

BOT DETAILS
===========
Framework:     discord.js v14.25.1
Database:      SQLite3 (servermanager.db)
Entry Point:   index.js
Config:        .env file (token stored there)
Status Check:  pm2 list / pm2 status servermanager

KEY FILES
=========
index.js             - Main bot logic and command handlers
moderation.js        - Core moderation functions
moderation-commands.js - Moderation command implementations
index.html           - Documentation site (GitHub Pages)
README.md            - Full documentation

COMMAND CATEGORIES
==================
GENERAL:     !help, !invite, !welcomechannel
ADMIN:       !setup (deploy templates)
MODERATION:  !kick, !ban, !unban, !mute, !unmute, !warn, !warns
UTILITIES:   Built-in help with duration formats and syntax guides

QUICK REFERENCE
===============
Duration Format:  30m, 1h, 1d, 2h30m
User Syntax:      @username or user-id
Reason Syntax:    Optional [reason] in brackets

TROUBLESHOOTING
===============
- Bot offline?        → pm2 restart servermanager
- Commands not working? → Check !help for syntax
- Welcome messages not appearing? → Use !welcomechannel to enable
- Need to deploy template?  → Use !setup [--name CustomName]

LIVE SITE
=========
https://newnish.github.io/ServerManagerBot/
(Documentation, features, command examples)

DISCORD BOT DIRECTORIES
=======================
top.gg          - https://top.gg/bots/YOUR_BOT_ID
discord.bots    - https://discord.bots.gg
discordbotlist  - https://discordbotlist.com
(List your bot on these sites to increase visibility and usage)

================================================================================
Last Updated: 2026-03-28 | Ready to go!
================================================================================
