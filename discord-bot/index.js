require('dotenv').config();

const admins = ['217839192619614208'];

const mysql = require('mysql');
const sql_pool = mysql.createPool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
});

const { Client, MessageEmbed } = require('discord.js');
const client = new Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content.toLowerCase() === '!verify') {
    sql_pool.query('SELECT * FROM discord_users WHERE discord_id = ?', [msg.member.id], (err, res) => {
        if (err) {
            msg.reply('Error connecting to the database!');
            console.error(err);
        } else if(res[0] === undefined) {
            msg.reply('Your Discord account is not linked to your UIUC account. Link your account at https://uiucverify.twong.dev');
        } else if (res[0]['banned']) {
            msg.reply('Your account is banned from being verified!');
        } else {
            const verifiedRole = msg.guild.roles.cache.find(role => role.name === 'uiuc-verified');
            if(verifiedRole) {
                msg.member.roles.add(verifiedRole).then().catch(console.error);
                msg.reply('Verified role has been added to your account.');
            } else {
                msg.reply('Could not find verified role! Please make a role called `uiuc-verified`.');
            }
        }
    });
  }
  else if (msg.content.toLowerCase().startsWith('!unlink')) {
      if(!admins.includes(msg.member.id)) {
        msg.reply('You don\'t have permission to unlink accounts!');
      } else if (msg.content.split(' ').length === 1) {
        msg.reply('Usage: !unlink <discord id>');
      } else {
        const discord_id = msg.content.split(' ')[1];
        sql_pool.query('SELECT * FROM discord_users WHERE discord_id = ?', [discord_id], (err, res) => {
            if (err) {
                msg.reply('Error connecting to the database!');
                console.error(err);
            } else if(res[0] === undefined) {
                msg.reply('Could not find linked account with discord id ' + discord_id);
            } else {
                console.log('Unlinking discord account ' + discord_id);
                sql_pool.query('DELETE FROM discord_users WHERE discord_id = ?', [discord_id], (err, res) => {
                    if (err) {
                        msg.reply('Error connecting to the database!');
                        console.error(err);
                    } else {
                        client.guilds.cache.forEach(guild => {
                            guild.members.fetch(discord_id).then((member) => {
                                const verifiedRole = guild.roles.cache.find(role => role.name === 'uiuc-verified');
                                if(verifiedRole) member.roles.remove(verifiedRole).then().catch(console.error);
                            }).catch(console.error);
                            msg.reply('Successfully unlinked Discord user ' + discord_id);
                        });
                    }
                });
            }
        });
      }
  }
  else if (msg.content.toLowerCase().startsWith('!verify-ban')) {
    if(!admins.includes(msg.member.id)) {
      msg.reply('You don\'t have permission to ban accounts!');
    } else if (msg.content.split(' ').length === 1) {
      msg.reply('Usage: !verify-ban <discord id>');
    } else {
      const discord_id = msg.content.split(' ')[1];
      sql_pool.query('SELECT * FROM discord_users WHERE discord_id = ?', [discord_id], (err, res) => {
          if (err) {
              msg.reply('Error connecting to the database!');
              console.error(err);
          } else if(res[0] === undefined) {
              msg.reply('Could not find linked account with discord id ' + discord_id);
          } else {
              console.log('Banning discord account ' + discord_id);
              sql_pool.query('UPDATE discord_users SET banned = TRUE WHERE discord_id = ?', [discord_id], (err, res) => {
                  if (err) {
                      msg.reply('Error connecting to the database!');
                      console.error(err);
                  } else {
                      client.guilds.cache.forEach(guild => {
                          guild.members.fetch(discord_id).then((member) => {
                              const verifiedRole = guild.roles.cache.find(role => role.name === 'uiuc-verified');
                              if(verifiedRole) member.roles.remove(verifiedRole);
                          }).catch(console.log);
                          msg.reply('Successfully banned Discord user ' + discord_id);
                      });
                  }
              });
          }
      });
    }
    }
    else if (msg.content.toLowerCase().startsWith('!verify-unban')) {
        if(!admins.includes(msg.member.id)) {
          msg.reply('You don\'t have permission to unban accounts!');
        } else if (msg.content.split(' ').length === 1) {
          msg.reply('Usage: !verify-unban <discord id>');
        } else {
          const discord_id = msg.content.split(' ')[1];
          sql_pool.query('SELECT * FROM discord_users WHERE discord_id = ?', [discord_id], (err, res) => {
              if (err) {
                  msg.reply('Error connecting to the database!');
                  console.error(err);
              } else if(res[0] === undefined) {
                  msg.reply('Could not find linked account with discord id ' + discord_id);
              } else {
                  console.log('Unbanning discord account ' + discord_id);
                  sql_pool.query('UPDATE discord_users SET banned = FALSE WHERE discord_id = ?', [discord_id], (err, res) => {
                      if (err) {
                          msg.reply('Error connecting to the database!');
                          console.error(err);
                      } else {
                          client.guilds.cache.forEach(guild => {
                              guild.members.fetch(discord_id).then((member) => {
                                  const verifiedRole = guild.roles.cache.find(role => role.name === 'uiuc-verified');
                                  if(verifiedRole) member.roles.remove(verifiedRole);
                              }).catch(console.log);
                              msg.reply('Successfully unbanned Discord user ' + discord_id);
                          });
                      }
                  });
              }
          });
        }
    }
    else if (msg.content.toLowerCase().startsWith('!verify-instructions')) {
        msg.delete().then().catch(console.error);
        let embed = new MessageEmbed()
            .setTitle('What is UIUC-Verify?')
            .setColor(0xE84A27)
            .setDescription('UIUC-Verify is an open-source bot that verifies Discord accounts belong\
             to students of the University of Illinois at Urbana-Champaign. You may view the\
             source code at https://github.com/CaptnSisko/uiucverify')
             .setAuthor('UIUC Verify', 'https://marketing.illinois.edu/images/brand/design/logo/block-i-blue-background.png', 
             'https://github.com/CaptnSisko/uiucverify')
             .setFooter('UIUC-Verify written by Captain_Sisko');
        
        embed.addField('How to verify your UIUC account for the first time',
        '1) Visit https://uiucverify.twong.dev/\n\
        2) Follow the directions on the website to log into Microsoft and Discord so the bot can link your accounts\n\
        3) Run `!verify` in a channel @UIUC-Verify can see', false);
        
        embed.addField('How to get verified after your first time',
        '1) Run `!verify` in a channel @UIUC-Verify can see. The bot will remember you verified accounts even across servers',
        false);

        embed.addField('Rules',
        '1) You may only link one Discord account to your Netid. The bot enforces this 1:1 relation.\n\
        2) Netid <-> Discord links are permanent. If you lose access to your Discord account and need to have it unlinked, contact a maintainer for assistance\n\
        3) Threats, hate speech, or other egregious rule violations may result in a permanent ban from verifying your account',
        false);

        msg.channel.send(embed);
    }        
});

client.login(process.env.DISCORD_BOT_TOKEN);