import { Controller, Post, Get, Body } from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreateToshiRanboPlayerDto } from './dto/players.dto';

@Controller('toshi-ranbo/players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  create(@Body() dto: CreateToshiRanboPlayerDto) {
    return this.playersService.create(dto);
  }

  @Get()
  findAll() {
    return this.playersService.findAll();
  }
}
