import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueryPublicChannelsDto } from './dto/query-public-channels.dto';
import { QueryPublicSchedulesDto } from './dto/query-public-schedules.dto';
import { PublicSchedulesService } from './public-schedules.service';

@ApiTags('Public EPG')
@ApiExtraModels(QueryPublicChannelsDto, QueryPublicSchedulesDto)
@Controller('public')
export class PublicSchedulesController {
  constructor(
    @Inject(PublicSchedulesService)
    private readonly publicSchedulesService: PublicSchedulesService,
  ) {}

  @Get('channels')
  @ApiOperation({ summary: 'List public active channels' })
  getPublicChannels(@Query() query: QueryPublicChannelsDto) {
    return this.publicSchedulesService.getPublicChannels(query);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'List public published schedules' })
  getPublicSchedules(@Query() query: QueryPublicSchedulesDto) {
    return this.publicSchedulesService.getPublicSchedules(query);
  }
}
