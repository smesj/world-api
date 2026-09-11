import { IsString, IsNotEmpty } from 'class-validator';

export class CreateToshiRanboPlayerDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
