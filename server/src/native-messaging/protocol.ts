/**
 * Native Messaging Protocol
 * Length-prefixed message serialization for Thunderbird communication
 * @module native-messaging/protocol
 */

import {
  createRequest,
  type NativeRequest,
  type NativeMessage,
  type MessageAction,
} from "../types/native-messaging.js";
import logger from "../utils/logger.js";

/**
 * Read a length-prefixed message from stdin
 * Format: 4-byte length (native byte order) + JSON message
 */
export async function readMessage(
  stream: NodeJS.ReadableStream,
): Promise<NativeMessage | null> {
  return new Promise((resolve, reject) => {
    // Read 4-byte length header
    const lengthBuffer = Buffer.alloc(4);
    let bytesRead = 0;

    const onData = (chunk: Buffer): void => {
      const remaining = 4 - bytesRead;
      const toCopy = Math.min(remaining, chunk.length);
      chunk.copy(lengthBuffer, bytesRead, 0, toCopy);
      bytesRead += toCopy;

      if (bytesRead === 4) {
        stream.removeListener("data", onData);
        stream.removeListener("end", onEnd);
        stream.removeListener("error", onError);

        // Read message length (little-endian uint32)
        const messageLength = lengthBuffer.readUInt32LE(0);

        if (messageLength === 0) {
          resolve(null);
          return;
        }

        // Validate message length (max 10MB)
        if (messageLength > 10 * 1024 * 1024) {
          reject(new Error(`Message too large: ${messageLength} bytes`));
          return;
        }

        // Read message body
        const messageBuffer = Buffer.alloc(messageLength);
        let messageBytes = 0;

        const onMessageData = (chunk: Buffer): void => {
          const remaining = messageLength - messageBytes;
          const toCopy = Math.min(remaining, chunk.length);
          chunk.copy(messageBuffer, messageBytes, 0, toCopy);
          messageBytes += toCopy;

          if (messageBytes === messageLength) {
            stream.removeListener("data", onMessageData);
            stream.removeListener("end", onEnd);
            stream.removeListener("error", onError);

            try {
              const messageStr = messageBuffer.toString("utf8");
              const message = JSON.parse(messageStr) as NativeMessage;
              resolve(message);
            } catch (error) {
              reject(new Error(`Failed to parse message: ${error}`));
            }
          }
        };

        stream.on("data", onMessageData);
        stream.on("end", onEnd);
        stream.on("error", onError);

        // Process any remaining data from the chunk
        if (chunk.length > toCopy) {
          onMessageData(chunk.slice(toCopy));
        }
      }
    };

    const onEnd = (): void => {
      stream.removeListener("data", onData);
      stream.removeListener("error", onError);
      resolve(null);
    };

    const onError = (error: Error): void => {
      stream.removeListener("data", onData);
      stream.removeListener("end", onEnd);
      reject(error);
    };

    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("error", onError);
  });
}

/**
 * Write a length-prefixed message to stdout
 * Format: 4-byte length (native byte order) + JSON message
 */
export function writeMessage(
  stream: NodeJS.WritableStream,
  message: NativeMessage,
): void {
  try {
    const messageStr = JSON.stringify(message);
    const messageBuffer = Buffer.from(messageStr, "utf8");
    const lengthBuffer = Buffer.alloc(4);

    // Write length as little-endian uint32
    lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

    // Write length header + message
    stream.write(lengthBuffer);
    stream.write(messageBuffer);

    logger.debug(`Sent message: ${message.type} (${message.id})`);
  } catch (error) {
    logger.error("Failed to write message:", error);
    throw error;
  }
}

/**
 * Create a native messaging request with unique ID
 */
export function createNativeRequest(
  action: MessageAction,
  params: Record<string, unknown> = {},
): NativeRequest {
  return createRequest(action, params);
}

/**
 * Create a timeout promise
 */
export function createTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout: ${operation} (${timeoutMs}ms)`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Validate native message structure
 */
export function isValidNativeMessage(value: unknown): value is NativeMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const msg = value as Record<string, unknown>;

  // Check required base fields
  if (
    typeof msg.type !== "string" ||
    typeof msg.id !== "string" ||
    typeof msg.timestamp !== "string"
  ) {
    return false;
  }

  // Check type-specific fields
  switch (msg.type) {
    case "request":
      return typeof msg.action === "string" && typeof msg.params === "object";
    case "response":
      return typeof msg.success === "boolean";
    case "notification":
      return typeof msg.event === "string";
    default:
      return false;
  }
}
