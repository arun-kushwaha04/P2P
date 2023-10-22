import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import { CHUNK_TRANSFERED } from '../utils/constant.mjs';

// let fileChunk = '';
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

const rStream = fs.createReadStream(workerData.filePath, {
 start: startByte,
 end: endByte,
 encoding: 'binary',
});
//writing the data from read stream to a file instead of storing in memory
const writeFilePath = `~/P2P Temp/${Date()}`;
const wStream = fs.createWriteStream(writeFilePath, { flags: 'a' });

rStream.on('data', function (chunk) {
 //  fileChunk += chunk.toString('binary');
 wStream.write(chunk.toString('binary'));
});
rStream.on('end', function () {
 parentPort?.postMessage({
  type: 'final',
  filePath: writeFilePath,
  // val: fileChunk,
 });
});
