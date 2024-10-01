import { z } from "zod";

export default z.object({
  accountNumber: z.string(),
  ircServer: z.string(),
  ircNick: z.string(),
  ircPassword: z.string().optional(),
  ircTunnels: z.array(
    z.object({ ircChannel: z.string(), groupId: z.string() }),
  ),
});
