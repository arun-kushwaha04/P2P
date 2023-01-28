import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import chalk from 'chalk';

import { connectToDB } from './db.mjs';
import FileModel from './fileModel.mjs';
import { Worker } from 'worker_threads';
import { Hash, createHash } from 'crypto';

export class File {
 constructor() {
  connectToDB();
  // this.shareFile('/home/dawn_89/Downloads/1200477.jpg');
  // this.shareFile('/home/dawn_89/Downloads/');
  // this.shareFile('/home/dawn_89/Downloads/ubuntu-22.04.1-desktop-amd64.iso');
 }

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

 public async searchFile(searchQuery: string) {
  const file = await FileModel.find(
   {
    fileName: { $regex: searchQuery, $options: 'i' },
   },
   '-filePath',
  );
  return file;
 }
}
