//creating tcp connections for sending message between clinets
import net, { Server, Socket as TCPSocket } from 'net';

import {
 TCP_SERVER_PORT,
 TCP_PACKET_ERROR,
 TCP_PACKET_RECEVIED,
 CHAT_MESSAGE,
} from './constant';

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

   console.log(socket.remoteAddress, 'connected on TCP server');

   //setting encoding for socket
   socket.setEncoding('utf-8');

   //will tigger when a socket receives data
   //  socket.on('data', (data: Buffer) => {
   //   //receving data here
   //  });

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

   //will trigger at the end of data transfer
   socket.on('end', async (data: string) => {
    try {
     const tcpPakcet: tcpPacket = await this.parseToJson(data);
     console.log(tcpPakcet);
     this.sendTCPPacket(socket, TCP_PACKET_RECEVIED, null);
     //TODO: checksum here sendTCPPacket(socket, TCP_PACKET_ERROR, null);
    } catch (error) {
     this.sendTCPPacket(socket, TCP_PACKET_ERROR, null);
     throw new Error('Invalid packet type');
    }
   });

   socket.on('close', function (error) {
    let bread = socket.bytesRead;
    let bwrite = socket.bytesWritten;
    console.log(
     'Bytes read : ' + bread,
     'Bytes written : ' + bwrite,
     'Socket closed!',
    );
    if (error) {
     console.log('Socket was closed coz of transmission error');
    }
   });
  });
 }

 //send a tcp packet from the open socket
 public sendTCPPacket(
  socket: TCPSocket,
  pktType: number,
  payload: payload | null,
 ): void {
  const objToSend: tcpPacket = {
   pktType,
   clientId: this.USER_ID,
   clientUserName: this.USER_NAME!,
   payload: payload,
   currTime: new Date(),
  };
  const message: string = JSON.stringify(objToSend);
  let is_kernel_buffer_full: boolean = socket.write(message);
  if (!is_kernel_buffer_full) {
   socket.pause();
  }
  return;
 }

 public closeTCPServer() {
  //this function is for closing the tcp server
  new Promise<void>((resolve, _) => {
   this.TCP_SERVER.close();
   resolve();
  });
 }

 //client to send packet to tcp server
 private sendToTCPServer(payload: payload) {
  const socket: TCPSocket = net.connect({ port: TCP_SERVER_PORT }, () => {
   this.sendTCPPacket(socket, CHAT_MESSAGE, payload);
  });
  socket.on('data', async (data: string) => {
   try {
    const tcpPakcet: tcpPacket = await this.parseToJson(data);
    if (tcpPakcet.pktType === TCP_PACKET_RECEVIED) {
     // if packet recevied by server successfully
     socket.end();
    } else if (tcpPakcet.pktType === TCP_PACKET_ERROR) {
     //some error in sending the packet
     socket.end();
     //resending the packet to server
     this.sendToTCPServer(payload);
    } else {
     throw new Error('Unhandled tcp packet type');
    }
   } catch (error) {
    console.log('Invalid tcp packet from the server', error);
   }
   return;
  });
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
}
