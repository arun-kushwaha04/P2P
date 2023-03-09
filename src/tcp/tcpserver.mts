//fuctions for tcp server

import { Socket } from 'net';
import { Worker } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import {
 TCP_MESSAGE,
 TCP_MESSAGE_LAST,
 TCP_MESSAGE_NEXT,
 TCP_MESSAGE_RESET,
 CHECKSUM_ERROR,
 TCP_PACKET_ERROR,
 TCP_PACKET_RECEVIED,
 CHAT_MESSAGE,
 FILE_SEARCH_RESULT,
 FILE_CHUNK,
} from '../utils/constant.mjs';
import { generateChunkHash, parseToJson, sendTCPPacket } from './tcputils.mjs';
import chalk from 'chalk';
import { ACTIVE_DOWNLOADS, FILE_MANAGER } from '../server.mjs';
import { Downloader } from '../downloader/downloader.mjs';

export async function dataListenerServer(
 data: Buffer,
 getTcpMessage: () => string | null,
 setTcpMessage: (msg: string | null) => void,
 setClientName: (name: string) => void,
 setClientIPAddr: (ipAddr: string) => void,
 socket: Socket,
) {
 //tcp packet sent by client
 let packetObjRecevied = await parseToJson(data.toString());

 //chekcing the tcp packet type using the pktType param
 if (packetObjRecevied.pktType === TCP_MESSAGE) {
  //this means first pkt of message recevied, requesting client to send other pkt
  sendTCPPacket(
   socket,
   TCP_MESSAGE_NEXT,
   null,
   'request for next chat message',
  );
  //updating chat message
  setTcpMessage(packetObjRecevied.payload?.data);
 } else if (packetObjRecevied.pktType === TCP_MESSAGE_LAST) {
  //last packet of client's message recevied.
  //updating chat message and client name
  setTcpMessage(packetObjRecevied.payload?.data);
  setClientName(packetObjRecevied.clientUserName);
  setClientIPAddr(packetObjRecevied.clientIPAddr);

  //gnerating sha 256 hash from message recevied
  const genreatedHash = generateChunkHash(getTcpMessage() as string);
  if (genreatedHash === packetObjRecevied.payload?.checksum) {
   //hash mactched, requesting client to close the socket connection
   sendTCPPacket(socket, TCP_PACKET_RECEVIED, null, 'recevied tcp message');
  } else {
   //hash mismatched requesting client to resend the message
   setTcpMessage(null);
   sendTCPPacket(socket, CHECKSUM_ERROR, null, 'message hash not matched');
  }
 } else if (packetObjRecevied.pktType === TCP_MESSAGE_RESET) {
  //this means client is trying to resend the message, resetting everything on server side.
  setTcpMessage(null);
  sendTCPPacket(
   socket,
   TCP_MESSAGE_NEXT,
   null,
   'request for next chat message',
  );
 } else {
  // this means packet send by client is of invalid encoding
  setTcpMessage(null);
  sendTCPPacket(socket, TCP_PACKET_ERROR, null, 'invalid protocol used');
 }
}

export async function closeListenerServer(
 error: boolean,
 socket: Socket,
 getClientIPAddr: () => string,
 getTcpMessage: () => void,
 getClientName: () => void,
) {
 //data read and written by current socket
 let bread = socket.bytesRead;
 let bwrite = socket.bytesWritten;
 console.log(
  chalk.green('Bytes read : ' + bread),
  chalk.green('Bytes written : ' + bwrite),
  chalk.green('Socket closed!'),
 );
 //consoling the chat message to user
 //TODO: show this on ui
 //TODO: handle type of message here
 if (getTcpMessage) {
  //handling the message
  let message;
  try {
   message = JSON.parse(getTcpMessage()!);
  } catch (error) {
   console.log(error);
   //TODO: send a message to restart that download
   return;
  }
  // console.log(message);
  const messageObj = message;
  if (messageObj.type === CHAT_MESSAGE) {
   console.log(
    chalk.bgMagenta('Message from client'),
    chalk.yellow(getClientName()),
   );
   console.log(messageObj.message);
  } else if (messageObj.type === FILE_SEARCH_RESULT) {
   console.log(
    chalk.bgMagenta('File search result from client'),
    chalk.yellow(getClientName()),
   );
   if (FILE_MANAGER.searchRunning()) {
    FILE_MANAGER.handleFileSearchResult(messageObj.message, getClientIPAddr());
   }
  } else if (messageObj.type === FILE_CHUNK) {
   if (!ACTIVE_DOWNLOADS[messageObj.message.downloaderId]) return;
   const worker = new Worker('./dist/workers/writeFileChunck.mjs', {
    workerData: {
     chunckNumber: messageObj.message.chunckNumber,
     fileBuffer: messageObj.message.fileBuffer,
     fileName: messageObj.message.fileName,
    },
   });
   worker.on('message', (msg) => {
    console.log(msg);
    return;
   });
   worker.on('error', (msg) => {
    console.log(msg);
    return;
   });
   worker.on('exit', () => {
    (
     ACTIVE_DOWNLOADS[messageObj.message.downloaderId] as Downloader
    ).handleReceviedChunk(messageObj.message.chunckNumber);
    console.log('write worker exit');
   });
  }
 }
 if (error) {
  console.log('Socket was closed because of transmission error');
 }
}
