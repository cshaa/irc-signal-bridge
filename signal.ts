import { spawn } from "node:child_process";
import { JsonRpcCommand } from "./json-rpc.ts";
import { EventTarget } from "./event-target.ts";

interface NumberAndId {
  number: string;
  uuid: string;
}

interface ReceiveEntryCommon {
  envelope: {
    source: string;
    sourceNumber: string;
    sourceUuid: string;
    sourceName: string;
    sourceDevice: number;
    timestamp: number;
  };
  account: string;
}

interface ReceiveEntryReciept {
  envelope: {
    receiptMessage: {
      when: number;
      isDelivery: boolean;
      isRead: boolean;
      isViewed: boolean;
      timestamps: number[];
    };
  };
}

interface ReceiveEntryDataMessage {
  envelope: {
    dataMessage: {
      timestamp: number;
      message: string | null;
      expiresInSeconds: number;
      viewOnce: boolean;
      groupInfo?: {
        groupId: string;
        type: "DELIVER";
      };
    };
  };
}

export type ReceiveEntry = ReceiveEntryCommon &
  (
    | ReceiveEntryDataMessage
    | ReceiveEntryReciept
    | {
        /* unknown variant */
      }
  );

export interface SendResult {
  timestamp: 1725395016329;
  results: [
    {
      recipientAddress: {
        uuid: string;
        number: string;
      };
      groupId?: string;
      type: "SUCCESS";
    }
  ];
}

export interface GroupListing {
  id: string;
  name: string;
  description: string;
  isMember: boolean;
  isBlocked: boolean;
  messageExpirationTime: number;
  members: NumberAndId[];
  pendingMembers: NumberAndId[];
  requestingMembers: NumberAndId[];
  admins: NumberAndId[];
  banned: NumberAndId[];
  permissionAddMember: "EVERY_MEMBER";
  permissionEditDetails: "EVERY_MEMBER";
  permissionSendMessage: "EVERY_MEMBER";
  groupInviteLink: string | null;
}

export interface SignalClientEvents {
  receive: ReceiveEntry;
}

export class SignalClient extends EventTarget<SignalClientEvents> {
  public command: JsonRpcCommand;
  constructor(public readonly account: string) {
    super();
    this.command = new JsonRpcCommand(
      spawn(`signal-cli`, [`-o`, `json`, `-a`, account, `jsonRpc`])
    );
    this.command.addEventListener("notification", ({ method, params }) => {
      if (method !== "receive") return;
      this.dispatchEvent("receive", params as unknown as ReceiveEntry);
    });
  }

  async send({
    message,
    groupId,
    recipient,
  }: {
    message: string;
    groupId?: string;
    recipient?: string;
  }): Promise<SendResult> {
    if (groupId !== undefined) {
      return (await this.command.execMethod("send", {
        message,
        groupId,
      })) as SendResult;
    } else {
      return (await this.command.execMethod("send", {
        message,
        recipient,
      })) as SendResult;
    }
  }

  async listGroups(): Promise<GroupListing[]> {
    return (await this.command.execMethod("listGroups")) as GroupListing[];
  }
}
