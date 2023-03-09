import { parentPort, workerData } from 'worker_threads';
import fs, { unwatchFile } from 'fs';
import { CHUNK_TRANSFERED } from '../utils/constant.mjs';

// const fileSize = fs.statSync(workerData.fileName).size;

const startByte = workerData.chunckNumber * CHUNK_TRANSFERED;
// const endByte = Math.min(startByte + CHUNK_TRANSFERED - 1, fileSize - 1);
let ws: fs.WriteStream;

if (startByte === 0) {
 //if first chunk just overwrite the chunk
 ws = fs.createWriteStream(workerData.fileName, {
  flags: 'w',
  encoding: 'binary',
  start: startByte,
 });
} else {
 //else just append it afterwards
 ws = fs.createWriteStream(workerData.fileName, {
  flags: 'a',
  encoding: 'binary',
  start: startByte,
 });
}

ws.write(workerData.fileBuffer, () => {
 ws.close();
});

ws.on('close', function () {
 parentPort?.postMessage({
  type: 'final',
  val: 'Done writing',
  data: startByte,
 });
});
