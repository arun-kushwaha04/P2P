import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import chalk from 'chalk';

import { connectToDB } from './db.mjs';
import FileModel from './fileModel.mjs';
import { Worker } from 'worker_threads';
import { createHash } from 'crypto';
import {
 BROADCAST_ADDR,
 SOKCET_SERVER,
 TCP_SERVER,
 UDP_SERVER,
} from '../server.mjs';
import { FILE_SEARCH_RESULT } from '../utils/constant.mjs';
import pausedDownloadModel from './pausedDownloadModel.mjs';
import { DownloadInfo } from '../downloader/downloader.mjs';

// declare module namespace {
//  interface typeInterface {
//   [fileName: string]: string[];
//  }

//  interface hashInterface {
//   [fileType: string]: typeInterface;
//  }

//  export interface fileInfoInterface {
//   [fileHash: string]: hashInterface;
//  }
// }

export declare module namespace {
 export interface FileName {
  [fileName: string]: string[];
 }

 export interface Filehash {
  extentsion: { [filetype: string]: FileName };
  size: string;
  isFolder: boolean;
  subFiles?: any[];
 }

 export interface FileInfoInterface {
  [filehash: string]: Filehash;
 }
}

interface FileInterface {
 fileName: string;
 fileHash: string;
 fileMimeType: string;
 fileSize: string;
 fileExtentsion: string;
 isFolder: boolean;
 subFiles: any[];
}
export class File {
 private FILE_SEARCH_RESULT: namespace.FileInfoInterface = {};
 private SEARCH_RUNNING: boolean = false;
 private CURRENT_FILE_QUERY: string | null = null;
 constructor() {
  connectToDB();
 }

 public searchRunning = () => this.SEARCH_RUNNING;

 public startSearch = (fileQuery: string) => {
  this.FILE_SEARCH_RESULT = {};
  this.CURRENT_FILE_QUERY = fileQuery;
  this.SEARCH_RUNNING = true;
 };

 public stopSearch = () => {
  this.CURRENT_FILE_QUERY = null;
  this.SEARCH_RUNNING = false;
  console.log(JSON.stringify(this.FILE_SEARCH_RESULT));
  SOKCET_SERVER.sendFileSearchResponse(this.FILE_SEARCH_RESULT);
 };

 public async shareFile(filePath: string) {
  return new Promise<{ fileHash: string; fileSize: number }>(
   async (resolve, reject) => {
    filePath = path.resolve(filePath);
    if (fs.existsSync(filePath)) {
     try {
      //extracting file infromation from filepath
      let fileSize = fs.statSync(filePath).size;
      const fileName = path.basename(filePath);
      const fileExtentsion = path.extname(filePath);
      const fileMimeType = mime.lookup(filePath);
      if (fs.statSync(filePath).isDirectory()) {
       const info = fs.readdirSync(filePath, { withFileTypes: true });
       const fhash = createHash('sha256');
       fileSize = 0;
       const promiseArray = [];
       for (let item of info) {
        const newPath = path.join(filePath, item.name);
        promiseArray.push(this.shareFile(newPath));
       }

       Promise.allSettled(promiseArray).then(async (results) => {
        results.forEach((result) => {
         if (result.status === 'rejected') reject();
         else {
          fileSize += result.value.fileSize;
          fhash.update(result.value.fileHash);
         }
        });
        const fileHash = fhash.digest('hex');
        const file = await FileModel.findOne({ filePath: filePath });
        if (file) {
         file.fileExtentsion = fileExtentsion;
         file.fileMimeType = fileMimeType.toString();
         file.fileName = fileName;
         file.fileSize = fileSize.toString();
         file.fileHash = fileHash;
         file.isFolder = true;

         file.save();
         console.log(chalk.bgGreen('Folder shared in the network'));
         resolve({ fileHash, fileSize });
        } else {
         const file = new FileModel({
          fileExtentsion,
          fileMimeType,
          fileName,
          filePath,
          fileSize: fileSize.toString(),
          fileHash,
          isFolder: true,
         });
         file.save();
         console.log(chalk.bgGreen('Folder shared in the network'));
         resolve({ fileHash, fileSize });
        }
       });
      } else {
       this.generateHash(filePath, fileSize)
        .then(async (fileHash) => {
         const file = await FileModel.findOne({ filePath: filePath });
         if (file) {
          file.fileExtentsion = fileExtentsion;
          file.fileMimeType = fileMimeType.toString();
          file.fileName = fileName;
          file.fileSize = fileSize.toString();
          file.fileHash = fileHash;
          file.isFolder = false;

          file.save();
          console.log(chalk.bgGreen('File shared in the network'));
          resolve({ fileHash, fileSize });
         } else {
          const file = new FileModel({
           fileExtentsion,
           fileMimeType,
           fileName,
           filePath,
           fileSize: fileSize.toString(),
           fileHash,
           isFolder: false,
          });
          file.save();
          console.log(chalk.bgGreen('File shared in the network'));
          resolve({ fileHash, fileSize });
         }
        })
        .catch((error) => {
         console.log(error);
         return null;
        });
      }
     } catch (error) {
      console.log(
       chalk.bgRed('Error occured to share file/folder'),
       chalk.red(error),
      );
      reject();
     }
    } else {
     console.log(chalk.bgRed('Invalid file/folder path'));
     reject();
    }
   },
  );
 }

