import { IsBoolean, IsOptional } from 'class-validator';

export class PublishScheduleDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
