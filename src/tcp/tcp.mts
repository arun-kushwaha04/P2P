//creating tcp connections for sending message between clinets
import net, { Server, Socket as TCPSocket } from 'net';
import chalk from 'chalk';

import { CHAT_MESSAGE, TCP_SERVER_PORT } from '../utils/constant.mjs';
import { closeListenerServer, dataListenerServer } from './tcpserver.mjs';
import { dataListenerClient, sendMessageChunk } from './tcpclient.mjs';
import { json } from 'stream/consumers';

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

 constructor() {
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

   let tcpMessage: string | null = null;
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
   socket.on('data', async (data) =>
    dataListenerServer(
     data,
     getTcpMessage,
     setTcpMessage,
     setClientName,
     setClientIPAddr,
     socket,
    ),
   );

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

   //will trigger when socket closes
   socket.on('close', async (error) => {
    closeListenerServer(
     error,
     socket,
     getClientIPAddr,
     getTcpMessage,
     getClientName,
    );
   });
  });
 }

 //client to send packet to tcp server
 public sendToTCPServer(message: string, clientIP: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
   let sindex = 0;
   let eindex = 0;
   let tries = 0;
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
     sendMessageChunk(socket, message, sindex, icnrTries, seteIndex);
    },
   );
   socket.setEncoding('utf8');
   socket.on('data', async (data: string) => {
    dataListenerClient(
     data,
     socket,
     message,
     resolve,
     reject,
     setsIndex,
     icnrTries,
     seteIndex,
     getTries,
     getSIndex,
     getEIndex,
    );
   });
  });
 }

 public async sendMessage(
  message: any,
  clientIpAddr: string,
  messageType: number,
 ) {
  let objToSend: TCPMessage = { message, type: messageType };
  const stringObj = JSON.stringify(objToSend);
  try {
   await this.sendToTCPServer(stringObj, clientIpAddr);
  } catch (error) {
   console.log(chalk.red('Failed to send chat message'));
  }
 }

 public closeTCPServer() {
  //this function is for closing the tcp server
  new Promise<void>((resolve, _) => {
   this.TCP_SERVER.close();
   console.log('Stopped tcp server ');
   resolve();
  });
 }
}
