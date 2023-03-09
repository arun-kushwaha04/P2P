import { Socket } from 'net';
import {
 TCP_MESSAGE,
 TCP_MESSAGE_LAST,
 TCP_MESSAGE_NEXT,
 TCP_MESSAGE_RESET,
 CHECKSUM_ERROR,
 MAX_TRIES,
 TCP_PACKET_ERROR,
 TCP_PACKET_RECEVIED,
 TCP_PACKET_SIZE,
} from '../utils/constant.mjs';
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

 console.log('message length index chekck', sindex, eindex);
 //chekcing for last data packet of the message
 if (eindex === message.length)
  sendTCPPacket(
   socket,
   TCP_MESSAGE_LAST,
   buffer,
   'chat message last',
   generateChunkHash(message),
  );
 else sendTCPPacket(socket, TCP_MESSAGE, buffer, 'chat message');
}

export async function dataListenerClient(
 data: string,
 socket: Socket,
 message: string,
 resolve: (value: string | PromiseLike<string>) => void,
 reject: (reason?: any) => void,
 setsIndex: (num: number) => void,
 incrTries: () => void,
 seteIndex: (num: number) => void,
 getTries: () => number,
 getSIndex: () => number,
 getEIndex: () => number,
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
  else if (tcpPakcet.pktType === TCP_MESSAGE_NEXT) {
   setsIndex(getEIndex());
   sendMessageChunk(socket, message, getSIndex(), incrTries, seteIndex);
  }
  //server recevied altered packet
  else if (tcpPakcet.pktType === CHECKSUM_ERROR) {
   if (getTries() < MAX_TRIES) {
    incrTries();
    seteIndex(0);
    setsIndex(0);
    console.log('Cehcksum failed retrying to send message');
    //telling server to reset everything on it side.
    sendTCPPacket(socket, TCP_MESSAGE_RESET, null, 'reset everything');
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
 while (bufferSreamLength < TCP_PACKET_SIZE && idx < message.length) {
  //as utf-8 encoding used so a char can be 4 bytes long
  size = Buffer.byteLength(message[idx], 'utf8');
  if (size + bufferSreamLength <= TCP_PACKET_SIZE) {
   bufferSreamLength += size;
   string += message[idx];
   idx++;
  } else {
   break;
  }
 }
 //return idx as new starting index as we already icnreased it
 return [string, idx];
}
