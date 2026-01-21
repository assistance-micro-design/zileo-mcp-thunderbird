/**
 * WebSocket Bridge Client for Thunderbird Communication
 * Connects to an existing WebSocket bridge server instead of creating one
 * @module websocket/bridge-client
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import logger from '../utils/logger.js';
import type { WsMessage, WebSocketBridgeOptions } from './bridge.js';

/**
 * Pending request info
 */
interface PendingRequest {
  resolve: (response: WsMessage) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  action: string;
}

/**
 * WebSocket Bridge Client
 * Connects to an existing bridge server and provides the same interface as WebSocketBridge
 */
export class WebSocketBridgeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly options: Required<WebSocketBridgeOptions>;
  private readonly pendingRequests: Map<string, PendingRequest>;
  private requestCounter: number = 0;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 3;

  constructor(options: WebSocketBridgeOptions) {
    super();
    this.options = {
      port: options.port,
      timeout: options.timeout || 30000,
      maxPendingRequests: options.maxPendingRequests || 100,
    };
    this.pendingRequests = new Map();
  }

  /**
   * Connect to an existing WebSocket bridge server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Connect to /mcp path for MCP clients (allows multiple connections)
      const url = `ws://127.0.0.1:${this.options.port}/mcp`;
      logger.info(`Connecting to existing bridge at ${url}`);

      try {
        this.ws = new WebSocket(url);

        const connectionTimeout = setTimeout(() => {
          if (this.ws) {
            this.ws.close();
          }
          reject(new Error(`Connection timeout to bridge at ${url}`));
        }, 5000);

        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          logger.info('Connected to existing WebSocket bridge');
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as WsMessage;
            this.handleMessage(message);
          } catch (error) {
            logger.error('Failed to parse message:', error);
          }
        });

        this.ws.on('close', () => {
          logger.info('Disconnected from WebSocket bridge');
          this.ws = null;
          this.rejectAllPending('Connection closed');
          this.emit('disconnected');
        });

        this.ws.on('error', (error) => {
          clearTimeout(connectionTimeout);
          logger.error('WebSocket client error:', error);
          this.emit('error', error);
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to connect to WebSocket bridge:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WsMessage): void {
    logger.debug(`Received message: ${message.type} (${message.id})`);

    switch (message.type) {
      case 'response':
        this.handleResponse(message);
        break;
      case 'notification':
        // Handle welcome message from bridge
        if (message.event === 'connected') {
          const data = message.data as { thunderbirdConnected?: boolean } | undefined;
          logger.info(`Bridge reports Thunderbird connected: ${data?.thunderbirdConnected ?? 'unknown'}`);
        }
        this.emit('notification', message);
        break;
      case 'ping':
        // Respond to ping with pong
        this.sendPong(message.id);
        break;
      case 'pong':
        logger.debug('Pong received from bridge');
        break;
      default:
        logger.warn('Unknown message type:', message);
    }
  }

  /**
   * Send pong response
   */
  private sendPong(pingId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const pong: WsMessage = {
        id: pingId,
        type: 'pong',
        timestamp: new Date().toISOString(),
      };
      this.ws.send(JSON.stringify(pong));
      logger.debug('Sent pong to bridge');
    }
  }

  /**
   * Handle response message
   */
  private handleResponse(response: WsMessage): void {
    const pending = this.pendingRequests.get(response.id);

    if (!pending) {
      logger.warn(`Received response for unknown request: ${response.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.success) {
      logger.debug(`Request completed: ${pending.action}`);
      pending.resolve(response);
    } else {
      logger.warn(`Request failed: ${pending.action}`, response.error);
      pending.reject(new Error(response.error?.message || 'Request failed'));
    }
  }

  /**
   * Send request to Thunderbird extension via the bridge
   */
  async sendRequest(
    action: string,
    params: Record<string, unknown> = {},
    timeout?: number
  ): Promise<WsMessage> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to WebSocket bridge');
    }

    if (this.pendingRequests.size >= this.options.maxPendingRequests) {
      throw new Error('Too many pending requests');
    }

    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    const requestTimeout = timeout || this.options.timeout;

    const request: WsMessage = {
      id: requestId,
      type: 'request',
      action,
      params,
      timestamp: new Date().toISOString(),
    };

    logger.debug(`Sending request via bridge: ${action} (${requestId})`);

    return new Promise<WsMessage>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${action} (${requestTimeout}ms)`));
      }, requestTimeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        action,
      });

      try {
        this.ws!.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Check if connected to bridge
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  /**
   * Disconnect from the bridge
   */
  async disconnect(): Promise<void> {
    logger.info('Disconnecting from WebSocket bridge');

    this.rejectAllPending('Client disconnecting');

    return new Promise((resolve) => {
      if (this.ws) {
        this.ws.once('close', () => {
          this.ws = null;
          resolve();
        });
        this.ws.close();
      } else {
        resolve();
      }
    });
  }
}

/**
 * Try to connect to an existing bridge
 * Returns a WebSocketBridgeClient if successful, null otherwise
 */
export async function tryConnectToExistingBridge(
  port: number,
  timeout: number = 30000
): Promise<WebSocketBridgeClient | null> {
  const client = new WebSocketBridgeClient({
    port,
    timeout,
    maxPendingRequests: 100,
  });

  try {
    await client.connect();
    logger.info(`Successfully connected to existing bridge on port ${port}`);
    return client;
  } catch (error) {
    logger.debug(`No existing bridge found on port ${port}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}
