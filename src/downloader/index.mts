import fs from 'fs';
import { v4 as uuidv4, v4 } from 'uuid';
import path from 'path';

import {
 ACTIVE_DOWNLOADS,
 FILE_MANAGER,
 UDP_SERVER,
 decsFileTransfers,
 incrFileTransfers,
 validateIp,
} from '../server.mjs';
import {
 CHUNK_TRANSFERED,
 DOWNLOAD_FOLDER,
 LOGS,
 TEMP_FOLDER,
 delay,
} from '../utils/constant.mjs';
import chalk, { Chalk } from 'chalk';
import { Worker, workerData } from 'worker_threads';
import pausedDownloadModel from '../files/pausedDownloadModel.mjs';

export interface SubFileInterface {
 fileHash: string;
 fileExtentsion: string;
 fileName: string;
 fileSize: string;
 fileMimeType: string;
 isFolder: boolean;
 parentFolder: any[];
}
export class Downloader {
 private FOLDER_NAME: string;
 private FILE_HASH: string;
 private PEERS: string[];
 private FILE_NAMES: string[];
 private FILE_SIZE: number;
 private IS_FOLDER: boolean;
 private TOTAL_CHUNKS: number = 0;
 private CHUNK_LEFT: number = 0;
 private CHUNK_ARRAY: boolean[];
 private CHUNK_REQUESTED_ARRAY: number[];
 private SUB_FILES: SubFileInterface[];
 private IS_SUB_FILE: boolean;
 private PARENT_FOLDER: string;
 private DOWNLOADER_ID: string;
 private simuntanousDownlaod: number = 1;
 private TIMER: NodeJS.Timer | null = null;
 private isFirst: boolean = true;

 constructor(
  fileHash: string,
  downloaderId: string,
  peerList?: string[],
  fileInfo?: SubFileInterface,
  isSubFile?: boolean,
  folderName: string = uuidv4(),
  chunkArray?: number[],
 ) {
  this.FILE_HASH = fileHash;
  //TODO:implement folder download
  if (isSubFile) {
   this.PEERS = peerList!;
   this.FILE_NAMES = [fileInfo?.fileName!];
   this.FILE_SIZE = parseInt(fileInfo?.fileSize!);
   this.IS_FOLDER = fileInfo?.isFolder!;
   this.SUB_FILES = [];
   this.IS_SUB_FILE = true;
   //  this.PARENT_FOLDER = fileInfo?.parentFolder!;
   this.PARENT_FOLDER = path.join(DOWNLOAD_FOLDER, ...fileInfo?.parentFolder!);
   fs.mkdirSync(this.PARENT_FOLDER, { recursive: true });
  } else {
   const temp = FILE_MANAGER.getFileInfo(fileHash);
   this.PEERS = temp.peerList;
   this.FILE_NAMES = temp.names;
   this.FILE_SIZE = parseInt(temp.size);
   this.IS_FOLDER = temp.isFolder;
   this.SUB_FILES = temp.subFiles ? temp.subFiles : [];
   this.IS_SUB_FILE = false;
   this.PARENT_FOLDER = DOWNLOAD_FOLDER;
  }
  this.FOLDER_NAME = folderName;
  this.TOTAL_CHUNKS = Math.ceil(this.FILE_SIZE / CHUNK_TRANSFERED);
  this.DOWNLOADER_ID = downloaderId;
  this.CHUNK_ARRAY = chunkArray ? chunkArray : new Array(this.TOTAL_CHUNKS);
  this.CHUNK_REQUESTED_ARRAY = new Array(this.TOTAL_CHUNKS);
  for (let i = 0; i < this.TOTAL_CHUNKS; i++) {
   if (!chunkArray) {
    this.CHUNK_ARRAY[i] = false;
   }
   if (!this.CHUNK_ARRAY[i]) this.CHUNK_LEFT++;
   this.CHUNK_REQUESTED_ARRAY[i] = 0;
  }

  if (this.IS_FOLDER) {
   this.folderDownload();
  } else {
   this.startDownload();
  }
 }

