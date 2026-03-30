// services/websocket.service.ts
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(orderId?: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Connect with correct path
    this.socket = io('http://localhost:8084', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected successfully');
      
      // Join order room if orderId provided
      if (orderId) {
        this.joinOrder(orderId);
      }
      
      // Trigger all 'connect' listeners
      this.triggerEvent('connect', null);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.triggerEvent('disconnect', null);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.triggerEvent('error', error);
    });

    // Set up event handlers
    this.socket.on('location_update', (data) => {
      console.log('Location update received:', data);
      this.triggerEvent('location_update', data);
    });

    this.socket.on('status_update', (data) => {
      console.log('Status update received:', data);
      this.triggerEvent('status_update', data);
    });

    this.socket.on('eta_update', (data) => {
      console.log('ETA update received:', data);
      this.triggerEvent('eta_update', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  joinOrder(orderId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_order', { order_id: orderId });
      console.log(`Joined order room: ${orderId}`);
    }
  }

  leaveOrder(orderId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_order', { order_id: orderId });
    }
  }

  updateDriverLocation(orderId: string, latitude: number, longitude: number) {
    if (this.socket?.connected) {
      this.socket.emit('update_driver_location', {
        order_id: orderId,
        latitude,
        longitude,
        timestamp: new Date().toISOString()
      });
    }
  }

  updateStatus(orderId: string, status: string, notes?: string, location?: any) {
    if (this.socket?.connected) {
      this.socket.emit('update_status', {
        order_id: orderId,
        status,
        notes,
        location
      });
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private triggerEvent(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;