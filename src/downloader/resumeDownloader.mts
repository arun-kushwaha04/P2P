import { FILE_MANAGER } from '../server.mjs';
import { Peer } from './downloader.mjs';

export class ResumeDownloader {
 public PEERS: Peer[] = [];
 constructor(downloaderId: string, fileHash: string) {
  FILE_MANAGER.refreshPeerList(fileHash, downloaderId);
 }

 //function to update the peer list for downloader
 public updatePeerList(peerIPAddr: string, load: number) {
  this.addNewPeer(peerIPAddr, load);
  return;
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
 }
}