 private folderDownload = async () => {
  const folderPath = path.join(TEMP_FOLDER, this.FOLDER_NAME);
  fs.mkdirSync(folderPath, { recursive: true });
  let currentDownload: string = uuidv4();
  let i = 0;
  while (true) {
   if (i >= this.SUB_FILES.length) break;
   if (ACTIVE_DOWNLOADS[currentDownload]) continue;
   else {
    const file = this.SUB_FILES[i];

    const downloader = new Downloader(
     this.SUB_FILES[i].fileHash,
     currentDownload,
     this.PEERS,
     file,
     true,
    );
    ACTIVE_DOWNLOADS[currentDownload] = downloader;
    currentDownload = uuidv4();
    i++;
    await delay(5000);
   }
  }
  console.log('Folder download completed');
 };

 private async startDownload() {
  //select a peer from list of availble peer
  //request for 5mb chunk of data
  //write this data to chunk folder created
  //writing inital data to files
  await this.createEmptyFileOfSize(
   path.join(this.PARENT_FOLDER, this.FILE_NAMES[0]),
   this.FILE_SIZE,
  );

  this.refeshPeerList(this.DOWNLOADER_ID);
  this.TIMER = setInterval(() => {
   this.refeshPeerList(this.DOWNLOADER_ID);
  }, 15000);

  this.sendChunkRequest();

  // setTimeout(() => {
  //  heapdump.writeSnapshot(
  //   LOGS + Date.now() + '.heapsnapshot',
  //   function (err, filename) {
  //    console.log('dump written to', filename);
  //   },
  //  );
  // }, 60000);
 }

 public handleReceviedChunk(chunkNumber: number, peerIPAddr: string) {
  decsFileTransfers();
  if (this.CHUNK_ARRAY[chunkNumber] == true) return;
  this.CHUNK_ARRAY[chunkNumber] = true;
  this.CHUNK_LEFT--;

  if (this.CHUNK_LEFT === 0) {
   console.log('Recevied all file chunks');
   delete ACTIVE_DOWNLOADS[this.DOWNLOADER_ID];
   this.checkFileHealth(path.join(this.PARENT_FOLDER, this.FILE_NAMES[0]));
   return;
  }
  this.validOnlinePeer();
  this.sendChunkRequest();
  return;
 }

 public async handleChokedState() {
  decsFileTransfers();
  await delay(1000);
  this.sendChunkRequest();
  return;
 }

 private async sendChunkRequest() {
  this.validOnlinePeer();
  if (this.PEERS.length > 0) {
   incrFileTransfers();
   for (let i = 0; i < this.CHUNK_ARRAY.length; i++) {
    if (!this.CHUNK_ARRAY[i]) {
     UDP_SERVER.sendChunkRequest(
      this.FILE_HASH,
      i,
      this.popAndPush(),
      path.join(this.PARENT_FOLDER, this.FILE_NAMES[0]),
      this.DOWNLOADER_ID,
     );
     return;
    }
   }
   decsFileTransfers();
   //TODO: rebuild file
  } else {
   console.log('Download paused, no peer online');
   this.pauseDownloadAndSaveState();
  }
 }

 private checkFileHealth(filePath: string) {
  //file rebuilded successfully now compare the hash

  const worker = new Worker('./dist/workers/fileHash.mjs', {
   workerData: {
    filePath: filePath,
   },
  });
  worker.on('message', (data) => {
   console.log(filePath, data.val, this.FILE_HASH);
   if (data.val === this.FILE_HASH) {
    console.log(chalk.green('Successfully builded the file'));
    return;
   } else {
    console.log(chalk.red('Failed to build the file - hash not matched'));
    // fs.unlinkSync(filePath);
    return;
   }
  });
  worker.on('error', (msg) => {
   console.log(msg);
   console.log(chalk.red('Failed to build the file'));
   //  fs.unlinkSync(filePath);
   return;
  });
  this.destructor();
 }

