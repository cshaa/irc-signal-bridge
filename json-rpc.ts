import { type ChildProcess } from "node:child_process";
import {
  Readable as NodeReadable,
  Writable as NodeWritable,
} from "node:stream";
import { EventTarget } from "./event-target.ts";
import { lines } from "@typek/typek";

export type JsonRpcParams = Record<string, unknown> | unknown[];
export type JsonRpcId = string | number | null;

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: JsonRpcParams;
}

export interface JsonRpcRequest extends JsonRpcNotification {
  id: JsonRpcId;
}

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
} & (
  | {
      result: unknown;
    }
  | {
      error: JsonRpcError;
    }
);

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}
export const isJsonRpcError = (x: unknown): x is JsonRpcError =>
  typeof x === "object" &&
  x !== null &&
  "code" in x &&
  typeof x.code === "number" &&
  "message" in x &&
  typeof x.message === "string";

export type JsonRpcLine =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcResponse;

export interface JsonRpcCommandEvents {
  line: JsonRpcLine;
  request: JsonRpcRequest;
  notification: JsonRpcNotification;
  response: JsonRpcResponse;
  error: any;
}

export class JsonRpcCommand extends EventTarget<JsonRpcCommandEvents> {
  stdin: WritableStream<string>;

  private nextId = 0;
  markIdAsUsed(id: JsonRpcId) {
    if (typeof id === "number" && this.nextId <= id) {
      this.nextId = id + 1;
    }
  }
  getUniqueId() {
    return this.nextId++;
  }

  constructor(public process: ChildProcess) {
    super();

    this.stdin = NodeWritable.toWeb(process.stdin!) as WritableStream<string>;
    const stdout: ReadableStream<string> = (
      NodeReadable.toWeb(process.stdout!) as ReadableStream<BufferSource>
    ).pipeThrough(new TextDecoderStream());

    (async () => {
      for await (const str of lines(stdout)) {
        try {
          const line: JsonRpcLine = JSON.parse(str);
          this.dispatchEvent("line", line);

          if ("method" in line) {
            if ("id" in line) {
              this.markIdAsUsed(line.id);
              this.dispatchEvent("request", line);
            } else {
              this.dispatchEvent("notification", line);
            }
          } else {
            this.markIdAsUsed(line.id);
            this.dispatchEvent("response", line);
          }
        } catch (err) {
          console.error(err);
          this.dispatchEvent("error", err);
        }
      }
    })();
  }

  async execMethod(method: string, params?: JsonRpcParams): Promise<unknown> {
    const writer = this.stdin.getWriter();
    await writer.ready;

    const id = this.getUniqueId();
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    await writer.write(JSON.stringify(request) + "\n");
    writer.releaseLock();

    const response = await this.once("response", (res) => res.id === id);

    if ("result" in response) {
      return response.result;
    } else {
      throw response.error;
    }
  }

  async sendNotification(
    method: string,
    params?: JsonRpcParams
  ): Promise<void> {
    const writer = this.stdin.getWriter();
    await writer.ready;

    const notification: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    await writer.write(JSON.stringify(notification) + "\n");
    writer.releaseLock();
  }

  registerMethod(
    name: string,
    body: (params?: JsonRpcParams) => Promise<unknown> | unknown
  ): () => void {
    const callback = async (request: JsonRpcRequest) => {
      if (request.method !== name) return;
      const { id, params } = request;
      try {
        const result = await body(params);
        const response: JsonRpcResponse = {
          jsonrpc: "2.0",
          id,
          result,
        };

        const writer = this.stdin.getWriter();
        await writer.ready;
        await writer.write(JSON.stringify(response) + "\n");
        writer.releaseLock();
      } catch (e) {
        const error: JsonRpcError = isJsonRpcError(e)
          ? e
          : {
              code: -1,
              message: `Unexpected internal error: ${e}`,
            };

        const response: JsonRpcResponse = {
          jsonrpc: "2.0",
          id,
          error,
        };

        const writer = this.stdin.getWriter();
        await writer.ready;
        await writer.write(JSON.stringify(response) + "\n");
        writer.releaseLock();
      }
    };
    this.addEventListener("request", callback);
    return () => this.removeEventListener("request", callback);
  }
}
