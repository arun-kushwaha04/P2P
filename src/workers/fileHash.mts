import { parentPort, workerData } from 'worker_threads';
import { createHash } from 'crypto';
import fs from 'fs';

const hash = createHash('sha256');
let rs = fs.createReadStream(workerData.filePath);
rs.on('data', function (chunk) {
 hash.update(chunk);
});
rs.on('end', function () {
 parentPort?.postMessage({
  type: 'final',
  val: hash.digest('hex'),
 });
});
