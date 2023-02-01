import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { TEMP_FOLDER } from '../utils/constant.mjs';

const ws = fs.createWriteStream(
 path.join(
  TEMP_FOLDER,
  workerData.folderName,
  `chunck${workerData.chunckNumber}`,
 ),
 { flags: 'w' },
);

ws.write(workerData.fileBuffer, () => {
 ws.close();
});

ws.on('close', function () {
 parentPort?.postMessage({
  type: 'final',
  val: 'Done writing',
 });
});