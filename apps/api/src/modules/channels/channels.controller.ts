import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelsService } from './channels.service';
import type { ChannelResponseDto, ChannelsListResponseDto } from './dto/channel-response.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { QueryChannelsDto } from './dto/query-channels.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('Channels')
@ApiBearerAuth()
@ApiExtraModels(QueryChannelsDto)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('channels')
export class ChannelsController {
  constructor(@Inject(ChannelsService) private readonly channelsService: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'List channels' })
  findAll(@Query() query: QueryChannelsDto): Promise<ChannelsListResponseDto> {
    return this.channelsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ChannelResponseDto> {
    return this.channelsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create channel' })
  @ApiBody({ type: CreateChannelDto })
  create(@Body() dto: CreateChannelDto): Promise<ChannelResponseDto> {
    return this.channelsService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update channel' })
  @ApiBody({ type: UpdateChannelDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChannelDto,
  ): Promise<ChannelResponseDto> {
    return this.channelsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Soft delete channel' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<ChannelResponseDto> {
    return this.channelsService.remove(id);
  }
}
