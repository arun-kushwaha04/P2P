import dgram, { Socket, RemoteInfo } from 'dgram';
import { Worker } from 'worker_threads';
//file imports
import {
 UDP_SERVER_PORT,
 UDP_PING,
 UDP_PONG,
 CLOSING_PEER,
 FILE_SEARCH_QUERY,
 FILE_CHUNK_REQUEST,
 FILE_CHUNK,
 CHUNK_TRANSFERED,
} from '../utils/constant.mjs';
import chalk from 'chalk';
import { FILE_MANAGER, TCP_SERVER } from '../server.mjs';
import { createReadStream } from 'fs';

export interface peerInfo {
 ipAddr: string;
 clientId: string;
 peerUserName: string;
}

export interface activeUserObject {
 [key: string]: peerInfo;
}

export interface payload {
 data: any;
 message: string;
}

interface udpPacket {
 pktType: number;
 clientId: string;
 clientUserName: string;
 payload: payload | null;
 currTime: Date;
 ipInfo: {
  senderPort: number;
  senderIpAddr: string;
  clientPort: number;
  clientIpAddr: string;
 };
}

export class UDPSever {
 //this protcol transfer data in form of valid json objects stringified as strings.
 private BROADCAST_ADDR: string;
 private USER_NAME: string;
 private USER_ID: string;
 public UDP_SOCKET: Socket;
 public ACTIVE_USERS: activeUserObject = {};
 public MY_IP_ADDRESS: string;

 constructor(addr: string, userName: string, userId: string) {
  this.BROADCAST_ADDR = addr;
  this.USER_NAME = userName;
  this.USER_ID = userId;
  this.MY_IP_ADDRESS = addr;
  //intalizing udp socket
  this.UDP_SOCKET = this.createUDPServer();
  //adding listners
  this.addListenerToUDPSocket();
 }

 private createUDPServer() {
  // this server will only send broadcast message
  // UDP_PING
  // UDP_PONG
  // CLOSING_PEER
  // FILE_SEARCH_QUERY
  let server: Socket = dgram.createSocket('udp4');

  server.bind(UDP_SERVER_PORT, () => {
   console.log('UDP server running', "Peer's username -", this.USER_NAME);
   server.setBroadcast(true);
  });

  return server;
 }

 private addListenerToUDPSocket() {
  // adding handler to handle request on udp server port
  this.UDP_SOCKET.on('message', async (message: string, rinfo: RemoteInfo) => {
   //handling type of packet
   let packetObjRecevied: udpPacket;
   try {
    packetObjRecevied = await JSON.parse(message);
   } catch (error) {
    throw new Error('Invalid json packet recevied');
   }

   if (packetObjRecevied.clientId === this.USER_ID) {
    if (packetObjRecevied.pktType === UDP_PING)
     this.MY_IP_ADDRESS = rinfo.address;
    return;
   }

   if (packetObjRecevied.pktType === UDP_PING) {
    //adding the new client to active user object
    console.log(
     'New peer connected to network',
     "Peer's username - ",
     packetObjRecevied.clientUserName,
     rinfo.address,
    );
    this.ACTIVE_USERS[packetObjRecevied.clientId] = {
     peerUserName: packetObjRecevied.clientUserName,
     clientId: packetObjRecevied.clientId,
     ipAddr: rinfo.address,
    };
    this.sendPong(rinfo.address);
   } else if (packetObjRecevied.pktType === UDP_PONG) {
    console.log(
     'New peer found in network',
     "Peer's username - ",
     packetObjRecevied.clientUserName,
     rinfo.address,
    );
    this.ACTIVE_USERS[packetObjRecevied.clientId] = {
     peerUserName: packetObjRecevied.clientUserName,
     clientId: packetObjRecevied.clientId,
     ipAddr: rinfo.address,
    };
   } else if (packetObjRecevied.pktType === CLOSING_PEER) {
    //removig the client form active user object

    console.log(
     'A peer is leaving the netwrok',
     "Peer's username - ",
     packetObjRecevied.clientUserName,
     rinfo.address,
    );
    delete this.ACTIVE_USERS[packetObjRecevied.clientId];
   } else if (packetObjRecevied.pktType === FILE_SEARCH_QUERY) {
    console.log(
     chalk.blue('New file search query'),
     chalk.green(packetObjRecevied.clientUserName),
    );
    FILE_MANAGER.searchFile(
     packetObjRecevied.payload?.data,
     packetObjRecevied.ipInfo.senderIpAddr,
    );
   } else if (packetObjRecevied.pktType === FILE_CHUNK_REQUEST) {
    console.log(
     chalk.blue('New file chunk request'),
     chalk.green(packetObjRecevied.clientUserName),
    );
   } else {
    throw new Error('Invalid packet recevied');
   }
   return;
  });

  this.UDP_SOCKET.on('listening', () => {
   this.sendPing();
  });

  this.UDP_SOCKET.on('close', () => {
   this.sendLastPacket();
  });
 }

