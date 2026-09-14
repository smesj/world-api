import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreateToshiRanboPlayerDto } from './dto/players.dto';
import { ApiKeyGuard } from '../../shared/api-key.guard';

@Controller('toshi-ranbo/players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  create(@Body() dto: CreateToshiRanboPlayerDto) {
    return this.playersService.create(dto);
  }

  @Get()
  findAll() {
    return this.playersService.findAll();
  }
}