 private async generateHash(filePath: string, fileSize: number) {
  //creating a worker thread for hashing calulatoins
  return new Promise<string>(async (resolve, reject) => {
   const worker = new Worker('./dist/workers/fileHash.mjs', {
    workerData: {
     filePath,
    },
   });
   worker.on('message', (data) => {
    resolve(data.val);
   });
   worker.on('error', (msg) => {
    console.log(msg);
    reject(msg);
   });
   worker.on('exit', () => console.log('worker exit'));
  });
 }

 public async searchFile(searchQuery: string, clientIpAddr: string) {
  let newSearchQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  newSearchQuery = '/' + newSearchQuery + '/';
  console.log('Searching file logs', newSearchQuery);
  const files = await FileModel.find({
   fileName: { $regex: newSearchQuery, $options: 'si' },
  });
  if (files.length > 0) {
   const searchResult: any = { searchQuery };
   let temp: any[] = [];
   for (let i = 0; i < files.length; i++) {
    const file = files[i];
    //creating a temp file object
    let ztemp: FileInterface = {
     fileHash: file.fileHash!,
     fileExtentsion: file.fileExtentsion!,
     fileName: file.fileName!,
     fileSize: file.fileSize!,
     fileMimeType: file.fileMimeType!,
     isFolder: file.isFolder!,
     subFiles: [],
    };
    if (file.isFolder) {
     const parentPathLength = file.filePath!.split('/').length;
     const subFiles = await FileModel.find({
      filePath: { $regex: file.filePath, $options: 'i' },
     });

     subFiles.forEach((subFile) => {
      if (subFile.filePath !== file.filePath && !subFile.isFolder)
       ztemp.subFiles.push({
        fileHash: subFile.fileHash,
        fileExtentsion: subFile.fileExtentsion,
        fileName: subFile.fileName,
        fileSize: subFile.fileSize,
        fileMimeType: subFile.fileMimeType,
        isFolder: subFile.isFolder,
        parentFolder: this.returnParentFolder(
         subFile.filePath!,
         parentPathLength,
        ),
       });
     });
    }
    temp.push(ztemp);
   }
   searchResult.file = temp;
   TCP_SERVER.sendMessage(searchResult, clientIpAddr, FILE_SEARCH_RESULT);
  }
  return;
 }

 //TODO: handle for window/linux
 private returnParentFolder(filePath: string, parentLength: number) {
  const array: string[] = filePath.split('/');
  let result = [''];
  for (let i = 0; i < array.length - 1; i++) {
   if (i < parentLength - 1) continue;
   result.push(array[i]);
  }
  return result;
 }

