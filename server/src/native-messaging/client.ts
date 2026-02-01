/**
 * Native Messaging Client
 * Handles communication with Thunderbird extension via native messaging
 * @module native-messaging/client
 */

import { EventEmitter } from "events";
import {
  readMessage,
  writeMessage,
  createNativeRequest,
  createTimeout,
} from "./protocol.js";
import {
  type NativeMessage,
  type NativeRequest,
  type NativeResponse,
  type MessageAction,
  NotificationEvents,
} from "../types/native-messaging.js";
import logger from "../utils/logger.js";

/**
 * Native messaging client options
 */
export interface NativeClientOptions {
  /** Default timeout for operations (ms) */
  timeout?: number;
  /** Maximum number of pending requests */
  maxPendingRequests?: number;
}

/**
 * Pending request info
 */
interface PendingRequest {
  resolve: (response: NativeResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  action: string;
}

/**
 * Native messaging client
 * Manages bidirectional communication with Thunderbird extension
 */
export class NativeMessagingClient extends EventEmitter {
  private readonly stdin: NodeJS.ReadableStream;
  private readonly stdout: NodeJS.WritableStream;
  private readonly options: Required<NativeClientOptions>;
  private readonly pendingRequests: Map<string, PendingRequest>;
  private connected: boolean;
  private reading: boolean;

  constructor(
    stdin: NodeJS.ReadableStream = process.stdin,
    stdout: NodeJS.WritableStream = process.stdout,
    options: NativeClientOptions = {},
  ) {
    super();

    this.stdin = stdin;
    this.stdout = stdout;
    this.options = {
      timeout: options.timeout || 30000, // 30s default
      maxPendingRequests: options.maxPendingRequests || 100,
    };
    this.pendingRequests = new Map();
    this.connected = false;
    this.reading = false;
  }

  /**
   * Start the client and begin reading messages
   */
  async start(): Promise<void> {
    if (this.reading) {
      logger.warn("Native messaging client already started");
      return;
    }

    logger.info("Starting native messaging client");
    this.reading = true;
    this.connected = true;

    // Start reading messages in background
    this.readLoop().catch((error) => {
      logger.error("Read loop error:", error);
      this.emit("error", error);
      this.disconnect();
    });

    this.emit("connected");
  }

  /**
   * Stop the client
   */
  async stop(): Promise<void> {
    logger.info("Stopping native messaging client");
    this.disconnect();
  }

  /**
   * Send a request and wait for response
   */
  async sendRequest(
    action: MessageAction,
    params: Record<string, unknown> = {},
    timeout?: number,
  ): Promise<NativeResponse> {
    if (!this.connected) {
      throw new Error("Not connected to Thunderbird");
    }

    // Check pending request limit
    if (this.pendingRequests.size >= this.options.maxPendingRequests) {
      throw new Error("Too many pending requests");
    }

    const request = createNativeRequest(action, params);
    const requestTimeout = timeout || this.options.timeout;

    logger.debug(`Sending request: ${action} (${request.id})`);

    // Create promise for response
    const responsePromise = new Promise<NativeResponse>((resolve, reject) => {
      // Set timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout: ${action} (${requestTimeout}ms)`));
      }, requestTimeout);

      // Store pending request
      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        timeout: timeoutHandle,
        action,
      });
    });

    // Send request
    try {
      writeMessage(this.stdout, request);
    } catch (error) {
      this.pendingRequests.delete(request.id);
      throw error;
    }

    return responsePromise;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get number of pending requests
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Disconnect and cleanup
   */
  private disconnect(): void {
    if (!this.connected) {
      return;
    }

    this.connected = false;
    this.reading = false;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Disconnected"));
    }
    this.pendingRequests.clear();

    this.emit("disconnected");
  }

  /**
   * Main read loop
   */
  private async readLoop(): Promise<void> {
    while (this.reading) {
      try {
        const message = await readMessage(this.stdin);

        if (message === null) {
          logger.info("Native messaging connection closed");
          this.disconnect();
          break;
        }

        this.handleMessage(message);
      } catch (error) {
        logger.error("Error reading message:", error);

        if (error instanceof Error && error.message.includes("EPIPE")) {
          // Broken pipe - connection closed
          this.disconnect();
          break;
        }

        // Continue reading on other errors
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: NativeMessage): void {
    logger.debug(`Received message: ${message.type} (${message.id})`);

    switch (message.type) {
      case "response":
        this.handleResponse(message);
        break;
      case "notification":
        this.handleNotification(message);
        break;
      case "request":
        logger.warn("Unexpected request from extension:", message);
        break;
      default:
        logger.warn("Unknown message type:", message);
    }
  }

  /**
   * Handle response message
   */
  private handleResponse(response: NativeResponse): void {
    const pending = this.pendingRequests.get(response.id);

    if (!pending) {
      logger.warn(`Received response for unknown request: ${response.id}`);
      return;
    }

    // Cleanup
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    // Resolve or reject
    if (response.success) {
      logger.debug(`Request completed: ${pending.action}`);
      pending.resolve(response);
    } else {
      logger.warn(`Request failed: ${pending.action}`, response.error);
      pending.reject(new Error(response.error?.message || "Request failed"));
    }
  }

  /**
   * Handle notification message
   */
  private handleNotification(notification: NativeMessage): void {
    if (notification.type !== "notification") {
      return;
    }

    logger.debug(`Notification: ${notification.event}`);
    this.emit("notification", notification);

    // Emit specific events
    switch (notification.event) {
      case NotificationEvents.NEW_MAIL_RECEIVED:
        this.emit("newMail", notification.data);
        break;
      case NotificationEvents.MESSAGE_CREATED:
      case NotificationEvents.MESSAGE_UPDATED:
      case NotificationEvents.MESSAGE_DELETED:
      case NotificationEvents.MESSAGE_MOVED:
        this.emit("messageChange", notification.data);
        break;
      case NotificationEvents.FOLDER_CREATED:
      case NotificationEvents.FOLDER_RENAMED:
      case NotificationEvents.FOLDER_DELETED:
      case NotificationEvents.FOLDER_MOVED:
        this.emit("folderChange", notification.data);
        break;
      case NotificationEvents.CONTACT_CREATED:
      case NotificationEvents.CONTACT_UPDATED:
      case NotificationEvents.CONTACT_DELETED:
        this.emit("contactChange", notification.data);
        break;
    }
  }
}

// Singleton instance
let clientInstance: NativeMessagingClient | null = null;

/**
 * Get or create native messaging client instance
 */
export function getNativeClient(): NativeMessagingClient {
  if (!clientInstance) {
    clientInstance = new NativeMessagingClient();
  }
  return clientInstance;
}

/**
 * Initialize and start native messaging client
 */
export async function initializeNativeClient(
  options?: NativeClientOptions,
): Promise<NativeMessagingClient> {
  const client = new NativeMessagingClient(
    process.stdin,
    process.stdout,
    options,
  );
  await client.start();
  clientInstance = client;
  return client;
}
