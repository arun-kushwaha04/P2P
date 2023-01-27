import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import chalk from 'chalk';

import { connectToDB } from './db.mjs';
import FileModel from './fileModel.mjs';
import { Worker } from 'worker_threads';

export class File {
 constructor() {
  // connectToDB();
  // this.shareFile('/home/dawn_89/Downloads/1200477.jpg');
  this.shareFile('/home/dawn_89/Downloads/');
  // this.shareFile('/home/dawn_89/Downloads/ubuntu-22.04.1-desktop-amd64.iso');
 }

 public async shareFile(filePath: string) {
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
   try {
    //extracting file infromation from filepath
    const fileSize = fs.statSync(filePath).size;
    const fileName = path.basename(filePath);
    const fileExtentsion = path.extname(filePath);
    const fileMimeType = mime.lookup(filePath);
    if (fs.statSync(filePath).isDirectory()) {
     const info = fs.readdirSync(filePath, { withFileTypes: true });
     console.log(info);
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
       });
       console.log(file);
       console.log(chalk.bgGreen('File shared in the network'));
      })
      .catch((error) => console.log(error));
    }
   } catch (error) {
    console.log(
     chalk.bgRed('Error occured to share file/folder'),
     chalk.red(error),
    );
   }
  } else {
   console.log(chalk.bgRed('Invalid file/folder path'));
  }
  return;
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
}
