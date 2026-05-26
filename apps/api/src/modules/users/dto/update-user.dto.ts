import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ALL_PERMISSIONS } from '../../../common/permissions/permissions.constants';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Channel Editor' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    type: [String],
    example: ['channels.view', 'channels.create'],
  })
  @IsArray()
  @IsIn(ALL_PERMISSIONS, { each: true })
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}
