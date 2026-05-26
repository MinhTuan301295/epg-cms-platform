import 'dotenv/config';
import { WorkerModule } from './worker.module';

const workerModule = new WorkerModule();

workerModule.start();

const shutdown = async (signal: string) => {
  console.log(`[worker] received ${signal}, shutting down`);
  await workerModule.close();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('uncaughtException', (error) => {
  console.error('[worker] uncaught exception', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[worker] unhandled rejection', reason);
});
