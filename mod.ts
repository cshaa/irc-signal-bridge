#!/usr/bin/env bun
import { Client } from "@csha/irc";
import { delay, yeet, retry, type RetryOptions } from "@typek/typek";
import { args } from "@typek/clap";
import { receive, send } from "./signal.ts";
import { fromError } from "zod-validation-error";
import configSchema from "./schema.ts";

// TODO use JSON RPC mode instead of polling
const SIGNAL_RECEIVE_DELAY = 5_000;

const SIGNAL_RETRY: RetryOptions = {
  count: 5,
  delay: 500,
  exponentialBackoff: 5,
};

const configPath =
  args.get("--config") ?? yeet("Please provide a config file.");

const { accountNumber, ircServer, ircNick, ircPassword, ircTunnels } =
  await (async () => {
    try {
      return configSchema.parse(await Bun.file(configPath).json());
    } catch (e) {
      console.error(
        `Failed parsing the config file ${configPath}.`,
        fromError(e).toString()
      );
      process.exit(1);
    }
  })();

const client = new Client(ircServer, ircNick, {
  channels: ircTunnels.map(({ ircChannel }) => ircChannel),
  autoRejoin: true,
  password: ircPassword,
});

client.addListener(
  "message",
  async (from: string, to: string, message: string) => {
    if (from === ircNick) return;

    for (const { ircChannel, groupId } of ircTunnels) {
      if (to !== ircChannel) continue;

      console.log(
        `Forwarding from IRC channel ${ircChannel}: ${from} => ${message}`
      );
      try {
        await retry(SIGNAL_RETRY, async () =>
          send(accountNumber, {
            message: `@${from}: ${message}`,
            groupId,
          })
        );
      } catch (e) {
        console.error(e);
      }
    }
  }
);

console.log("The bridge is set up!");

while (true) {
  try {
    await delay(SIGNAL_RECEIVE_DELAY);
    retry(SIGNAL_RETRY, async () => {
      for (const entry of await receive(accountNumber)) {
        if (
          !("dataMessage" in entry.envelope) ||
          entry.envelope.dataMessage.message === null
        )
          continue;

        for (const { groupId, ircChannel } of ircTunnels) {
          if (entry.envelope.dataMessage.groupInfo?.groupId !== groupId)
            continue;

          console.log(
            `Forwarding from Signal to channel ${ircChannel}:`,
            entry.envelope.dataMessage.message
          );
          client.say(ircChannel, entry.envelope.dataMessage.message);
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}
