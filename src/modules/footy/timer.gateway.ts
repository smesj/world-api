import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { TimerService } from './timer.service';

export interface TimerUpdate {
  id: number;
  time: string;
  state: 'running' | 'paused';
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TimerGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => TimerService))
    private timerService: TimerService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Client subscribes to a specific timer
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() timerId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `timer_${timerId}`;
    client.join(room);
    console.log(`Client ${client.id} subscribed to ${room}`);

    // Send current timer state to the newly subscribed client
    const currentState = await this.timerService.getTimerState(timerId);
    if (currentState) {
      const update: TimerUpdate = {
        id: timerId,
        time: currentState.time,
        state: currentState.state,
      };
      client.emit('timerUpdate', update);
      console.log(`Sent current state to ${client.id}:`, update);
    }

    return { event: 'subscribed', data: { timerId, room } };
  }

  // Client unsubscribes from a timer
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() timerId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `timer_${timerId}`;
    client.leave(room);
    console.log(`Client ${client.id} unsubscribed from ${room}`);
    return { event: 'unsubscribed', data: { timerId } };
  }

  // Broadcast timer update to all clients watching this timer
  broadcastTimerUpdate(
    timerId: number,
    time: string,
    state: 'running' | 'paused',
  ) {
    const room = `timer_${timerId}`;
    const update: TimerUpdate = {
      id: timerId,
      time,
      state,
    };
    this.server.to(room).emit('timerUpdate', update);
    console.log(`Broadcasting to ${room}:`, update);
  }

  // Send current timer state to a specific client
  sendTimerState(
    clientId: string,
    timerId: number,
    time: string,
    state: 'running' | 'paused',
  ) {
    const update: TimerUpdate = {
      id: timerId,
      time,
      state,
    };
    this.server.to(clientId).emit('timerUpdate', update);
  }
}
