import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { GamesService } from './games.service';
import {
  JoinGameDto,
  AddParticipantDto,
  UpdateGameDto,
  FilterGamesDto,
} from './games.dto';

@Controller('footy/games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  async createGame(@Body('userId') userId: string) {
    // TODO: In the future, extract userId from JWT/auth context
    // For now, require it in the request body
    return this.gamesService.createGame(userId);
  }

  @Get()
  async getGames(@Query() filters: FilterGamesDto) {
    return this.gamesService.getGames(filters);
  }

  @Get(':id')
  async getGame(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.getGame(id);
  }

  @Post(':id/join')
  async joinGame(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JoinGameDto,
  ) {
    return this.gamesService.joinGame(id, dto);
  }

  @Post(':id/participants')
  async addParticipant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddParticipantDto,
  ) {
    return this.gamesService.addParticipant(id, dto);
  }

  @Post(':id/start')
  async startGame(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.startGame(id);
  }

  @Patch(':id')
  async updateGame(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGameDto,
  ) {
    return this.gamesService.updateGame(id, dto);
  }

  @Post(':id/complete')
  async completeGame(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.completeGame(id);
  }

  @Post(':id/abandon')
  async abandonGame(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.abandonGame(id);
  }

  @Delete(':id/participants/:participationId')
  async removeParticipant(
    @Param('id', ParseIntPipe) id: number,
    @Param('participationId', ParseIntPipe) participationId: number,
  ) {
    return this.gamesService.removeParticipant(id, participationId);
  }
}
