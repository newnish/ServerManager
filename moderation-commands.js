/**
 * Moderation Commands Module
 * Register all moderation commands with the client
 */

const mod = require('./moderation');

module.exports = (client, message) => {
  // ===== !KICK COMMAND =====
  if (message.content.startsWith('!kick ')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send('❌ Only server admins can use this command!');
    }

    const args = message.content.slice(6).trim().split(' ');
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!user) return message.channel.send('❌ Please mention a user to kick!');

    message.guild.members.fetch(user.id).then(member => {
      member.kick(reason).then(() => {
        message.channel.send({
          embeds: [{
            color: 0xFF6B6B,
            title: '👢 User Kicked',
            fields: [
              { name: 'User', value: user.tag, inline: true },
              { name: 'Reason', value: reason, inline: true },
              { name: 'Admin', value: message.author.tag, inline: true },
            ],
            timestamp: new Date(),
          }]
        });
        console.log(`👢 ${user.tag} kicked from ${message.guild.name}`);
      }).catch(err => message.channel.send('❌ Could not kick user!'));
    });
    return;
  }

  // ===== !BAN COMMAND =====
  if (message.content.startsWith('!ban ')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send('❌ Only server admins can use this command!');
    }

    const args = message.content.slice(5).trim().split(' ');
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!user) return message.channel.send('❌ Please mention a user to ban!');

    message.guild.members.ban(user.id, { reason }).then(() => {
      message.channel.send({
        embeds: [{
          color: 0xFF0000,
          title: '🔨 User Banned',
          fields: [
            { name: 'User', value: user.tag, inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'Admin', value: message.author.tag, inline: true },
          ],
          timestamp: new Date(),
        }]
      });
      console.log(`🔨 ${user.tag} banned from ${message.guild.name}`);
    }).catch(err => message.channel.send('❌ Could not ban user!'));
    return;
  }

  // ===== !UNBAN COMMAND =====
  if (message.content.startsWith('!unban ')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send('❌ Only server admins can use this command!');
    }

    const userId = message.content.slice(7).trim();
    if (!userId) return message.channel.send('❌ Please provide a user ID!');

    message.guild.bans.remove(userId).then(() => {
      message.channel.send({
        embeds: [{
          color: 0x00FF00,
          title: '✅ User Unbanned',
          fields: [
            { name: 'User ID', value: userId, inline: true },
            { name: 'Admin', value: message.author.tag, inline: true },
          ],
          timestamp: new Date(),
        }]
      });
      console.log(`✅ User ${userId} unbanned by ${message.author.tag}`);
    }).catch(err => message.channel.send('❌ Could not unban user!'));
    return;
  }

  // ===== !WARN COMMAND =====
  if (message.content.startsWith('!warn ')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send('❌ Only server admins can use this command!');
    }

    const args = message.content.slice(6).trim().split(' ');
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!user) return message.channel.send('❌ Please mention a user to warn!');

    const count = mod.addWarning(message.guildId, user.id, reason, message.author.id);
    
    message.channel.send({
      embeds: [{
        color: 0xFFA500,
        title: '⚠️ User Warned',
        fields: [
          { name: 'User', value: user.tag, inline: true },
          { name: 'Warnings', value: `${count}/3`, inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Admin', value: message.author.tag, inline: true },
        ],
        timestamp: new Date(),
      }]
    });
    console.log(`⚠️ ${user.tag} warned by ${message.author.tag} (${count}/3)`);

    // Auto-kick on 3 warns
    if (count >= 3) {
      message.guild.members.fetch(user.id).then(member => {
        member.kick('Auto-kick: 3 warnings').then(() => {
          message.channel.send({
            embeds: [{
              color: 0xFF0000,
              title: '🚫 User Auto-Kicked',
              fields: [
                { name: 'User', value: user.tag, inline: true },
                { name: 'Reason', value: 'Reached 3 warnings', inline: true },
              ],
              timestamp: new Date(),
            }]
          });
          mod.clearWarnings(message.guildId, user.id);
          console.log(`🚫 ${user.tag} auto-kicked for 3 warnings`);
        });
      });
    }
    return;
  }

  // ===== !WARNS COMMAND =====
  if (message.content.startsWith('!warns ')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send('❌ Only server admins can use this command!');
    }

    const user = message.mentions.users.first();
    if (!user) return message.channel.send('❌ Please mention a user!');

    const count = mod.getWarnings(message.guildId, user.id);
    const warnings = mod.getWarningsList(message.guildId, user.id);

    if (count === 0) {
      return message.channel.send(`✅ ${user.tag} has no warnings!`);
    }

    const warningsList = warnings.map((w, i) => 
      `**${i + 1}.** ${w.reason} (by <@${w.admin_id}> on ${new Date(w.created_at).toLocaleDateString()})`
    ).join('\n');

    message.channel.send({
      embeds: [{
        color: 0xFFA500,
        title: `⚠️ Warnings for ${user.tag}`,
        description: warningsList,
        footer: {
          text: `Total: ${count}/3`,
        },
      }]
    });
    return;
  }

  // ===== !MUTE COMMAND =====
  if (message.content.startsWith('!mute ')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send('❌ Only server admins can use this command!');
    }

    const args = message.content.slice(6).trim().split(' ');
    const user = message.mentions.users.first();
    const durationStr = args[args.length - 1];
    const duration = mod.parseDuration(durationStr);
    const expiresAt = new Date(Date.now() + duration);

    if (!user) return message.channel.send('❌ Please mention a user to mute!');

    mod.addMute(message.guildId, user.id, expiresAt);

    const durationText = durationStr || '10 minutes';
    message.channel.send({
      embeds: [{
        color: 0xFF9800,
        title: '🔇 User Muted',
        fields: [
          { name: 'User', value: user.tag, inline: true },
          { name: 'Duration', value: durationText, inline: true },
          { name: 'Admin', value: message.author.tag, inline: true },
        ],
        timestamp: new Date(),
      }]
    });
    console.log(`🔇 ${user.tag} muted for ${durationText}`);
    return;
  }

  // ===== !UNMUTE COMMAND =====
  if (message.content.startsWith('!unmute ')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send('❌ Only server admins can use this command!');
    }

    const user = message.mentions.users.first();
    if (!user) return message.channel.send('❌ Please mention a user to unmute!');

    mod.removeMute(message.guildId, user.id);

    message.channel.send({
      embeds: [{
        color: 0x00FF00,
        title: '🔊 User Unmuted',
        fields: [
          { name: 'User', value: user.tag, inline: true },
          { name: 'Admin', value: message.author.tag, inline: true },
        ],
        timestamp: new Date(),
      }]
    });
    console.log(`🔊 ${user.tag} unmuted by ${message.author.tag}`);
    return;
  }
};