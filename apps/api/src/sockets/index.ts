import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';
import type { RealtimeHub } from '../core/realtime.js';
import { ModuleContext } from '../core/module.js';

export class SocketRealtimeHub implements RealtimeHub {
  private io: SocketIOServer;

  constructor(server: Server, corsOrigin: string) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: corsOrigin,
        credentials: true,
      },
    });

    this.io.on('connection', (socket) => {
      // Basic auth stub
      const devUserId = socket.handshake.auth.userId;
      if (process.env.ALLOW_DEV_AUTH === 'true' && devUserId) {
        socket.join(`user:${devUserId}`);
      }
      
      socket.on('join:event', (data) => {
        if (data && data.eventId) {
          socket.join(`event:${data.eventId}`);
        }
      });
    });
  }

  emitToEvent(eventId: string, eventName: string, payload: any) {
    this.io.to(`event:${eventId}`).emit(eventName, payload);
  }

  emitToUser(userId: string, eventName: string, payload: any) {
    this.io.to(`user:${userId}`).emit(eventName, payload);
  }
}

export function registerSocketServer(server: Server, ctx: ModuleContext) {
  const corsOrigin = ctx.config.APP_ORIGIN;
  const hub = new SocketRealtimeHub(server, corsOrigin);
  ctx.setRealtimeHub(hub);
}
