# irc-signal-bridge
Install [signal-cli](https://github.com/AsamK/signal-cli/) and register an account with it. Use a different account than the one you use for your regular Signal activity. Test that you can send and receive messages. Add the bot into a new group, then use `signal-cli listGroups` to get the group ID.

Install [just](https://github.com/casey/just?tab=readme-ov-file#readme) and [Bun](https://bun.sh/). Create the following config file:
```jsonc
{
  "$schema": "./schema.json",
  "accountNumber": "+123456789", // your Signal phone number
  "ircServer": "irc.libera.chat", // IRC server
  "ircNick": "mybot^signal", // the nick your bot should use on IRC
  "ircPassword": "pass1!", // optional IRC password for the nick
  "ircTunnels": [
    {
      "ircChannel": "#mychan", // name of an IRC channel
      "groupId": "asdfASDF123=" // id of a Signal group as listed by `signal-cli listGroups`
    }
  ]
}
```
Then launch the bridge using `just run config.json`.


## Docker
To use with Docker:
```sh
docker build -t irc-signal-bridge . # build the container

docker run -it --entrypoint /bin/bash irc-signal-bridge # open a shell in the container

# either link it to an existing account
signal-cli link # use `signal-cli addDevice --uri ...` on the other device
# or
signal-cli register ... # register a new account

exit

docker run irc-signal-bridge ... # run it with the same arguments as ./mod.ts above
```
