import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(@Inject(SchedulesService) private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'List schedules' })
  findAll(@Query() query: QuerySchedulesDto): Promise<SchedulesListResponseDto> {
    return this.schedulesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ScheduleResponseDto> {
    return this.schedulesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create schedule' })
  @ApiBody({ type: CreateScheduleDto })
  create(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() currentUser?: RequestUser,
  ): Promise<ScheduleMutationResponseDto> {
    return this.schedulesService.create(dto, currentUser);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
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
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
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
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Cancel schedule' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser?: RequestUser,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.remove(id, currentUser);
  }
}
