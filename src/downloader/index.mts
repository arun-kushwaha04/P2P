import { FILE_MANAGER } from '../server.mjs';

class Downloader {
 private FILE_HASH: string;
 private PEERS: string[];
 private FILE_NAMES: { [key: string]: { name: string; count: number } };
 private FILE_EXTENTSION: { [key: string]: { ext: string; count: number } };
 private FILE_SIZE: number;
 private IS_FOLDER: boolean;

 constructor(fileHash: string) {
  this.FILE_HASH = fileHash;
  const temp = FILE_MANAGER.getFileInfo(fileHash);
  this.PEERS = temp.peerList;
  this.FILE_EXTENTSION = temp.extensions;
  this.FILE_NAMES = temp.names;
  this.FILE_SIZE = parseInt(temp.size);
  this.IS_FOLDER = temp.isFolder;
 }
}
