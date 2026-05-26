import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ALL_PERMISSIONS } from '../../../common/permissions/permissions.constants';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'editor@epg.local' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'Channel Editor' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EDITOR })
  @IsEnum(UserRole)
  role!: UserRole;

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
}
