import { Controller, Post, Get, Body, Param, ParseIntPipe } from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateToshiRanboGameDto } from './dto/games.dto';

@Controller('toshi-ranbo/games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  createGame(@Body() dto: CreateToshiRanboGameDto) {
    return this.gamesService.createGame(dto);
  }

  @Get()
  getGames() {
    return this.gamesService.getGames();
  }

  @Get(':id')
  getGame(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.getGame(id);
  }
}
