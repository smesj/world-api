import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { TimerGateway } from './timer.gateway';

export interface TimerData {
  from: number;
  paused?: number;
}

@Injectable()
export class TimerService {
  private broadcastIntervals: Map<number, NodeJS.Timeout> = new Map();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => TimerGateway)) private timerGateway: TimerGateway,
  ) {}

  private calcTime(ancorTime: number, startTime: number) {
    const runTime = ancorTime - startTime; //in ms
    const timeDiff = (360000 - runTime) / 1000;
    const minutes = Math.floor(timeDiff / 60);
    const seconds = Math.floor(timeDiff - minutes * 60);

    return minutes + ':' + (seconds < 10 ? '0' + seconds : seconds);
  }

  private async create(id: number): Promise<TimerData | null> {
    const startData: TimerData = {
      from: Date.now(),
      paused: Date.now(),
    };
    await this.cacheManager.set('timer_' + id, startData, 360000);
    const result = await this.cacheManager.get<TimerData>('timer_' + id);
    return result || null;
  }

  private async start(id: number, timerData: TimerData): Promise<TimerData | null> {
    if (!timerData.paused) {
      return null;
    }
    const adjustedStart = timerData.from - timerData.paused;

    const startData: TimerData = {
      from: Date.now() + adjustedStart,
      paused: undefined,
    };
    await this.cacheManager.set('timer_' + id, startData, 360000);

    const result = await this.cacheManager.get<TimerData>('timer_' + id);
    return result || null;
  }

  private async stop(id: number): Promise<TimerData | null> {
    const timer = await this.cacheManager.get<TimerData>('timer_' + id);
    if (!timer || timer.paused) {
      return null;
    }
    const pauseData: TimerData = {
      from: timer.from,
      paused: Date.now(),
    };
    await this.cacheManager.set('timer_' + id, pauseData, 360000);

    const result = await this.cacheManager.get<TimerData>('timer_' + id);
    return result || null;
  }

  // pollable endpoint for getting the time
  async getTimePollable(id: number): Promise<string> {
    const timer = await this.cacheManager.get<TimerData>('timer_' + id);
    if (!timer) {
      const newTimer = await this.create(id);
      if (!newTimer || newTimer.paused === undefined) {
        return '0:00';
      }
      return this.calcTime(newTimer.paused, newTimer.from);
    }
    if (timer.paused) {
      return this.calcTime(timer.paused, timer.from);
    } else {
      return this.calcTime(Date.now(), timer.from);
    }
  }

  private startBroadcastInterval(id: number, timerData: TimerData) {
    // Clear any existing interval for this timer
    this.stopBroadcastInterval(id);

    // Start broadcasting updates every second while timer is running
    const interval = setInterval(async () => {
      const timer = await this.cacheManager.get<TimerData>('timer_' + id);

      // Stop broadcasting if timer is paused or doesn't exist
      if (!timer || timer.paused) {
        this.stopBroadcastInterval(id);
        return;
      }

      const time = this.calcTime(Date.now(), timer.from);
      this.timerGateway.broadcastTimerUpdate(id, time, 'running');

      // Stop at 0:00
      if (time === '0:00') {
        this.stopBroadcastInterval(id);
      }
    }, 1000);

    this.broadcastIntervals.set(id, interval);
  }

  private stopBroadcastInterval(id: number) {
    const interval = this.broadcastIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.broadcastIntervals.delete(id);
    }
  }

  async startTimer(id: number): Promise<TimerData | null> {
    const existingTimer = await this.cacheManager.get<TimerData>('timer_' + id);

    let result: TimerData | null;
    if (!existingTimer) {
      const timer = await this.create(id);
      if (!timer) {
        return null;
      }
      result = await this.start(id, timer);
    } else {
      if (!existingTimer.paused) {
        return null;
      }
      result = await this.start(id, existingTimer);
    }

    // Broadcast the timer start event and start periodic updates
    if (result) {
      const time = this.calcTime(Date.now(), result.from);
      this.timerGateway.broadcastTimerUpdate(id, time, 'running');

      // Start periodic broadcasts
      this.startBroadcastInterval(id, result);
    }

    return result;
  }

  async stopTimer(id: number): Promise<TimerData | null> {
    const result = await this.stop(id);

    // Stop periodic broadcasts
    this.stopBroadcastInterval(id);

    // Broadcast the timer stop event
    if (result && result.paused) {
      const time = this.calcTime(result.paused, result.from);
      this.timerGateway.broadcastTimerUpdate(id, time, 'paused');
    }

    return result;
  }

  async resetTimer(id: number): Promise<TimerData | null> {
    const result = await this.create(id);

    // Stop periodic broadcasts
    this.stopBroadcastInterval(id);

    // Broadcast the timer reset event
    if (result && result.paused !== undefined) {
      const time = this.calcTime(result.paused, result.from);
      this.timerGateway.broadcastTimerUpdate(id, time, 'paused');
    }

    return result;
  }

  // Get current timer state (for WebSocket reconnection)
  async getTimerState(
    id: number,
  ): Promise<{ time: string; state: 'running' | 'paused' } | null> {
    const timer = await this.cacheManager.get<TimerData>(`timer_${id}`);

    if (!timer) {
      return null;
    }

    const time = timer.paused
      ? this.calcTime(timer.paused, timer.from)
      : this.calcTime(Date.now(), timer.from);

    const state = timer.paused ? 'paused' : ('running' as const);

    return { time, state };
  }
}
