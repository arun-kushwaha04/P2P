//creating tcp connections for sending message between clinets
import net, { Server, Socket as TCPSocket } from 'net';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

import {
 FILE_CHUNK,
 FILE_CHUNK_TRANSFER_START,
 MAX_TCP_CONNECTIONS,
 TCP_MESSAGE,
 TCP_SERVER_PORT,
} from '../utils/constant.mjs';
import { closeListenerServer, dataListenerServer } from './tcpserver.mjs';
import { dataListenerClient, sendMessageChunk } from './tcpclient.mjs';
import {
 FILE_MANAGER,
 SOKCET_SERVER,
 UDP_SERVER,
 decsFileTransfers,
} from '../server.mjs';
import { generateChunkHash, sendTCPPacket } from './tcputils.mjs';

//TCP packet structure
//sampleJsonObj = {
// pktType: 'NEW_CONNECTION' denotes type of packet,
// clientId: USER_ID, unique username of client sending the packet
// currTime: new Date().getTime(), time when the packet was sended
// payload: null, packet metadata
// }
export interface payload {
 data: any;
 message: string;
 checksum: any;
}

export interface tcpPacket {
 pktType: number;
 clientId: string;
 clientUserName: string;
 clientIPAddr: string;
 payload: payload | null;
 currTime: Date;
}

export interface TCPMessage {
 message: any;
 type: number;
}
export class TCPserver {
 //  private USER_ID: string;
 //  private USER_NAME: string;
 private TCP_SERVER: Server;
 public ACTIVE_SOCKET_CONNECTIONS: Map<
  string,
  {
   socket: net.Socket;
   isFileTransferSocket: boolean;
   remoteAddress: string;
   downloaderId?: string;
   filePath?: string;
  }
 > = new Map();

 constructor() {
  this.TCP_SERVER = this.createTCPserver();
  this.addListenerToUDPServer();
 }

 private createTCPserver(): Server {
  const server: Server = net.createServer();
  server.listen(TCP_SERVER_PORT);
  //ensuring that server can only make 20 simuntanous connections
  server.maxConnections = MAX_TCP_CONNECTIONS;
  return server;
 }

 private addListenerToUDPServer() {
  //will tigger when the tcp gets up and listening
  this.TCP_SERVER.on('listening', () => {
   console.log('TCP server running');
  });

  //will tigger when the tcp stop listening
  this.TCP_SERVER.on('close', () => {
   console.log('TCP server stopped running');
  });

  //will tigger when a error on tcp server
  this.TCP_SERVER.on('error', (err) => {
   console.log('Error occured in TCP server', err);
  });

  //will tigger when a new client connected to the server
  this.TCP_SERVER.on('connection', (socket: TCPSocket) => {
   //when a client connects connects to the tcp server, get a connection socket from we can listen for message and write message to the client

   let tcpMessage: string | null = '';
   let CLIENT_USER_NAME: string;
   let CLINET_IP_ADDR: string;

   function setClientName(clientName: string) {
    CLIENT_USER_NAME = clientName;
    return;
   }
   function setTcpMessage(msg: string | null) {
    if (!tcpMessage) tcpMessage = '';
    tcpMessage += msg;
    return;
   }
   function setClientIPAddr(ipAddr: string): void {
    CLINET_IP_ADDR = ipAddr;
   }
   function getTcpMessage(): string | null {
    return tcpMessage;
   }
   function getClientName() {
    return CLIENT_USER_NAME;
   }
   function getClientIPAddr() {
    return CLINET_IP_ADDR;
   }

   console.log(socket.remoteAddress, 'connected to TCP server');

   //setting encoding for socket
   socket.setEncoding('utf-8');

   //will tigger when a socket receives data
   socket.on('data', async (data) => {
    // if (!tcpMessage) tcpMessage = data.toString();
    // else tcpMessage += data;
    console.log('Go a message', data);
   });

   //will trigger when a error occurs on socket
   socket.on('error', function (error) {
    console.log(socket.remoteAddress, 'a socket error occured - ', error);
    //TODO:
   });

   //will trigger when buffer is empty
   socket.on('drain', function () {
    socket.resume();
   });

   //will trigger when socket timeout
   socket.on('timeout', function () {
    console.log('Socket timed out !');
    socket.end('Timed out!');
    socket.destroy();
   });

   //will trigger when socket closes
   socket.on('close', async (error) => {
    if (error) {
     console.log(chalk.red('Socket closed due to error'));
     return;
    }
    closeListenerServer(
     error,
     socket,
     getClientIPAddr,
     getTcpMessage,
     getClientName,
     setClientName,
     setClientIPAddr,
    );
   });
  });
 }

