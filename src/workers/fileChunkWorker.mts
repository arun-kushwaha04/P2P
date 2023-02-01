import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import { CHUNK_TRANSFERED } from '../utils/constant.mjs';

let fileChunk = '';
const startByte = workerData.chunckNumber * CHUNK_TRANSFERED;
const endByte = Math.min(
 startByte + CHUNK_TRANSFERED - 1,
 parseInt(workerData.fileSize) - 1,
);

parentPort?.postMessage({
 type: 'chunk size',
 indexs: {
  chunckNumber: workerData.chunckNumber,
  startByte,
  endByte,
 },
});

const stream = fs.createReadStream(workerData.filePath, {
 start: startByte,
 end: endByte,
 encoding: 'binary',
});

stream.on('data', function (chunk) {
 fileChunk += chunk.toString('binary');
});
stream.on('end', function () {
 parentPort?.postMessage({
  type: 'final',
  val: fileChunk,
 });
});
