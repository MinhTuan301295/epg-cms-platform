import { PrismaClient } from '@prisma/client';

export class WorkerPrismaService {
  readonly client = new PrismaClient();

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }
}
