import { IsString, IsInt, IsEnum, IsOptional, Min } from 'class-validator';
import { GameStatus } from '@prisma/client';

export class JoinGameDto {
  // User joining is extracted from auth context (future)
  // For now, userId will be passed in body
  @IsString()
  userId: string;
}

export class AddParticipantDto {
  @IsString()
  userId: string;

  @IsEnum(['team_a', 'team_b'])
  role: 'team_a' | 'team_b';
}

export class UpdateGameDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  scoreTeamA?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  scoreTeamB?: number;

  @IsOptional()
  @IsInt()
  duration?: number;
}

export class FilterGamesDto {
  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;

  @IsOptional()
  @IsString()
  userId?: string;
}
