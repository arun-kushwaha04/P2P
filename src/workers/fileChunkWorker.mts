import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import { CHUNK_TRANSFERED } from '../utils/constant.mjs';

let fileChunk = '';
const startByte = (workerData.chunckNumber - 1) * CHUNK_TRANSFERED + 1;
const endByte = Math.min(
 workerData.chunckNumber * CHUNK_TRANSFERED,
 parseInt(workerData.fileSize),
);

const stream = fs.createReadStream(workerData.filePath, {
 start: startByte,
 end: endByte,
});

stream.on('data', function (chunk) {
 fileChunk += chunk.toString();
});
stream.on('end', function () {
 parentPort?.postMessage({
  type: 'final',
  val: fileChunk,
 });
});
