require('dotenv').config();
const bcrypt = require('bcrypt');
const saltRounds = 10;

const mysql = require('mysql');
const sql_credentials = {
  	host: process.env.DB_HOST,
  	port: process.env.DB_PORT,
  	user: process.env.DB_USER,
  	password: process.env.DB_PASSWORD,
  	database: process.env.DB_NAME
}

let con = mysql.createConnection(sql_credentials);
con.query('SELECT * FROM legacy_discord_users', (err, data) => {
  if(err) console.error(err);


  for(user in data) {

    console.log(`Working on user ${user}`);

    con.query('INSERT INTO discord_ids VALUES ( SHA2(?, 256) )', [data[user]['discord_id']], (err, res) => {
      if(err) console.error(err);
    });

    con.query('INSERT INTO emails VALUES ( SHA2(?, 256) )', [data[user]['ms_email']], (err, res) => {
      if(err) console.error(err);
    });
  }
  console.log('Finished migration');
});