 public async handleFileSearchResult(searchResult: any, peerIPAddr: string) {
  if (searchResult.searchQuery === this.CURRENT_FILE_QUERY) {
   //insert this in file query result
   searchResult.file.forEach((file: FileInterface) => {
    if (this.FILE_SEARCH_RESULT[file.fileHash]) {
     if (
      this.FILE_SEARCH_RESULT[file.fileHash].extentsion[file.fileExtentsion]
     ) {
      if (
       this.FILE_SEARCH_RESULT[file.fileHash].extentsion[file.fileExtentsion][
        file.fileName
       ]
      ) {
       this.FILE_SEARCH_RESULT[file.fileHash].extentsion[file.fileExtentsion][
        file.fileName
       ].push(peerIPAddr);
      } else {
       this.FILE_SEARCH_RESULT[file.fileHash].extentsion[file.fileExtentsion][
        file.fileName
       ] = [peerIPAddr];
      }
     } else {
      this.FILE_SEARCH_RESULT[file.fileHash].extentsion[file.fileExtentsion] = {
       [file.fileName]: [peerIPAddr],
      };
     }
    } else {
     this.FILE_SEARCH_RESULT[file.fileHash] = {
      extentsion: {
       [file.fileExtentsion]: {
        [file.fileName]: [peerIPAddr],
       },
      },
      size: file.fileSize,
      isFolder: file.isFolder,
      subFiles: file?.subFiles,
     };
    }
   });
  }
 }
 public getFileInfo(fileHash: string) {
  let peerList: string[] = [];
  let names: string[] = [];

  if (this.FILE_SEARCH_RESULT[fileHash]) {
   const fileType = Object.keys(this.FILE_SEARCH_RESULT[fileHash].extentsion);
   fileType.forEach((key) => {
    const fileName = Object.keys(
     this.FILE_SEARCH_RESULT[fileHash].extentsion[key],
    );
    fileName.forEach((file) => {
     names.push(file);
     peerList = [
      ...peerList,
      ...this.FILE_SEARCH_RESULT[fileHash].extentsion[key][file],
     ];
    });
   });
  }

  return {
   peerList,
   names,
   size: this.FILE_SEARCH_RESULT[fileHash].size,
   isFolder: this.FILE_SEARCH_RESULT[fileHash].isFolder,
   subFiles: this.FILE_SEARCH_RESULT[fileHash].subFiles
    ? this.FILE_SEARCH_RESULT[fileHash].subFiles
    : [],
  };
 }

 public refreshPeerList(fileHash: string, downloaderId: string) {
  UDP_SERVER.sendFileSearchHash(fileHash, downloaderId, BROADCAST_ADDR);
  return;
 }

 public getPausedDownloadData(downloaderId: string) {
  return new Promise<{
   fileHash: string;
   folderName: string;
   fileName: string;
   fileSize: string;
   isFolder: boolean;
   subFiles: any[];
   chunkArray: boolean[];
   isSubFile: boolean;
   subFileIds: {
    downloaderId: string | null;
    isDownloadStarted: boolean;
   }[];
  }>(async (resolve, reject) => {
   const data = await pausedDownloadModel.findOne({
    downloaderId: downloaderId,
   });
   if (data)
    resolve({
     fileHash: data.fileHash!,
     folderName: data.folderName!,
     fileName: data.fileName!,
     fileSize: data.fileSize!,
     isFolder: data.isFolder!,
     subFiles: data.subFiles!,
     isSubFile: data.isSubFile!,
     subFileIds: data.subFileIds!,
     chunkArray: data.chunkArray,
    });
   else reject();
  });
 }

 public searchByHash(filehash: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
   FileModel.find({ fileHash: filehash })
    .then((file) => {
     if (file.length > 0) resolve(true);
     resolve(false);
    })
    .catch((err) => {
     console.log(chalk.red(err));
     resolve(false);
    });
  });
 }

 public getFilePathAndSize(fileHash: string) {
  return new Promise<{ filePath: string; fileSize: string }>(
   async (resolve, reject) => {
    const file = await FileModel.findOne({ fileHash: fileHash });
    if (file) {
     resolve({ filePath: file.filePath!, fileSize: file.fileSize! });
    }
    reject(null);
   },
  );
 }

 public getPausedDownloads = async () => {
  const downloads = await pausedDownloadModel.find();
  const pausedDownloads: DownloadInfo[] = [];

  downloads.forEach((download) => {
   let tc = 0,
    cd = 0;

   download.chunkArray.forEach((chunk) => {
    tc++;
    if (chunk) cd++;
   });

   let temp: DownloadInfo = {
    fileHash: download.fileHash!,
    fileName: download.fileName!,
    downloaderId: download.downloaderId!,
    fileSize: parseInt(download.fileSize!),
    isFolder: download.isFolder!,
    subFiles: download.subFiles!,
    totalChunks: tc,
    chunksDownlaoded: cd,
    currentChunkPullingFrom: null,
   };

   pausedDownloads.push(temp);
  });

  return pausedDownloads;
 };
}
