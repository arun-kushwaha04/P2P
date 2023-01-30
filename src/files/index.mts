import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import chalk from 'chalk';

import { connectToDB } from './db.mjs';
import FileModel from './fileModel.mjs';
import { Worker } from 'worker_threads';
import { Hash, createHash } from 'crypto';
import { TCP_SERVER } from '../server.mjs';
import { FILE_SEARCH_RESULT } from '../utils/constant.mjs';
import { stringify } from 'querystring';

interface typeInterface {
 [fileName: string]: string[];
}

interface hashInterface {
 [fileType: string]: typeInterface;
}

interface fileInfoInterface {
 [fileHash: string]: hashInterface;
}

export class File {
 private FILE_SEARCH_RESULT: fileInfoInterface = {};
 private SEARCH_RUNNING: boolean = false;
 private CURRENT_FILE_QUERY: string | null = null;
 constructor() {
  connectToDB();
 }

 public searchRunning = () => this.SEARCH_RUNNING;

 public startSearch = (fileQuery: string) => {
  this.CURRENT_FILE_QUERY = fileQuery;
  this.SEARCH_RUNNING = true;
 };

 public stopSearch = () => {
  this.CURRENT_FILE_QUERY = null;
  this.SEARCH_RUNNING = false;

  console.log(FILE_SEARCH_RESULT);
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

       Promise.allSettled(promiseArray).then((results) => {
        results.forEach((result) => {
         if (result.status === 'rejected') reject();
         else {
          fileSize += result.value.fileSize;
          fhash.update(result.value.fileHash);
         }
        });
        const fileHash = fhash.digest('hex');
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
       });
      } else {
       this.generateHash(filePath, fileSize)
        .then((fileHash) => {
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
   const worker = new Worker('./dist/fileHash.mjs', {
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
  const file = await FileModel.find(
   {
    fileName: { $regex: searchQuery, $options: 'i' },
   },
   '-filePath',
  );
  if (file.length > 0) {
   const searchResult: any = { searchQuery };
   searchResult.file = file;
   TCP_SERVER.sendMessage(searchResult, clientIpAddr, FILE_SEARCH_RESULT);
  }
  return;
 }

 public async handleFileSearchResult(searchResult: any, peerIPAddr: string) {
  if (searchResult.searchQuery === this.CURRENT_FILE_QUERY) {
   //insert this in file query result
   searchResult.file.forEach(
    (file: {
     fileName: string;
     fileHash: string;
     fileMimeType: string;
     fileSize: string;
     fileExtentsion: string;
     isFolder: string;
    }) => {
     this.FILE_SEARCH_RESULT[file.fileHash][file.fileExtentsion][
      file.fileName
     ].push(peerIPAddr);
     //  if (this.FILE_SEARCH_RESULT[file.fileHash]) {
     //   if (this.FILE_SEARCH_RESULT[file.fileHash][file.fileExtentsion]) {
     //    if (
     //     this.FILE_SEARCH_RESULT[file.fileHash][file.fileExtentsion][
     //      file.fileName
     //     ]
     //    ) {
     //     this.FILE_SEARCH_RESULT[file.fileHash][file.fileExtentsion][
     //      file.fileName
     //     ].push(peerIPAddr);
     //    } else {
     //     this.FILE_SEARCH_RESULT[file.fileHash][file.fileExtentsion][
     //      file.fileName
     //     ] = [peerIPAddr];
     //    }
     //   } else {
     //    this.FILE_SEARCH_RESULT[file.fileHash][file.fileExtentsion] = {
     //     [file.fileName]: [peerIPAddr],
     //    };
     //   }
     //  } else {
     //   this.FILE_SEARCH_RESULT[file.fileHash] = {
     //    [file.fileExtentsion]: {
     //     [file.fileName]: [peerIPAddr],
     //    },
     //   };
     //  }
    },
   );
  }
 }
}
