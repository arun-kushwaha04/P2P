import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { DOWNLOAD_FOLDER } from '../utils/constant.mjs';

const ws = fs.createWriteStream(
 path.join(workerData.parentFolder, workerData.fileName),
 { flags: 'a', encoding: 'binary' },
);

const rs = fs.createReadStream(
 path.join(workerData.folderPath, workerData.chunkName),
 { encoding: 'binary' },
);

rs.on('data', (data) => {
 ws.write(data);
});

rs.on('end', () => {
 ws.close();
});

ws.on('close', () => {
 parentPort?.postMessage({
  type: 'final',
  val: 'Done writing',
 });
});
