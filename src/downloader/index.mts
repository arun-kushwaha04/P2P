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
import chalk from 'chalk';
import { Worker } from 'worker_threads';
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

interface Peer {
 ipAddr: string;
 load: number;
}
export class Downloader {
 private FOLDER_NAME: string;
 private FILE_HASH: string;
 private PEERS: Peer[];
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
 private TIMER: NodeJS.Timer | null = null;
 private CHUNK_REQUESTED_FROM: string | null = null;

 constructor(
  fileHash: string,
  downloaderId: string,
  peerList?: Peer[],
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
   this.PARENT_FOLDER = path.join(DOWNLOAD_FOLDER, ...fileInfo?.parentFolder!);
   fs.mkdirSync(this.PARENT_FOLDER, { recursive: true });
  } else {
   const temp = FILE_MANAGER.getFileInfo(fileHash);
   this.PEERS = this.mapPeerToLoad(temp.peerList);
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

 //starts a folder download
 private folderDownload = async () => {
  const folderPath = path.join(this.PARENT_FOLDER, this.FILE_NAMES[0]);
  fs.mkdirSync(folderPath, { recursive: true });
  let currentDownload: string = uuidv4();
  let i = 0;
  while (true) {
   if (ACTIVE_DOWNLOADS[currentDownload]) {
    await delay(5000);
    continue;
   } else {
    if (i >= this.SUB_FILES.length) break;
    console.log('Staring sub file download');
    const file = this.SUB_FILES[i];
    currentDownload = uuidv4();
    ACTIVE_DOWNLOADS[currentDownload] = new Downloader(
     this.SUB_FILES[i].fileHash,
     currentDownload,
     this.PEERS,
     file,
     true,
    );
    i++;
   }
  }
  console.log('Folder download completed');
  this.destructor();
 };

 // starts the download for a file
 private async startDownload() {
  //select a peer from list of availble peer
  //request for 10mb chunk of data
  //write this data to chunk folder created
  //writing inital data to files
  await this.createEmptyFileOfSize(
   path.join(this.PARENT_FOLDER, this.FILE_NAMES[0]),
   this.FILE_SIZE,
  );

  this.TIMER = setInterval(() => {
   this.refeshPeerList();
  }, 20000);

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

 // handles the recevied chunk from the network
 public handleReceviedChunk(chunkNumber: number) {
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

 // handles the choked state from a peer
 public async handleChokedState() {
  decsFileTransfers();
  await delay(100);
  this.sendChunkRequest();
  return;
 }

 // request for a file chunk in the network
 private async sendChunkRequest() {
  this.validOnlinePeer();
  if (this.PEERS.length > 0) {
   incrFileTransfers();
   for (let i = 0; i < this.CHUNK_ARRAY.length; i++) {
    if (!this.CHUNK_ARRAY[i]) {
     this.CHUNK_REQUESTED_FROM = this.popAndPush()!;
     UDP_SERVER.sendChunkRequest(
      this.FILE_HASH,
      i,
      this.CHUNK_REQUESTED_FROM,
      path.join(this.PARENT_FOLDER, this.FILE_NAMES[0]),
      this.DOWNLOADER_ID,
     );
     return;
    }
   }
   decsFileTransfers();
  } else {
   console.log('Download paused, no peer online');
   this.pauseDownloadAndSaveState();
  }
 }

 // compare hash of downloaded file with actual hash
 private checkFileHealth(filePath: string) {
  //file rebuilded successfully now compare the hash
  const worker = new Worker('./dist/workers/fileHash.mjs', {
   workerData: {
    filePath: filePath,
   },
  });
  worker.on('message', (data) => {
   if (data.val === this.FILE_HASH) {
    console.log(chalk.green('Successfully downloaded the file'));
    this.destructor();
    return;
   } else {
    //TODO: redownload the file
    console.log(chalk.red('Failed to build the file - hash not matched'));
    fs.unlinkSync(filePath);
    this.destructor();
    return;
   }
  });
  worker.on('error', (msg) => {
   //TODO: redownload the file
   console.log(msg);
   console.log(chalk.red('Failed to build the file'));
   fs.unlinkSync(filePath);
   this.destructor();
   return;
  });
 }

 // creates a worker to write chunk to the file
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

 //pop the front peer from peers queue and push it back to peers queue
 private popAndPush(): string | null {
  if (this.PEERS.length > 0) {
   const value = this.PEERS.shift();
   this.PEERS.push(value!);
   this.sortPeerArray();
   return value!.ipAddr;
  } else {
   return null;
  }
 }

 //pops the front peer from the peers queue
 private pop(): string | null {
  if (this.PEERS.length > 0) {
   const value = this.PEERS.shift();
   return value!.ipAddr;
  } else return null;
 }

 //adds new peer to peers queue
 private addNewPeer(peerIPAddr: string, load: number) {
  let peerExists: boolean = false;
  let oldPosition: number = 0;
  this.PEERS.forEach((peer, index) => {
   if (peer.ipAddr === peerIPAddr) {
    peerExists = true;
    oldPosition = index;
   }
  });
  if (peerExists) {
   this.PEERS.splice(oldPosition, 1);
  }
  this.PEERS.push({ ipAddr: peerIPAddr, load });
  this.sortPeerArray();
 }

 //refreshed peer list for current download
 private refeshPeerList() {
  if (this.CHUNK_LEFT === 0) {
   console.log('Recevied all file chunks');
   this.checkFileHealth(path.join(this.PARENT_FOLDER, this.FILE_NAMES[0]));
   return;
  }
  // TODO:
  FILE_MANAGER.refreshPeerList(this.FILE_HASH, this.DOWNLOADER_ID);

  //check if current chunk requested peer is down
  if (
   this.CHUNK_REQUESTED_FROM &&
   !UDP_SERVER.ACTIVE_USERS.has(this.CHUNK_REQUESTED_FROM)
  ) {
   this.handleChokedState();
  }
  return;
 }
 private validOnlinePeer() {
  while (this.PEERS.length > 0 && !validateIp(this.PEERS[0].ipAddr)) {
   this.pop();
  }
  return;
 }

 //maps peers string array to peer queue with ip address and load param
 private mapPeerToLoad(peers: string[]) {
  const loadList: Peer[] = [];
  peers.forEach((peer) => {
   if (UDP_SERVER.ACTIVE_USERS.has(peer))
    loadList.push({
     ipAddr: peer,
     load: UDP_SERVER.ACTIVE_USERS.get(peer)?.load!,
    });
  });
  loadList.sort((a: Peer, b: Peer) => {
   if (a.load > b.load) return 1;
   else if (a.load < b.load) return -1;
   return 0;
  });
  return loadList;
 }

 //a function to sort peer queue based on load param
 private sortPeerArray() {
  this.PEERS.sort((a: Peer, b: Peer) => {
   if (a.load > b.load) return 1;
   else if (a.load < b.load) return -1;
   return 0;
  });
 }

 //pause download and save state to database
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

 //function to update the peer list for downloader
 public updatePeerList(peerIPAddr: string, load: number) {
  this.addNewPeer(peerIPAddr, load);
  return;
 }

 //free memory resources when download completes/paused
 private destructor() {
  console.log(chalk.bgMagenta('Removing downloader', this.DOWNLOADER_ID));
  delete ACTIVE_DOWNLOADS[this.DOWNLOADER_ID];
  if (this.TIMER != null) clearInterval(this.TIMER);
 }

 //creates am empty file of specific size before download
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
