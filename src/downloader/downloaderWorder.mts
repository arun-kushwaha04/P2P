import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import { UDP_SERVER } from '../server.mjs';

//worker data
//file hash
//peer

//refresh the list of peer
const requestAChunk = (chunckNumber: number) => {
 // UDP_SERVER.sendChunkRequest(fileHash)
};
