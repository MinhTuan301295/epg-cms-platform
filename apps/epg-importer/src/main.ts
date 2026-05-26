import 'dotenv/config';
import { ImporterWorker } from './importer-worker';

const worker = new ImporterWorker();

worker.start();
