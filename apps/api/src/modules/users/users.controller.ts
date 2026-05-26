import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PERMISSIONS } from '../../common/permissions/permissions.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { UserResponseDto, UsersListResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get('permissions')
  @Permissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'Get permission catalog and role default permissions' })
  getPermissionsMetadata() {
    return this.usersService.getPermissionsMetadata();
  }

  @Get()
  @Permissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'List users (admin only)' })
  findAll(@Query() query: QueryUsersDto): Promise<UsersListResponseDto> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'Get user by id (admin only)' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.USERS_CREATE)
  @ApiOperation({ summary: 'Create user (admin only)' })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.USERS_UPDATE)
  @ApiOperation({ summary: 'Update user (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.USERS_DELETE)
  @ApiOperation({ summary: 'Deactivate user (admin only, soft delete)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.deactivate(id);
  }
}
