# UIUC-Verify

A self-hostable system for verifying student status of students at the University of Illinois at Urbana-Champaign

# Installation

## Prerequisites
You will need the following to use the Discord bot and website:
- An Azure Application created through the [Azure App Registration Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
- A Discord application and bot created through the [Discord Developer Portal](https://discord.com/developers/applications)
- A domain name
- A VPS, or some other means of hosting a web server, two node applications, and an SQL-compatible database

The following instructions will be assuming you are hosting this application with a VPS running Ubuntu, but they can be adapted to other hosting platforms as well.

## Web Server
1) Use an A record to point the domain you'd like to use at the VPS
2) Install nginx (`sudo apt install nginx`, or the relavent command for your distro) and ensure ports 80 and 443 are open on your firewall
3) Follow the [official Certbot docs](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal) to obtain an SSL certificate and apply it to your web server
4) Navigate to `/etc/nginx/sites-available` and create a file called `uiucverify.conf` with the following content:
```
server {
    listen 80;
    server_name YOUR.DOMAIN.NAME;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name YOUR.DOMAIN.NAME;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/YOUR.DOMAIN.NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR.DOMAIN.NAME/privkey.pem;

    # modern configuration
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_dhparam /etc/ssl/dhparam.pem;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_prefer_server_ciphers on;
    ssl_ciphers "ALL:!AES128:!CAMELLIA128:!CAMELLIA:!ARIA128:!RSA:!SEED:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK:!DHE-RSA-AES256:!ECDHE-RSA-AES256-SHA384:!DHE-RSA-AES256-SHA256:!ECDHE-RSA-AES256-SHA:!DHE-RSA-AES256-SHA:@STRENGTH";
    ssl_ecdh_curve secp521r1:secp384r1;
    add_header Strict-Transport-Security "max-age=15768000; preload;";

    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Robots-Tag none;
    add_header Content-Security-Policy "frame-ancestors 'self'";
    add_header X-Frame-Options DENY;
    add_header Referrer-Policy same-origin;

    location / {
        proxy_pass         http://localhost:3000;
    }

}
```
Be sure to replace YOUR.DOMAIN.NAME with the domain pointed at your vps. The SSL settings in this file are designed to favor security with modern browsers over compatibility, but they can be tweaked as needed. See [Mozilla's guide](https://ssl-config.mozilla.org/) for more SSL configuration options.

5) Remove `/etc/nginx/sites-enabled/default` (or whatever the nginx default site configuration is), then use a symlink to add your new site to sites-enabled: `ln -s /etc/nginx/sites-available/uiucverify.conf /etc/nginx/sites-enabled/`
6) Check your configuration for syntax errors using `sudo nginx -t`
7) Restart nginx to apply the changes using `sudo service nginx restart` or the relavent command for your distro.

## Database
1) Install [MariaDB](https://mariadb.com/kb/en/mariadb-package-repository-setup-and-usage/)
2) Run `sudo mysql_secure_installation` to help secure the database server
3) Run the commands in the web-server/create_table.sql file

## NodeJS Applications
1) Follow the [official Node.js docs](https://nodejs.org/en/download/package-manager/) to install the latest LTS release of NodeJs and npm with the package manager of your choice.
2) Clone this repository
3) Navigate to `discord-bot` and run `npm i`
4) Copy `.env.template` to `.env` and fill in the database credentials and Discord bot token
5) Run `node .` to start the bot. You should execute this command in a separate screen or as a background process to ensure it persists after you log out. For production use, [pm2](https://pm2.io/) is recommended.
6) Repeat the above steps for `web-server`, filling in the information as needed. Generate a secure random string for `COOKIE_SECRET_TOKEN`.


