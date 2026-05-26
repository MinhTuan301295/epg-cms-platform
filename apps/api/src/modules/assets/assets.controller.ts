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
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PERMISSIONS } from '../../common/permissions/permissions.constants';
import { AssetsService } from './assets.service';
import type { AssetResponseDto, AssetsListResponseDto } from './dto/asset-response.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@ApiExtraModels(QueryAssetsDto)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('assets')
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assetsService: AssetsService) {}

  @Get()
  @Permissions(PERMISSIONS.ASSETS_VIEW)
  @ApiOperation({ summary: 'List assets' })
  findAll(@Query() query: QueryAssetsDto): Promise<AssetsListResponseDto> {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ASSETS_VIEW)
  @ApiOperation({ summary: 'Get asset by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AssetResponseDto> {
    return this.assetsService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.ASSETS_CREATE)
  @ApiOperation({ summary: 'Create asset' })
  @ApiBody({ type: CreateAssetDto })
  create(@Body() dto: CreateAssetDto): Promise<AssetResponseDto> {
    return this.assetsService.create(dto);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.ASSETS_UPDATE)
  @ApiOperation({ summary: 'Update asset' })
  @ApiBody({ type: UpdateAssetDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ASSETS_DELETE)
  @ApiOperation({ summary: 'Delete asset' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<AssetResponseDto> {
    return this.assetsService.remove(id);
  }
}
