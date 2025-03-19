import { Server } from 'http';
import { Request, Response } from 'express';

/**
 * Simple SSE (Server-Sent Events) implementation
 */
export class SSEServer {
  private clients: Map<string, Response> = new Map();
  private httpServer: Server;
  
  /**
   * Create a new SSE server
   * @param httpServer - HTTP server to attach to
   */
  constructor(httpServer: Server) {
    this.httpServer = httpServer;
    
    // Clean up clients on server close
    this.httpServer.on('close', () => {
      this.clients.forEach((client) => {
        try {
          client.end();
        } catch (e) {
          // Ignore errors when cleaning up
        }
      });
      this.clients.clear();
    });
  }
  
  /**
   * Handle a new client connection
   * @param req - Express request
   * @param res - Express response
   */
  handleConnection(req: Request, res: Response): void {
    const clientId = req.query.client_id?.toString() || `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable buffering in Nginx
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connection_established', client_id: clientId })}\n\n`);
    
    // Add client to the map
    this.clients.set(clientId, res);
    
    // Handle client disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
    });
  }
  
  /**
   * Send an event to all connected clients
   * @param event - Event name
   * @param data - Event data
   */
  broadcast(event: string, data: any): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    
    this.clients.forEach((client) => {
      try {
        client.write(message);
      } catch (e) {
        // Remove client if we can't send to it
        this.clients.delete(Array.from(this.clients.entries())
          .find(([, c]) => c === client)?.[0] || '');
      }
    });
  }
  
  /**
   * Send an event to a specific client
   * @param clientId - Client ID to send to
   * @param event - Event name
   * @param data - Event data
   * @returns Whether the send was successful
   */
  send(clientId: string, event: string, data: any): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }
    
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      client.write(message);
      return true;
    } catch (e) {
      this.clients.delete(clientId);
      return false;
    }
  }
  
  /**
   * Get the number of connected clients
   */
  get clientCount(): number {
    return this.clients.size;
  }
  
  /**
   * Close all connections
   */
  close(): void {
    this.clients.forEach((client) => {
      try {
        client.end();
      } catch (e) {
        // Ignore errors when closing
      }
    });
    this.clients.clear();
  }
} 