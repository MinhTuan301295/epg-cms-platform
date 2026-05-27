import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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
  private readonly uploadDirectory = join(process.cwd(), 'uploads', 'asset-images');
  private readonly maxImageSizeBytes = 4 * 1024 * 1024;
  private readonly allowedImageMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ]);

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

  @Post('upload-image')
  @Permissions(PERMISSIONS.ASSETS_UPDATE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 4 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: 'Upload asset image (poster/thumbnail)' })
  async uploadImage(
    @UploadedFile() file: { buffer?: Buffer; mimetype?: string; originalname?: string; size?: number } | undefined,
  ): Promise<{ imageUrl: string }> {
    if (!file?.buffer) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype || !this.allowedImageMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, GIF, and SVG files are allowed');
    }

    if (file.size && file.size > this.maxImageSizeBytes) {
      throw new BadRequestException('Image file must be 4MB or smaller');
    }

    const safeExtension = this.getSafeExtension(file.originalname, file.mimetype);
    const fileName = `${randomUUID()}${safeExtension}`;

    await mkdir(this.uploadDirectory, { recursive: true });
    await writeFile(join(this.uploadDirectory, fileName), file.buffer);

    return {
      imageUrl: `/uploads/asset-images/${fileName}`,
    };
  }

  private getSafeExtension(originalName: string | undefined, mimeType: string): string {
    const extension = extname(originalName ?? '').toLowerCase();

    if (extension && extension !== '.') {
      return extension;
    }

    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      case 'image/svg+xml':
        return '.svg';
      default:
        return '.bin';
    }
  }
}
