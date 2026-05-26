import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PERMISSIONS } from '../../common/permissions/permissions.constants';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(@Inject(AuditLogsService) private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions(PERMISSIONS.AUDIT_VIEW)
  @ApiOperation({ summary: 'List schedule audit logs (admin only)' })
  findAll(@Query('limit') limit?: string) {
    return this.auditLogsService.findAll(limit ? Number(limit) : undefined);
  }
}
