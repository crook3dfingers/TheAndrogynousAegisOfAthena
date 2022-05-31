# The Androgynous Aegis of Athena
A discord bot for suggesting more inclusive language in discord channels.

Add a .env file with the following lines:
> DISCORD_TOKEN={YOUR_DISCORD_BOT_TOKEN}  
> LOGGER_LEVEL={debug|info|warn}  
> DO_NOT_REPLY={false|true}  
> NODE_TLS_REJECT_UNAUTHORIZED='0'

To change the bot username/avatar, run the following:
```bash
$ IMAGE=$(base64 -w 0 rainbow-star.png)

$ curl -H 'Authorization: Bot {YOUR_DISCORD_BOT_TOKEN}' -H "Content-Type: application/json" -X PATCH -d '{"username": "The Androgynous Aegis of Athena", "avatar": "data:image/png;base64,'"$IMAGE"'"}' https://discordapp.com/api/users/@me
```
