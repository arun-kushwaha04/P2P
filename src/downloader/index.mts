import fs from 'fs';
import { v4 as uuidv4, v4 } from 'uuid';
import path from 'path';

import { FILE_MANAGER, UDP_SERVER, validateIp } from '../server.mjs';
import { CHUNK_TRANSFERED, TEMP_FOLDER } from '../utils/constant.mjs';
import { throws } from 'assert';

export class Downloader {
 private FILE_HASH: string;
 private PEERS: string[];
 private FILE_NAMES: { [key: string]: { name: string; count: number } };
 private FILE_EXTENTSION: { [key: string]: { ext: string; count: number } };
 private FILE_SIZE: number;
 private IS_FOLDER: boolean;
 private CHUNK_RECEVIED: number = 0;
 private CHUNK_LEFT: number;

 private DOWNLOADER_ID: string;

 constructor(fileHash: string, downloaderId: string) {
  this.FILE_HASH = fileHash;
  const temp = FILE_MANAGER.getFileInfo(fileHash);
  this.PEERS = temp.peerList;
  this.FILE_EXTENTSION = temp.extensions;
  this.FILE_NAMES = temp.names;
  this.FILE_SIZE = parseInt(temp.size);
  this.IS_FOLDER = temp.isFolder;
  this.CHUNK_LEFT = Math.ceil(this.FILE_SIZE / CHUNK_TRANSFERED);
  this.DOWNLOADER_ID = downloaderId;
  this.startDownload();
 }

 private startDownload() {
  //select a peer from list of availble peer
  //request for 5mb chunk of data
  //write this data to chunk folder created
  //writing inital data to files
  const folderName = uuidv4();
  const folderPath = path.join(TEMP_FOLDER, folderName);
  fs.mkdirSync(folderPath, { recursive: true });
  const ws = fs.createWriteStream(path.join(folderPath, 'info.txt'));
  ws.write(this.FILE_HASH);
  ws.write('\n');
  ws.write(this.FILE_SIZE.toString());
  ws.write('\n');
  ws.write(JSON.stringify(this.FILE_EXTENTSION));
  ws.write('\n');
  ws.write(JSON.stringify(this.FILE_NAMES.toString()));
  ws.write('\n');
  ws.write(this.PEERS.toString());
  ws.write('\n');
  ws.write(this.IS_FOLDER.toString());

  ws.close();

  let chunkNumber = 1;

  this.PEERS.forEach((peer) => {
   if (chunkNumber <= this.CHUNK_LEFT && validateIp(peer)) {
    UDP_SERVER.sendChunkRequest(
     this.FILE_HASH,
     chunkNumber,
     peer,
     folderName,
     this.DOWNLOADER_ID,
    );
    chunkNumber++;
   }
  });
 }

 private refeshPeerList() {
  // TODO:
 }

 public newChuckRecevied() {}
}
