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
    sql_pool.query('SELECT * FROM discord_ids WHERE discord_id = SHA2( MD5(?), 256)', [msg.member.id], (err, res) => {
        if (err) {
            msg.reply('Error connecting to the database!');
            console.error(err);
        } else if(res[0] === undefined) {
            msg.reply('Your Discord account is not verified with UIUC account. Verify your account at https://uiucverify.twong.dev');
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
  else if (msg.content.toLowerCase().startsWith('!verify-delete-discord')) {
      if(!admins.includes(msg.member.id)) {
        msg.reply('You don\'t have permission to unlink accounts!');
      } else if (msg.content.split(' ').length === 1) {
        msg.reply('Usage: !verify-unlink-discord <discord id>');
      } else {
        const discord_id = msg.content.split(' ')[1];
        sql_pool.query('SELECT * FROM discord_ids WHERE discord_id = SHA2( MD5(?), 256)', [discord_id], (err, res) => {
            if (err) {
                msg.reply('Error connecting to the database!');
                console.error(err);
            } else if(res[0] === undefined) {
                msg.reply('Could not find discord id ' + discord_id);
            } else {
                console.log('Unlinking discord account ' + discord_id);
                sql_pool.query('DELETE FROM discord_ids WHERE discord_id = SHA2( MD5(?), 256)', [discord_id], (err, res) => {
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
  else if (msg.content.toLowerCase().startsWith('!verify-delete-email')) {
    if(!admins.includes(msg.member.id)) {
      msg.reply('You don\'t have permission to unlink accounts!');
    } else if (msg.content.split(' ').length === 1) {
      msg.reply('Usage: !verify-unlink-email <email>');
    } else {
      const email = msg.content.split(' ')[1].toLowerCase();
      sql_pool.query('SELECT * FROM emails WHERE email = SHA2( MD5(?), 256)', [email], (err, res) => {
          if (err) {
              msg.reply('Error connecting to the database!');
              console.error(err);
          } else if(res[0] === undefined) {
              msg.reply('Could not find email');
          } else {
              console.log('Unlinking discord account ' + email);
              sql_pool.query('DELETE FROM emails WHERE email = SHA2( MD5(?), 256)', [email], (err, res) => {
                  if (err) {
                      msg.reply('Error connecting to the database!');
                      console.error(err);
                  } else {
                    msg.reply('Successfully deleted email');
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
        '1) Visit https://uiucverify.twong.dev\n\
        2) Follow the directions on the website to log into Microsoft and Discord so the bot can hash and remember your accounts\n\
        3) Run `!verify` in a channel @UIUC-Verify can see', false);
        
        embed.addField('How to get verified after your first time',
        '1) Run `!verify` in a channel @UIUC-Verify can see. The bot will remember you verified accounts even across servers',
        false);

        embed.addField('Rules',
        '1) You may only verify one Discord account with your Netid. The bot stores hashed netids so you can\'t use the same one twice.\n\
        2) Netid <-> Discord verifications are permanent. If you lose access to your Discord account and need a new one linked, contact a maintainer for assistance\n\
        3) Please be kind to your fellow UIUC Students',
        false);

        embed.addField('Privacy',
        'This bot stores securely hashed discord ids and securely hashed net ids with no linking between them; in other words, the bot doesn\'t know\
        which discord account belongs to which student, and a hacker could not gain any identifiable information. Read more at https://github.com/CaptnSisko/uiucverify/blob/main/privacy.md',
        false);

        msg.channel.send(embed);
    }        
});

client.login(process.env.DISCORD_BOT_TOKEN);