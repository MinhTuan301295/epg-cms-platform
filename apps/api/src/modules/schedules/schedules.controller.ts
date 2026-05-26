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
import { ApiBearerAuth, ApiBody, ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PERMISSIONS } from '../../common/permissions/permissions.constants';
import type { RequestUser } from '../../common/types/request-user.type';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { QuerySchedulesDto } from './dto/query-schedules.dto';
import type {
  ScheduleMutationResponseDto,
  ScheduleResponseDto,
  SchedulesListResponseDto,
} from './dto/schedule-response.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { PublishScheduleDto } from './publish/publish-schedule.dto';
import type { PublishScheduleResponseDto } from './publish/schedule-publish.service';
import { SchedulesService } from './schedules.service';

@ApiTags('Schedules')
@ApiBearerAuth()
@ApiExtraModels(QuerySchedulesDto)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(@Inject(SchedulesService) private readonly schedulesService: SchedulesService) {}

  @Get()
  @Permissions(PERMISSIONS.SCHEDULES_VIEW)
  @ApiOperation({ summary: 'List schedules' })
  findAll(@Query() query: QuerySchedulesDto): Promise<SchedulesListResponseDto> {
    return this.schedulesService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.SCHEDULES_VIEW)
  @ApiOperation({ summary: 'Get schedule by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ScheduleResponseDto> {
    return this.schedulesService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.SCHEDULES_CREATE)
  @ApiOperation({ summary: 'Create schedule' })
  @ApiBody({ type: CreateScheduleDto })
  create(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() currentUser?: RequestUser,
  ): Promise<ScheduleMutationResponseDto> {
    return this.schedulesService.create(dto, currentUser);
  }

  @Post(':id/publish')
  @Permissions(PERMISSIONS.SCHEDULES_PUBLISH)
  @ApiOperation({ summary: 'Publish schedule' })
  @ApiBody({ type: PublishScheduleDto })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishScheduleDto,
    @CurrentUser() currentUser?: RequestUser,
  ): Promise<PublishScheduleResponseDto> {
    void dto;
    return this.schedulesService.publish(id, currentUser);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.SCHEDULES_UPDATE)
  @ApiOperation({ summary: 'Update schedule' })
  @ApiBody({ type: UpdateScheduleDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() currentUser?: RequestUser,
  ): Promise<ScheduleMutationResponseDto> {
    return this.schedulesService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.SCHEDULES_DELETE)
  @ApiOperation({ summary: 'Cancel schedule' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser?: RequestUser,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.remove(id, currentUser);
  }
}
