import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import chalk from 'chalk';
import es from 'event-stream';
import { Hash, createHash } from 'crypto';

import { connectToDB } from './db.mjs';
import FileModel from './fileModel.mjs';
import { FILE_STREAM_SIZE } from '../utils/constant.mjs';
import { start } from 'repl';

export class File {
 constructor() {
  connectToDB();
  this.shareFile('/home/dawn_89/Downloads/1200477.jpg');
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
    console.log('1');
    const fileHash = await this.generateHash(filePath, fileSize);
    console.log('2');
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
  //creating a read stream and concating them to generate sha 256 hash
  return new Promise<string>(async (resolve, reject) => {
   var fd = fs.createReadStream('/some/file/name.txt');
   var hash = createHash('sha256');
   hash.setEncoding('hex');

   fd.on('end', function () {
    hash.end();
    console.log(hash.read()); // the desired sha1sum
    resolve(hash.read());
   });

   // read all file and pipe it (write it) to the hash object
   fd.pipe(hash);
  });
 }

 //  private async fileChunkHash(
 //   filePath: string,
 //   startPos: number,
 //   endPos: number,
 //   hash: Hash,
 //   i: number,
 //  ) {
 //   return new Promise<void>((resolve, reject) => {
 //    let stream = fs.createReadStream(filePath, {
 //     start: startPos,
 //     end: endPos,
 //    });

 //    stream.on('data', (chunk) => {
 //     console.log(i, 'chunk');
 //     stream.read()
 //     hash.update(chunk);
 //    });
 //    stream.on('error', (err) => reject(err));
 //    stream.on('finish', () => {
 //     console.log(i, 'end');
 //     resolve();
 //     stream.close();
 //    });
 //   });
 //  }
}
