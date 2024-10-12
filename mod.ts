#!/usr/bin/env -S deno run -A
import process from "node:process";
import { Client as IrcClient } from "@csha/irc";
import { retry, type RetryOptions, yeet } from "@typek/typek";
import { args } from "@typek/clap";
import { SignalClient } from "./signal.ts";
import { fromError } from "zod-validation-error";
import configSchema from "./schema.ts";

const SIGNAL_RETRY: RetryOptions = {
  count: 5,
  delay: 500,
  exponentialBackoff: 5,
};

const configPath = args.get("--config") ??
  yeet("Please provide a config file.");

const { accountNumber, ircServer, ircNick, ircPassword, ircTunnels } = (() => {
  try {
    return configSchema.parse(JSON.parse(Deno.readTextFileSync(configPath)));
  } catch (e) {
    console.error(
      `Failed parsing the config file ${configPath}.`,
      fromError(e).toString(),
    );
    process.exit(1);
  }
})();

const ircClient = new IrcClient(ircServer, ircNick, {
  channels: ircTunnels.map(({ ircChannel }) => ircChannel),
  autoRejoin: true,
  password: ircPassword,
});

const signalClient = new SignalClient(accountNumber);

ircClient.addListener(
  "message",
  async (from: string, to: string, message: string) => {
    if (from === ircNick) return;

    for (const { ircChannel, groupId } of ircTunnels) {
      if (to !== ircChannel) continue;

      console.log(
        `Forwarding from IRC channel ${ircChannel}: ${from} => ${message}`,
      );
      try {
        await retry(SIGNAL_RETRY, () =>
          signalClient.send({
            message: `@${from}: ${message}`,
            groupId,
          }));
      } catch (e) {
        console.error(e);
      }
    }
  },
);

signalClient.addEventListener("receive", (entry) => {
  if (
    !("dataMessage" in entry.envelope) ||
    entry.envelope.dataMessage.message === null
  ) {
    return;
  }

  for (const { groupId, ircChannel } of ircTunnels) {
    if (entry.envelope.dataMessage.groupInfo?.groupId !== groupId) continue;

    console.log(
      `Forwarding from Signal to channel ${ircChannel}:`,
      entry.envelope.dataMessage.message,
    );
    ircClient.say(ircChannel, entry.envelope.dataMessage.message);
  }
});

console.log("The bridge is set up!");
