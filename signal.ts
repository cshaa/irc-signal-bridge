import { pipe } from "@typek/typek";
import { $ } from "bun";

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

export const receive = async (account: string) => {
  return pipe(
    await $`signal-cli -o json -a ${account} receive`.text(),
    (text) => text.split("\n"),
    (lines) => lines.filter((line) => line.includes("{")),
    (lines): ReceiveEntry[] => lines.map((line) => JSON.parse(line))
  );
};

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

export const listGroups = async (account: string): Promise<GroupListing[]> => {
  return await $`signal-cli -o json -a ${account} listGroups`.json();
};

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

export const send = async (
  account: string,
  {
    message,
    groupId,
    recipient,
  }: { message: string; groupId?: string; recipient?: string }
) => {
  if (groupId !== undefined) {
    return await $`signal-cli -o json -a ${account} send -m ${message} -g ${groupId}`.json();
  } else {
    return await $`signal-cli -o json -a ${account} send -m ${message} ${recipient}`.json();
  }
};
