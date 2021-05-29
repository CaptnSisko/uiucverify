# UIUC Verify Privacy

Understandably, many students have concerns with linking their personal Discord accounts to their Netid. Fortunately, the bot is designed in such a way that it doesn't need to store a link between Netids and Discord ids, and it only stores hashed values. Here's a summary of how the website bot works:

Website (used for linking accounts)
1) Direct users to log in via Microsoft to their Illinois account
2) Direct users to log in via Discord
3) Use the API key returned by Microsoft to get the user's Illinois email
4) Use the API key returned by Discord to get the user's Discord account id
5) Hash the Illinois email and Discord account id, and check the hashes against the Databases. If either of the hashes exist in the databases, reject the user's request to link accounts
6) Hash the Illinois email and store the hash in an emails table
7) Hash the Discord id and store it in a discord ids table

Discord Bot (used for granting the rank on Discord servers)
1) Listen for !verify command
2) When the verify command is executed, hash the sender's Discord id and check if it exists in the Discord id database. If it exists, grant the verified role to the user

## FAQ
What if the bot steals my Netid or Discord login information?
- The Discord and Netid login are handled through a system called Oauth 2, meaning **the bot never touches your login credentials**. When you are logging in, you will  enter your credentials at Microsoft.com, Illinois.edu, and Discord.com. These websites then give the bot the bare minimum amount of information to identify you. You can learn more about Oauth at https://www.oauth.com/.

What is hashing?
- Hashing is the act of passing data through a hash function, which is a function whose output cannot be used to compute the input. Thus, it is not possible to take an email hash stored in the database and turn it back into an email.

What hash function are you using?
- SHA-256 (https://en.wikipedia.org/wiki/SHA-2)

If the database is stolen, doesn't storing unsalted hashes leave you vulnurable to lookup table attacks?
- Such an attack would require the attacker already have access to a list of every Illinois email and Discord ID, so the attacker wouldn't gain any new information other than which students have verified their Discord account. But, because the Discord ids and Emails are stored in a separate table, the attacker would not know which Discord account belonged to whom.

Does the person running the bot know which Discord account belongs to whom?
- No; Discord account <-> Email account linkings are not logged, and the database only stores hashes.
