import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GamesService } from './games.service';
import { CreateToshiRanboGameDto } from './dto/games.dto';

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

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

  // Upload/replace the board photo for an existing game.
  // multipart/form-data with a single "photo" field.
  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG, WEBP, or GIF images are allowed',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadGamePhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.gamesService.setGamePhoto(id, file);
  }
}