 private sendPing = () => {
  // this function for sending new connection notification to the network
  const objToSend: udpPacket = {
   pktType: UDP_PING,
   clientId: this.USER_ID,
   clientUserName: this.USER_NAME,
   currTime: new Date(),
   payload: null,
   ipInfo: {
    senderPort: UDP_SERVER_PORT,
    senderIpAddr: this.MY_IP_ADDRESS,
    clientPort: UDP_SERVER_PORT,
    clientIpAddr: this.BROADCAST_ADDR,
   },
  };
  this.sendUdpPacket(objToSend, () => {
   console.log('NEW_PEER event sent to the network');
  });
 };

 public sendLastPacket = () => {
  // this function for sending new connection notification to the network
  return new Promise((resolve, reject) => {
   const objToSend: udpPacket = {
    pktType: CLOSING_PEER,
    clientId: this.USER_ID,
    clientUserName: this.USER_NAME,
    currTime: new Date(),
    payload: null,
    ipInfo: {
     senderPort: UDP_SERVER_PORT,
     senderIpAddr: this.MY_IP_ADDRESS,
     clientPort: UDP_SERVER_PORT,
     clientIpAddr: this.BROADCAST_ADDR,
    },
   };

   try {
    this.sendUdpPacket(objToSend, () => {
     console.log('CLOSING_PEER event sent to the network');
    });
    resolve('Sent');
   } catch (error) {
    reject('Failed to send CLOSING_PEER packet');
    throw new Error(`Failed to send CLOSING_PEER packet /n ${error}`);
   }
  });
 };

 private sendPong = (peerIPAddr: string) => {
  const objToSend: udpPacket = {
   pktType: UDP_PONG,
   clientId: this.USER_ID,
   clientUserName: this.USER_NAME,
   currTime: new Date(),
   payload: null,
   ipInfo: {
    senderPort: UDP_SERVER_PORT,
    senderIpAddr: this.MY_IP_ADDRESS,
    clientPort: UDP_SERVER_PORT,
    clientIpAddr: peerIPAddr,
   },
  };
  this.sendUdpPacket(objToSend);
 };

 //send message
 private sendUdpPacket = (
  packet: udpPacket,
  callback: () => void = () => {},
 ): void => {
  const message: String = JSON.stringify(packet);
  const bufferMessage: Buffer = Buffer.from(message);

  this.UDP_SOCKET.send(
   bufferMessage,
   0,
   bufferMessage.length,
   packet.ipInfo.clientPort,
   packet.ipInfo.clientIpAddr,
   callback,
  );
 };

 public sendFileSearchQuery = (
  queryString: string,
  peerIPAddr: string,
 ): void => {
  const objToSend: udpPacket = {
   pktType: FILE_SEARCH_QUERY,
   clientId: this.USER_ID,
   clientUserName: this.USER_NAME,
   currTime: new Date(),
   payload: {
    data: queryString,
    message: 'Please search for this file',
   },
   ipInfo: {
    senderPort: UDP_SERVER_PORT,
    senderIpAddr: this.MY_IP_ADDRESS,
    clientPort: UDP_SERVER_PORT,
    clientIpAddr: peerIPAddr,
   },
  };
  FILE_MANAGER.startSearch(queryString);
  setTimeout(() => {
   FILE_MANAGER.stopSearch();
  }, 5000);
  this.sendUdpPacket(objToSend);
 };

 public sendChunkRequest(
  fileHash: string,
  chunckNumber: number,
  peerIPAddr: string,
 ): void {
  const objToSend: udpPacket = {
   pktType: FILE_CHUNK_REQUEST,
   clientId: this.USER_ID,
   clientUserName: this.USER_NAME,
   currTime: new Date(),
   payload: {
    data: { fileHash, chunckNumber },
    message: 'Please send chunk of this file',
   },
   ipInfo: {
    senderPort: UDP_SERVER_PORT,
    senderIpAddr: this.MY_IP_ADDRESS,
    clientPort: UDP_SERVER_PORT,
    clientIpAddr: peerIPAddr,
   },
  };
  this.sendUdpPacket(objToSend);
 }

 private async sendChunkOnTCP(
  fileHash: string,
  chunckNumber: number,
  clientIpAddr: string,
 ) {
  const fileBuffer: string = await this.getFileChunk(fileHash, chunckNumber);
  TCP_SERVER.sendMessage(fileBuffer, clientIpAddr, FILE_CHUNK);
 }

 private async getFileChunk(fileHash: string, chunckNumber: number) {
  return new Promise<string>(async (resolve, reject) => {
   const { filePath, fileSize } = await FILE_MANAGER.getFilePathAndSize(
    fileHash,
   );
   if (!filePath) {
    console.log(chalk.red('Invalid file chucnk requested'));
    reject();
   }
   const worker = new Worker('./dist/workers/fileChunkWorker.mjs', {
    workerData: {
     filePath,
     fileSize,
     chunckNumber,
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
