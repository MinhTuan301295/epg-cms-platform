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
import { ChannelsService } from './channels.service';
import type { ChannelResponseDto, ChannelsListResponseDto } from './dto/channel-response.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { QueryChannelsDto } from './dto/query-channels.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('Channels')
@ApiBearerAuth()
@ApiExtraModels(QueryChannelsDto)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('channels')
export class ChannelsController {
  private readonly uploadDirectory = join(process.cwd(), 'uploads', 'channel-logos');
  private readonly maxLogoSizeBytes = 2 * 1024 * 1024;
  private readonly allowedImageMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ]);

  constructor(@Inject(ChannelsService) private readonly channelsService: ChannelsService) {}

  @Get()
  @Permissions(PERMISSIONS.CHANNELS_VIEW)
  @ApiOperation({ summary: 'List channels' })
  findAll(@Query() query: QueryChannelsDto): Promise<ChannelsListResponseDto> {
    return this.channelsService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CHANNELS_VIEW)
  @ApiOperation({ summary: 'Get channel by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ChannelResponseDto> {
    return this.channelsService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.CHANNELS_CREATE)
  @ApiOperation({ summary: 'Create channel' })
  @ApiBody({ type: CreateChannelDto })
  create(@Body() dto: CreateChannelDto): Promise<ChannelResponseDto> {
    return this.channelsService.create(dto);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.CHANNELS_UPDATE)
  @ApiOperation({ summary: 'Update channel' })
  @ApiBody({ type: UpdateChannelDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChannelDto,
  ): Promise<ChannelResponseDto> {
    return this.channelsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CHANNELS_DELETE)
  @ApiOperation({ summary: 'Soft delete channel' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<ChannelResponseDto> {
    return this.channelsService.remove(id);
  }

  @Post('upload-logo')
  @Permissions(PERMISSIONS.CHANNELS_UPDATE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: 'Upload channel logo image' })
  async uploadLogo(
    @UploadedFile() file: { buffer?: Buffer; mimetype?: string; originalname?: string; size?: number } | undefined,
  ): Promise<{ logoUrl: string }> {
    if (!file?.buffer) {
      throw new BadRequestException('Logo file is required');
    }

    if (!file.mimetype || !this.allowedImageMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, GIF, and SVG files are allowed');
    }

    if (file.size && file.size > this.maxLogoSizeBytes) {
      throw new BadRequestException('Logo file must be 2MB or smaller');
    }

    const safeExtension = this.getSafeExtension(file.originalname, file.mimetype);
    const fileName = `${randomUUID()}${safeExtension}`;

    await mkdir(this.uploadDirectory, { recursive: true });
    await writeFile(join(this.uploadDirectory, fileName), file.buffer);

    return {
      logoUrl: `/uploads/channel-logos/${fileName}`,
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
