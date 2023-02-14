import fs from 'fs';
import { v4 as uuidv4, v4 } from 'uuid';
import path from 'path';

import {
 ACTIVE_DOWNLOADS,
 DOWNLOADER_QUEUE,
 FILE_MANAGER,
 FILE_TRANSFERS,
 UDP_SERVER,
 decsFileTransfers,
 incrFileTransfers,
 resumeFileDownload,
 validateIp,
} from '../server.mjs';
import {
 CHUNK_TRANSFERED,
 DOWNLOAD_FOLDER,
 LOGS,
 MAX_FILE_TRANSFERS,
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
 isFolder: boolean;
 parentFolder: any[];
}

export interface Peer {
 ipAddr: string;
 load: number;
}
export class Downloader {
 protected FILE_HASH: string;
 protected PEERS: Peer[];
 protected FILE_NAMES: string[];
 protected FILE_SIZE: number;
 protected IS_FOLDER: boolean;
 protected TOTAL_CHUNKS: number = 0;
 protected CHUNK_LEFT: number = 0;
 protected CHUNK_ARRAY: boolean[];
 protected CHUNK_REQUESTED_ARRAY: number[];
 protected SUB_FILES: SubFileInterface[];
 protected IS_SUB_FILE: boolean;
 protected PARENT_FOLDER: string;
 protected DOWNLOADER_ID: string;
 protected TIMER: NodeJS.Timer | null = null;
 protected CHUNK_REQUESTED_FROM: string | null = null;
 protected SUB_FILE_ID: {
  downloaderId: string | null;
  isDownloadStarted: boolean;
 }[] = [];

 constructor(
  fileHash: string,
  downloaderId: string,
  peerList?: Peer[],
  fileInfo?: SubFileInterface,
  isSubFile?: boolean,
  chunkArray?: boolean[],
  resumeDownload: boolean = false,
  resumeDownloadData?: {
   fileName: string;
   fileSize: string;
   isFolder: boolean;
   folderPath: string;
   subFiles: any[];
   subFileIds: {
    downloaderId: string | null;
    isDownloadStarted: boolean;
   }[];
  },
 ) {
  this.FILE_HASH = fileHash;

  if (resumeDownload) {
   this.PEERS = peerList!;
   this.FILE_NAMES = [resumeDownloadData?.fileName!];
   this.FILE_SIZE = parseInt(resumeDownloadData?.fileSize!);
   this.IS_FOLDER = resumeDownloadData?.isFolder!;
   this.SUB_FILES = resumeDownloadData?.subFiles!;
   this.IS_SUB_FILE = isSubFile!;
   this.PARENT_FOLDER = resumeDownloadData?.folderPath!;
   this.SUB_FILE_ID = resumeDownloadData?.subFileIds!;
  } else {
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
   this.SUB_FILES.forEach(() => {
    this.SUB_FILE_ID.push({ downloaderId: null, isDownloadStarted: false });
   });
  }
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
 protected folderDownload = async () => {
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
    if (this.SUB_FILE_ID[i].isDownloadStarted === false) {
     console.log('Staring sub file download');
     const file = this.SUB_FILES[i];
     currentDownload = uuidv4();
     this.SUB_FILE_ID[i] = {
      downloaderId: currentDownload,
      isDownloadStarted: true,
     };
     ACTIVE_DOWNLOADS[currentDownload] = new Downloader(
      this.SUB_FILES[i].fileHash,
      currentDownload,
      this.PEERS,
      file,
      true,
     );
     this.pauseDownloadAndSaveState(false);
    } else {
     //reusme the old download
     currentDownload = this.SUB_FILE_ID[i].downloaderId!;
     resumeFileDownload(currentDownload);
    }
    i++;
   }
  }
  console.log('Folder download completed');
  this.destructor();
 };

 // starts the download for a file
 protected async startDownload() {
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
  this.pauseDownloadAndSaveState(false);
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
 protected async sendChunkRequest() {
  // if current number of downloads is equal to max limit then add the download to queue
  if (FILE_TRANSFERS >= MAX_FILE_TRANSFERS) {
   console.log(chalk.blueBright('Download paused and added to download queue'));
   DOWNLOADER_QUEUE.push(this.DOWNLOADER_ID);
   this.pauseDownloadAndSaveState(true);
   return;
  }
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
   this.pauseDownloadAndSaveState(true);
  }
 }

 // compare hash of downloaded file with actual hash
 protected checkFileHealth(filePath: string) {
  //file rebuilded successfully now compare the hash
  this.removeTempDownloadState();
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
 protected writeToFile(
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
 protected popAndPush(): string | null {
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
 protected pop(): string | null {
  if (this.PEERS.length > 0) {
   const value = this.PEERS.shift();
   return value!.ipAddr;
  } else return null;
 }

 //adds new peer to peers queue
 protected addNewPeer(peerIPAddr: string, load: number) {
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
 protected refeshPeerList() {
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
 protected validOnlinePeer() {
  while (this.PEERS.length > 0 && !validateIp(this.PEERS[0].ipAddr)) {
   this.pop();
  }
  return;
 }

 //maps peers string array to peer queue with ip address and load param
 protected mapPeerToLoad(peers: string[]) {
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
 protected sortPeerArray() {
  this.PEERS.sort((a: Peer, b: Peer) => {
   if (a.load > b.load) return 1;
   else if (a.load < b.load) return -1;
   return 0;
  });
 }

 //pause download and save state to database
 protected async pauseDownloadAndSaveState(exit: boolean = false) {
  if (exit) this.destructor;
  await pausedDownloadModel.updateOne(
   { downloaderId: this.DOWNLOADER_ID },
   {
    downloaderId: this.DOWNLOADER_ID,
    fileHash: this.FILE_HASH,
    folderName: this.PARENT_FOLDER,
    fileName: this.FILE_NAMES[0],
    fileSize: this.FILE_SIZE,
    isFolder: this.IS_FOLDER,
    chunkArray: this.CHUNK_ARRAY,
    isSubFile: this.SUB_FILES,
    subFiles: this.IS_SUB_FILE,
    subFileIds: this.SUB_FILE_ID,
   },
   {
    upsert: true,
   },
  );
  // await downloadState.save();
  return;
 }

 //clear temproray state from downloader
 protected async removeTempDownloadState() {
  await pausedDownloadModel.deleteOne({ downloaderId: this.DOWNLOADER_ID });
  return;
 }

 //function to update the peer list for downloader
 public updatePeerList(peerIPAddr: string, load: number) {
  this.addNewPeer(peerIPAddr, load);
  return;
 }

 //free memory resources when download completes/paused
 protected destructor() {
  console.log(chalk.bgMagenta('Removing downloader', this.DOWNLOADER_ID));
  delete ACTIVE_DOWNLOADS[this.DOWNLOADER_ID];
  if (this.TIMER != null) clearInterval(this.TIMER);
 }

 //creates am empty file of specific size before download
 protected createEmptyFileOfSize(fileName: string, size: number) {
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
