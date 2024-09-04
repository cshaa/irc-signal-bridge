# irc-signal-bridge
Install [signal-cli](https://github.com/AsamK/signal-cli/) and register an account with it. Use a different account than the one you use for your regular Signal activity. Test that you can send and receive messages. Add the bot into a new group, then use `signal-cli listGroups` to get the group ID.

Install [Bun](https://bun.sh/) and run `bun install` in this folder. Then launch the bridge using:

```bash
./mod.ts --nick "your-bots-nick" --channel "your-irc-channel" --account "your-signal-phone-number" --group-id "your-signal-group-id"
```
