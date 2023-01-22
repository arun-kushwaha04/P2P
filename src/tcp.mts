//creating tcp connections for sending message between clinets
import net, { Server, Socket as TCPSocket } from 'net';
import chalk from 'chalk';
import crypto from 'crypto';

import {
 TCP_SERVER_PORT,
 TCP_PACKET_ERROR,
 TCP_PACKET_RECEVIED,
 CHAT_MESSAGE,
 CHAT_MESSAGE_LAST,
 CHAT_MESSAGE_NEXT,
 CHECKSUM_ERROR,
 MAX_TRIES,
 CHAT_MESSAGE_RESET,
} from './constant.mjs';

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

interface tcpPacket {
 pktType: number;
 clientId: string;
 clientUserName: string;
 payload: payload | null;
 currTime: Date;
}
export class TCPserver {
 private USER_ID: string;
 private USER_NAME: string;
 private TCP_SERVER: Server;

 constructor(userName: string, userId: string) {
  this.USER_ID = userId;
  this.USER_NAME = userName;

  this.TCP_SERVER = this.createTCPserver();
  this.addListenerToUDPServer();
 }

 private createTCPserver(): Server {
  const server: Server = net.createServer();
  server.listen(TCP_SERVER_PORT);
  //ensuring that server can only make 20 simuntanous connections
  server.maxConnections = 20;
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

   let packetObjRecevied: tcpPacket;
   let chatMessage: string | null = null;
   let CLIENT_USER_NAME: string;

   console.log(socket.remoteAddress, 'connected to TCP server');

   //setting encoding for socket
   socket.setEncoding('utf-8');

   //will tigger when a socket receives data
   socket.on('data', async (data: Buffer) => {
    packetObjRecevied = await this.parseToJson(data.toString());
    if (packetObjRecevied.pktType === CHAT_MESSAGE) {
     this.sendTCPPacket(
      socket,
      CHAT_MESSAGE_NEXT,
      null,
      'request for next chat message',
     );
     if (!chatMessage) chatMessage = '';
     chatMessage += packetObjRecevied.payload?.data;
    } else if (packetObjRecevied.pktType === CHAT_MESSAGE_LAST) {
     if (!chatMessage) chatMessage = '';
     chatMessage += packetObjRecevied.payload?.data;
     CLIENT_USER_NAME = packetObjRecevied.clientUserName;
     const genreatedHash = this.generateChunkHash(chatMessage as string);
     if (genreatedHash === packetObjRecevied.payload?.checksum) {
      this.sendTCPPacket(
       socket,
       TCP_PACKET_RECEVIED,
       null,
       'recevied chat message',
      );
     } else {
      chatMessage = null;
      this.sendTCPPacket(
       socket,
       CHECKSUM_ERROR,
       null,
       'message hash not matched',
      );
     }
    } else if (packetObjRecevied.pktType === CHAT_MESSAGE_RESET) {
     chatMessage = null;
     this.sendTCPPacket(
      socket,
      CHAT_MESSAGE_NEXT,
      null,
      'request for next chat message',
     );
    } else {
     chatMessage = null;
     this.sendTCPPacket(
      socket,
      TCP_PACKET_ERROR,
      null,
      'invalid protocol used',
     );
    }
   });

   //will trigger when a error occurs on socket
   socket.on('error', function (error) {
    console.log(socket.remoteAddress, 'a socket error occured - ', error);
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

   socket.on('close', async (error) => {
    let bread = socket.bytesRead;
    let bwrite = socket.bytesWritten;
    console.log(
     chalk.green('Bytes read : ' + bread),
     chalk.green('Bytes written : ' + bwrite),
     chalk.green('Socket closed!'),
    );
    if (chatMessage) {
     console.log(
      chalk.bgMagenta('Message from client'),
      chalk.yellow(CLIENT_USER_NAME),
      chalk.blue(chatMessage),
     );
    }
    // try {
    //  const tcpPakcet: tcpPacket = await this.parseToJson(data);
    //  console.log(tcpPakcet);
    //  this.sendTCPPacket(socket, TCP_PACKET_RECEVIED, null);
    // } catch (error) {
    //  this.sendTCPPacket(socket, TCP_PACKET_ERROR, null);
    //  throw new Error('Invalid packet type');
    // }

    if (error) {
     console.log('Socket was closed coz of transmission error');
    }
   });
  });
 }

