import { IsString, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGameDto {
  @IsString()
  createdById: string;
}

export class UpdateGameDto {
  @IsOptional()
  @IsString()
  status?: string; // in_progress, completed, abandoned
}

export class AddScoreDto {
  @IsString()
  playerId: string;

  @IsString()
  nation: string;

  @IsInt()
  finalScore: number;

  @IsOptional()
  @IsInt()
  position?: number;
}
