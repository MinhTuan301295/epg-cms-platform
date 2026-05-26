import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { ImportApplyDto } from './dto/import-apply.dto';
import { ImportCsvDto } from './dto/import-csv.dto';
import { ImportExternalApiDto } from './dto/import-external-api.dto';
import { ImportXmltvDto } from './dto/import-xmltv.dto';
import { ImporterService } from './importer.service';

@ApiTags('Importer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EDITOR)
@Controller('importer')
export class ImporterController {
  constructor(@Inject(ImporterService) private readonly importerService: ImporterService) {}

  @Post('xmltv/preview')
  @ApiOperation({ summary: 'Preview XMLTV import' })
  @ApiBody({ type: ImportXmltvDto })
  previewXmltv(@Body() dto: ImportXmltvDto) {
    return this.importerService.previewXmltv(dto);
  }

  @Post('csv/preview')
  @ApiOperation({ summary: 'Preview CSV import' })
  @ApiBody({ type: ImportCsvDto })
  previewCsv(@Body() dto: ImportCsvDto) {
    return this.importerService.previewCsv(dto);
  }

  @Post('external/preview')
  @ApiOperation({ summary: 'Preview external EPG API import' })
  @ApiBody({ type: ImportExternalApiDto })
  previewExternal(@Body() dto: ImportExternalApiDto) {
    return this.importerService.previewExternalApi(dto);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply importer preview candidates' })
  @ApiBody({ type: ImportApplyDto })
  apply(@Body() dto: ImportApplyDto, @CurrentUser() currentUser?: RequestUser) {
    return this.importerService.applyImport(dto, currentUser);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get importer job status' })
  getJob(@Param('id') id: string) {
    return this.importerService.getJob(id);
  }
}
