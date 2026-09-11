import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ToshiRanboPlayerResultDto {
  // ToshiRanboPlayer ID (look up/create via /toshi-ranbo/players — no Clerk signup needed)
  @IsInt()
  playerId: number;

  @IsString()
  @IsNotEmpty()
  clan: string;

  @IsInt()
  @Min(0)
  totalPoints: number;

  @IsOptional()
  @IsBoolean()
  fightWin1f?: boolean;

  @IsOptional()
  @IsBoolean()
  fightWin2f?: boolean;

  @IsOptional()
  @IsBoolean()
  threeVillages?: boolean;

  @IsOptional()
  @IsBoolean()
  firstToshiRanbo?: boolean;

  @IsOptional()
  @IsBoolean()
  twoShrines?: boolean;

  @IsOptional()
  @IsBoolean()
  threeNobleActions?: boolean;

  @IsOptional()
  @IsBoolean()
  twoBuildings?: boolean;

  @IsOptional()
  @IsBoolean()
  threeTactics?: boolean;

  @IsOptional()
  @IsBoolean()
  clanGoal1?: boolean;

  @IsOptional()
  @IsBoolean()
  clanGoal2?: boolean;
}

export class CreateToshiRanboGameDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  cardsPlayed?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ToshiRanboPlayerResultDto)
  results: ToshiRanboPlayerResultDto[];
}
