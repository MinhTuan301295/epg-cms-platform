import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PERMISSIONS } from '../../common/permissions/permissions.constants';
import { OperationsService } from './operations.service';

@ApiTags('Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('operations')
export class OperationsController {
  constructor(@Inject(OperationsService) private readonly operationsService: OperationsService) {}

  @Get('importer-queue-health')
  @Permissions(PERMISSIONS.OPERATIONS_VIEW)
  @ApiOperation({ summary: 'Get importer and queue health snapshot for dashboard' })
  getImporterQueueHealth() {
    return this.operationsService.getImporterQueueHealth();
  }

  @Get('api-cache-metrics')
  @Permissions(PERMISSIONS.OPERATIONS_VIEW)
  @ApiOperation({ summary: 'Get public API latency and cache metrics for dashboard' })
  getApiCacheMetrics() {
    return this.operationsService.getApiCacheMetrics();
  }
}