 //client to send packet to tcp server
 public sendToTCPServer(
  message: string,
  clientIP: string,
  isFileChunk: boolean = false,
  downloaderId: string = '',
  chunkNumber: number = 0,
  filePath: string | null = null,
 ): Promise<string> {
  return new Promise<string>((resolve, reject) => {
   let sindex = 0;
   let eindex = 0;
   let tries = 0;
   let socketId = uuidv4();
   //  let buffer: string;
   //  function setBuffer(tbuffer: string) {
   //   buffer = tbuffer;
   //   return
   //  }
   //setter and getter functions
   function icnrTries() {
    tries++;
    return;
   }
   function setsIndex(num: number) {
    sindex = num;
    return;
   }
   function seteIndex(num: number) {
    eindex = num;
    return;
   }
   function getTries(): number {
    return tries;
   }
   function getSIndex(): number {
    return sindex;
   }
   function getEIndex(): number {
    return eindex;
   }
   const socket: TCPSocket = net.connect(
    { port: TCP_SERVER_PORT, host: clientIP },
    () => {
     //  sendMessageChunk(socket, message, sindex, icnrTries, seteIndex);
    },
   );
   socket.setEncoding('utf-8');
   socket.on('connect', async () => {
    if (isFileChunk) {
     this.ACTIVE_SOCKET_CONNECTIONS.set(socketId, {
      socket,
      isFileTransferSocket: true,
      downloaderId,
      remoteAddress: clientIP,
      filePath: filePath!,
     });

     let fileHash = await FILE_MANAGER.generateHash(filePath!);

     //sending the file
     sendTCPPacket(
      socket,
      TCP_MESSAGE,
      message,
      'File Chunk',
      fileHash,
      filePath,
     );
    } else {
     this.ACTIVE_SOCKET_CONNECTIONS.set(socketId, {
      socket,
      isFileTransferSocket: false,
      remoteAddress: clientIP,
     });
     sendTCPPacket(
      socket,
      TCP_MESSAGE,
      message,
      'Chat message',
      generateChunkHash(message),
     );
    }
   });
   socket.on('data', async (data: string) => {
    //sending next chunk of data to socket server
    // dataListenerClient(
    //  data,
    //  socket,
    //  message,
    //  resolve,
    //  reject,
    //  setsIndex,
    //  icnrTries,
    //  seteIndex,
    //  getTries,
    //  getSIndex,
    //  getEIndex,
    // );
   });

   //will trigger when buffer is empty
   socket.on('drain', function () {
    socket.resume();
   });

   socket.on('error', () => {
    //TODO:
    // UDP_SERVER.send
    console.log(chalk.red('TCP clinet socket err'));
   });
   socket.on('close', (hadError) => {
    this.ACTIVE_SOCKET_CONNECTIONS.delete(socketId);
    if (hadError) console.log(chalk.red('Socket closed due to error'));
    if (isFileChunk) decsFileTransfers();
   });
  });
 }

 public async sendMessage(
  message: any,
  clientIpAddr: string,
  messageType: number,
  isFileChunk: boolean = false,
  downloaderId: string = '',
  chunkNumber: number = 0,
 ) {
  let objToSend: TCPMessage = { message, type: messageType };
  if (isFileChunk)
   objToSend = { message: 'This is a file chunk', type: messageType };
  const stringObj = JSON.stringify(objToSend);
  try {
   await this.sendToTCPServer(
    stringObj,
    clientIpAddr,
    isFileChunk,
    downloaderId,
    chunkNumber,
    message.filePath ? message.filePath : null,
   );
  } catch (error) {
   console.log(chalk.red('Failed to send chat message'));
  }
 }

 public async sendFile(
  message: any,
  clientIpAddr: string,
  messageType: number,
  isFileChunk: boolean = false,
  downloaderId: string = '',
  chunkNumber: number = 0,
 ) {
  const socket: TCPSocket = net.connect({
   port: TCP_SERVER_PORT,
   host: clientIpAddr,
  });
  socket.setEncoding('utf-8');
  socket.on('connect', () => {
   console.log('CLIENT: socket connected to server');

   // informing server about a file transfer
   let objToSend = {
    data: 'file transfer',
    pktType: FILE_CHUNK_TRANSFER_START,
   };
   socket.write(JSON.stringify(objToSend));
  });

  socket.on('data', async (data: string) => {});

  //will trigger when buffer is empty
  socket.on('drain', function () {
   socket.resume();
  });

  socket.on('error', () => {
   console.log(chalk.red('TCP clinet socket err'));
  });
  socket.on('close', (hadError) => {
   console.log('Closing connection');
  });
 }

 public closeTCPServer() {
  //this function is for closing the tcp server
  return new Promise<void>(async (resolve, _) => {
   for (let [_, value] of this.ACTIVE_SOCKET_CONNECTIONS) {
    value.socket.emit('error');
    if (value.isFileTransferSocket) {
     UDP_SERVER.sendChokedState(value.downloaderId!, value.remoteAddress!);
    }
   }
   this.TCP_SERVER.close();
   await UDP_SERVER.sendLastPacket();
   resolve();
  });
 }
}