 private async rebuildFile(folderPath: string, fileName: string) {
  let CURRENT_FOLDER = DOWNLOAD_FOLDER;
  if (this.IS_SUB_FILE) {
   const newFolderPath = path.join(DOWNLOAD_FOLDER, ...this.PARENT_FOLDER);
   fs.mkdirSync(newFolderPath, { recursive: true });
   CURRENT_FOLDER = newFolderPath;
  } else {
   fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
  }
  fs.closeSync(fs.openSync(path.join(CURRENT_FOLDER, fileName), 'w'));
  for (let i = 0; i < this.CHUNK_ARRAY.length; i++) {
   try {
    await this.writeToFile(`chunk${i}`, folderPath, fileName, CURRENT_FOLDER);
   } catch (error) {
    console.log(chalk.red('Failed to build the file'));
    fs.unlinkSync(path.join(CURRENT_FOLDER, fileName));
    fs.unlinkSync(folderPath);
    return;
   }
  }

  //file rebuilded successfully now compare the hash
  const worker = new Worker('./dist/workers/fileHash.mjs', {
   workerData: {
    filePath: path.join(CURRENT_FOLDER, fileName),
   },
  });
  worker.on('message', (data) => {
   console.log(path.join(CURRENT_FOLDER, fileName), data.val, this.FILE_HASH);
   if (data.val === this.FILE_HASH) {
    console.log(chalk.green('Successfully builded the file'));
    fs.rmSync(folderPath, { recursive: true, force: true });
    return;
   } else {
    console.log(chalk.red('Failed to build the file - hash not matched'));
    fs.unlinkSync(path.join(CURRENT_FOLDER, fileName));
    fs.rmSync(folderPath, { recursive: true, force: true });
    return;
   }
  });
  worker.on('error', (msg) => {
   console.log(msg);
   console.log(chalk.red('Failed to build the file'));
   fs.unlinkSync(path.join(CURRENT_FOLDER, fileName));
   fs.rmSync(folderPath, { recursive: true, force: true });
   return;
  });
  this.destructor();
 }

 private writeToFile(
  chunkName: string,
  folderPath: string,
  fileName: string,
  parentFolder: string,
 ) {
  return new Promise<void>((resolve, reject) => {
   const worker = new Worker('./dist/workers/writeFromFileWorker.mjs', {
    workerData: {
     folderPath,
     fileName,
     chunkName,
     parentFolder,
    },
   });
   worker.on('message', (data) => {
    resolve(data.val);
   });
   worker.on('error', (msg) => {
    console.log('building file error', msg);
    reject(msg);
   });
  });
 }

 private popAndPush(): string {
  const value = this.PEERS.shift();
  this.PEERS.push(value!);
  return value!;
 }

 private pop(): string {
  const value = this.PEERS.shift();
  return value!;
 }

 private pushFront(peerIPAddr: string) {
  this.PEERS.unshift(peerIPAddr);
 }

 private refeshPeerList(downloaderId: string) {
  if (this.CHUNK_LEFT === 0) {
   console.log('Recevied all file chunks');
   this.destructor();
   this.rebuildFile(
    path.join(TEMP_FOLDER, this.FOLDER_NAME),
    this.FILE_NAMES[0],
   );
   return;
  }
  // TODO:
  FILE_MANAGER.refreshPeerList(this.FILE_HASH, this.DOWNLOADER_ID);
  return;
 }
 private validOnlinePeer() {
  while (this.PEERS.length > 0 && !validateIp(this.PEERS[0])) {
   this.pop();
  }
  return;
 }
 private async pauseDownloadAndSaveState() {
  const downloadState = new pausedDownloadModel({
   fileHash: this.FILE_HASH,
   folderName: this.FOLDER_NAME,
   chunkArray: this.CHUNK_ARRAY,
  });
  await downloadState.save();
  this.destructor;
  return;
 }
 public updatePeerList(peerIPAddr: string) {
  this.pushFront(peerIPAddr);
  return;
 }
 private destructor() {
  console.log(chalk.bgMagenta('Removing downloader', this.DOWNLOADER_ID));
  delete ACTIVE_DOWNLOADS[this.DOWNLOADER_ID];
  if (this.TIMER != null) clearInterval(this.TIMER);
 }

 private createEmptyFileOfSize(fileName: string, size: number) {
  return new Promise((resolve, reject) => {
   if (size < 0) {
    reject("Error: a negative size doesn't make any sense");
    return;
   }
   setTimeout(() => {
    try {
     let fd = fs.openSync(fileName, 'w');
     if (size > 0) {
      fs.writeSync(fd, Buffer.alloc(1), 0, 1, size - 1);
     }
     fs.closeSync(fd);
     resolve(true);
    } catch (error) {
     reject(error);
    }
   }, 0);
  });
 }
}
