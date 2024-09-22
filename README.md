# irc-signal-bridge
Install [signal-cli](https://github.com/AsamK/signal-cli/) and register an account with it. Use a different account than the one you use for your regular Signal activity. Test that you can send and receive messages. Add the bot into a new group, then use `signal-cli listGroups` to get the group ID.

Install [Bun](https://bun.sh/) and run `bun install` in this folder. Then launch the bridge using:

```bash
./mod.ts --nick "your-bots-nick" --channel "your-irc-channel" --account "your-signal-phone-number" --group-id "your-signal-group-id"
```


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