 //send a tcp packet from the open socket
 private sendTCPPacket(
  socket: TCPSocket,
  pktType: number,
  buffer: string | null,
  message: string,
  hash: string | null = null,
 ): boolean {
  return socket.write(this.genreateTcpPktToStr(pktType, buffer, message, hash));
 }

 //send a tcp packet from the open socket
 private genreateTcpPktToStr(
  pktType: number,
  data: any,
  message: string,
  hash: string | null = null,
 ): string {
  const objToSend: tcpPacket = {
   pktType,
   clientId: this.USER_ID,
   clientUserName: this.USER_NAME!,
   payload: { data, message, checksum: hash },
   currTime: new Date(),
  };
  return JSON.stringify(objToSend);
 }

 public closeTCPServer() {
  //this function is for closing the tcp server
  new Promise<void>((resolve, _) => {
   this.TCP_SERVER.close();
   resolve();
  });
 }

 //client to send packet to tcp server
 public sendToTCPServer(message: string, clientIP: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
   let sindex = 0;
   let eindex = 0;
   let buffer: string;
   let tries = 0;
   const socket: TCPSocket = net.connect(
    { port: TCP_SERVER_PORT, host: clientIP },
    () => {
     tries++;
     [buffer, eindex] = this.generateBufferChunk(message, sindex);
     if (eindex === message.length)
      this.sendTCPPacket(
       socket,
       CHAT_MESSAGE_LAST,
       buffer,
       'chat message last',
       this.generateChunkHash(message),
      );
     else this.sendTCPPacket(socket, CHAT_MESSAGE, buffer, 'chat message');
    },
   );
   socket.setEncoding('utf8');
   socket.on('data', async (data: string) => {
    try {
     const tcpPakcet: tcpPacket = await this.parseToJson(data);
     //  console.log(tcpPakcet);
     if (tcpPakcet.pktType === TCP_PACKET_RECEVIED) {
      // if packet recevied by server successfully
      socket.end();
      resolve('Message sent successfully');
     } else if (tcpPakcet.pktType === TCP_PACKET_ERROR) {
      //some error in sending the packet
      socket.end();
      //resending the packet to server
      this.sendToTCPServer(message, clientIP);
     } else if (tcpPakcet.pktType === CHAT_MESSAGE_NEXT) {
      sindex = eindex;
      [buffer, eindex] = this.generateBufferChunk(message, sindex);
      console.log(buffer, eindex);
      if (eindex === message.length)
       this.sendTCPPacket(
        socket,
        CHAT_MESSAGE_LAST,
        buffer,
        'chat message last',
       );
      else this.sendTCPPacket(socket, CHAT_MESSAGE, buffer, 'chat message');
     } else if (tcpPakcet.pktType === CHECKSUM_ERROR) {
      if (tries < MAX_TRIES) {
       tries++;
       reset();
       console.log('Cehcksum failed retrying to send message');
       this.sendTCPPacket(socket, CHAT_MESSAGE_RESET, null, 'reset everything');
       return;
      }
      console.log('Failed to send chat message retry after some time');
      //ending current connection
      socket.end();
     } else {
      throw new Error('Unhandled tcp packet type');
     }
    } catch (error) {
     console.log('Invalid tcp packet from the server', error);
     socket.end();
     reject('Failed to send message');
    }
   });
   const reset = () => {
    sindex = 0;
    eindex = 0;
   };
  });
 }

 private generateBufferChunk(
  message: string,
  startIdx: number,
 ): [string, number] {
  let bufferSreamLength = 0;
  let string = '';
  let idx = startIdx;
  let size = 0;
  while (bufferSreamLength < 5000 && idx < message.length) {
   size = Buffer.byteLength(message[idx], 'utf8');
   if (size + bufferSreamLength <= 5000) {
    bufferSreamLength += size;
    string += message[idx];
    idx++;
   } else {
    break;
   }
  }
  return [string, idx];
 }

 private parseToJson(data: string): Promise<tcpPacket> {
  return new Promise<tcpPacket>((resolve, reject) => {
   try {
    const tcpPacket = JSON.parse(data);
    resolve(tcpPacket);
   } catch (error) {
    reject(error);
   }
  });
 }

 private generateChunkHash(chunk: string): string {
  let hash = crypto.createHash('sha256');
  hash.update(chunk);
  return hash.digest().toString();
 }
}
