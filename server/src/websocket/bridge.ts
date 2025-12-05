/**
 * WebSocket Bridge for Thunderbird Communication
 * Replaces native messaging with WebSocket for bidirectional communication
 * @module websocket/bridge
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

/**
 * Message types for WebSocket communication
 */
export interface WsMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  action?: string;
  event?: string;
  params?: Record<string, unknown>;
  data?: unknown;
  success?: boolean;
  error?: { code: number; message: string; data?: unknown };
  timestamp: string;
}

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
 * WebSocket Bridge Options
 */
export interface WebSocketBridgeOptions {
  port: number;
  timeout?: number;
  maxPendingRequests?: number;
}

/**
 * WebSocket Bridge for Thunderbird Extension
 */
export class WebSocketBridge extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private client: WebSocket | null = null;
  private readonly options: Required<WebSocketBridgeOptions>;
  private readonly pendingRequests: Map<string, PendingRequest>;
  private requestCounter: number = 0;

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
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.options.port });

        this.wss.on('listening', () => {
          logger.info(`WebSocket bridge listening on port ${this.options.port}`);
          resolve();
        });

        this.wss.on('connection', (ws: WebSocket) => {
          this.handleConnection(ws);
        });

        this.wss.on('error', (error) => {
          logger.error('WebSocket server error:', error);
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to start WebSocket server:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    // Only allow one client at a time
    if (this.client) {
      logger.warn('Rejecting new connection - client already connected');
      ws.close(1008, 'Only one client allowed');
      return;
    }

    logger.info('Thunderbird extension connected');
    this.client = ws;
    this.emit('connected');

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WsMessage;
        this.handleMessage(message);
      } catch (error) {
        logger.error('Failed to parse message:', error);
      }
    });

    ws.on('close', () => {
      logger.info('Thunderbird extension disconnected');
      this.client = null;
      this.rejectAllPending('Connection closed');
      this.emit('disconnected');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket client error:', error);
      this.emit('error', error);
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
        this.emit('notification', message);
        break;
      case 'request':
        // Handle requests from extension if needed
        logger.warn('Received request from extension:', message);
        break;
      default:
        logger.warn('Unknown message type:', message);
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
   * Send request to Thunderbird extension
   */
  async sendRequest(
    action: string,
    params: Record<string, unknown> = {},
    timeout?: number
  ): Promise<WsMessage> {
    if (!this.client || this.client.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to Thunderbird extension');
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

    logger.debug(`Sending request: ${action} (${requestId})`);

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
        this.client!.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Check if connected to Thunderbird
   */
  isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
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
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    logger.info('Stopping WebSocket bridge');

    this.rejectAllPending('Server stopping');

    if (this.client) {
      this.client.close();
      this.client = null;
    }

    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          this.wss = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Singleton instance
let bridgeInstance: WebSocketBridge | null = null;

/**
 * Get or create WebSocket bridge instance
 */
export function getWebSocketBridge(): WebSocketBridge {
  if (!bridgeInstance) {
    throw new Error('WebSocket bridge not initialized');
  }
  return bridgeInstance;
}

/**
 * Initialize WebSocket bridge
 */
export async function initializeWebSocketBridge(
  options: WebSocketBridgeOptions
): Promise<WebSocketBridge> {
  if (bridgeInstance) {
    logger.warn('WebSocket bridge already initialized');
    return bridgeInstance;
  }

  bridgeInstance = new WebSocketBridge(options);
  await bridgeInstance.start();
  return bridgeInstance;
}

/**
 * Stop WebSocket bridge
 */
export async function stopWebSocketBridge(): Promise<void> {
  if (bridgeInstance) {
    await bridgeInstance.stop();
    bridgeInstance = null;
  }
}
