export class ChannelResponseDto {
  id!: string;
  name!: string;
  epgId!: string | null;
  logoUrl!: string | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ChannelsListResponseDto {
  data!: ChannelResponseDto[];
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
