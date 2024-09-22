#!/usr/bin/env bun
import { Client } from "@csha/irc";
import { delay, yeet, retry, type RetryOptions } from "@typek/typek";
import { args } from "@typek/clap";
import { receive, send } from "./signal";

const SIGNAL_RETRY: RetryOptions = {
  count: 5,
  delay: 500,
  exponentialBackoff: 5,
};

const account =
  args.get("--account", "-a") ??
  yeet("Please provide a Signal account via the --access (-a) flag.");

const group =
  args.get("--group-id", "-g") ??
  yeet("Please provide a Signal group ID via the --group-id (-g) flag.");

const nick =
  args.get("--nick", "-n") ??
  yeet("Please provide an IRC nick via the --nick (-n) flag.");

const channel =
  args.get("--channel", "-c") ??
  yeet("Please provide an IRC channel via the --channel (-c) flag.");

const password =
  args.get("--password", "-p") ??
  console.info(
    "You can optionally provide an IRC password via the --password (-p) flag."
  ) ??
  undefined;

const client = new Client("irc.libera.chat", nick, {
  channels: [channel],
  autoRejoin: true,
  password,
});

client.addListener(
  "message",
  async (from: string, to: string, message: string) => {
    if (to !== channel || from === nick) return;

    console.log("Forwarding from IRC:", from, "=>", message);
    try {
      await retry(SIGNAL_RETRY, async () =>
        send(account, {
          message: `@${from}: ${message}`,
          groupId: group,
        })
      );
    } catch (e) {
      console.error(e);
    }
  }
);

console.log("The bridge is set up!");

while (true) {
  try {
    await delay(100);
    retry(SIGNAL_RETRY, async () => {
      for (const entry of await receive(account)) {
        if (
          "dataMessage" in entry.envelope &&
          entry.envelope.dataMessage.groupInfo?.groupId === group &&
          entry.envelope.dataMessage.message !== null
        ) {
          console.log(
            "Forwarding from Signal:",
            entry.envelope.dataMessage.message
          );
          client.say(channel, entry.envelope.dataMessage.message);
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}
