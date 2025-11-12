import { Controller, Get, Param, Post } from '@nestjs/common';
import { TimerService, TimerData } from './timer.service';

@Controller('footy/timer')
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  @Get('/:id')
  getTime(@Param('id') id: string): Promise<string> {
    return this.timerService.getTimePollable(parseInt(id, 10));
  }

  @Post('/start/:id')
  startTimer(@Param('id') id: string): Promise<TimerData | null> {
    return this.timerService.startTimer(parseInt(id, 10));
  }

  @Post('/stop/:id')
  pauseTimer(@Param('id') id: string): Promise<TimerData | null> {
    return this.timerService.stopTimer(parseInt(id, 10));
  }

  @Post('/reset/:id')
  resetTimer(@Param('id') id: string): Promise<TimerData | null> {
    return this.timerService.resetTimer(parseInt(id, 10));
  }
}
