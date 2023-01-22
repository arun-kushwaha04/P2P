import { Socket } from 'net';
import {
 CHAT_MESSAGE,
 CHAT_MESSAGE_LAST,
 CHAT_MESSAGE_NEXT,
 CHAT_MESSAGE_RESET,
 CHECKSUM_ERROR,
 MAX_TRIES,
 TCP_PACKET_ERROR,
 TCP_PACKET_RECEVIED,
} from '../constant.mjs';
import { generateChunkHash, parseToJson, sendTCPPacket } from './tcputils.mjs';
import { tcpPacket } from './tcp.mjs';

//send message intially
export function sendMessageChunk(
 socket: Socket,
 message: string,
 sindex: number,
 incrTries: () => void,
 seteIndex: (num: number) => void,
): void {
 //increase tries count,
 incrTries();
 let buffer: string;
 let eindex: number;

 //getting the buffer stirng to send and last index
 [buffer, eindex] = generateBufferChunk(message, sindex);
 seteIndex(eindex);

 //chekcing for last data packet of the message
 if (eindex === message.length)
  sendTCPPacket(
   socket,
   CHAT_MESSAGE_LAST,
   buffer,
   'chat message last',
   generateChunkHash(message),
  );
 else sendTCPPacket(socket, CHAT_MESSAGE, buffer, 'chat message');
}

export async function dataListenerClient(
 data: string,
 socket: Socket,
 sindex: number,
 leindex: number,
 message: string,
 resolve: (value: string | PromiseLike<string>) => void,
 reject: (reason?: any) => void,
 setsIndex: (num: number) => void,
 incrTries: () => void,
 seteIndex: (num: number) => void,
 getTries: () => number,
): Promise<void> {
 try {
  //getting tcp packet recevied from server
  const tcpPakcet: tcpPacket = await parseToJson(data);

  //server recevied correct packet
  if (tcpPakcet.pktType === TCP_PACKET_RECEVIED) {
   socket.end();
   resolve('Message sent successfully');
  }
  //error occured in sending on tcp packet
  else if (tcpPakcet.pktType === TCP_PACKET_ERROR) {
   socket.end();
   //TODO: update ui
  }
  //server requesting for next tcp packet
  else if (tcpPakcet.pktType === CHAT_MESSAGE_NEXT) {
   setsIndex(leindex);
   sendMessageChunk(socket, message, sindex, incrTries, seteIndex);
  }
  //server recevied altered packet
  else if (tcpPakcet.pktType === CHECKSUM_ERROR) {
   if (getTries() < MAX_TRIES) {
    incrTries();
    seteIndex(0);
    setsIndex(0);
    console.log('Cehcksum failed retrying to send message');
    //telling server to reset everything on it side.
    sendTCPPacket(socket, CHAT_MESSAGE_RESET, null, 'reset everything');
   }
   //tried MAX_TRIES but failed to send the message
   console.log('Failed to send chat message retry after some time');
   //ending current connection
   socket.end();
  } else {
   //server sent a packet of unhandled type
   throw new Error('Unhandled tcp packet type');
   //TODO: some thinking on this part
  }
 } catch (error) {
  //error occured in parsing string to json
  console.log('Invalid tcp packet from the server', error);
  socket.end();
  reject('Failed to send message');
 }
}

export function generateBufferChunk(
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
