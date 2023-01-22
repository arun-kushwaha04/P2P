//fuctions for tcp server

import { Socket } from 'net';
import {
 CHAT_MESSAGE,
 CHAT_MESSAGE_LAST,
 CHAT_MESSAGE_NEXT,
 CHAT_MESSAGE_RESET,
 CHECKSUM_ERROR,
 TCP_PACKET_ERROR,
 TCP_PACKET_RECEVIED,
} from '../constant.mjs';
import { generateChunkHash, parseToJson, sendTCPPacket } from './tcputils.mjs';
import chalk from 'chalk';

export async function dataListenerServer(
 data: Buffer,
 getChatMessage: () => string | null,
 setChatMessage: (msg: string | null) => void,
 setClientName: (name: string) => void,
 socket: Socket,
) {
 //tcp packet sent by client
 let packetObjRecevied = await parseToJson(data.toString());

 //chekcing the tcp packet type using the pktType param
 if (packetObjRecevied.pktType === CHAT_MESSAGE) {
  //this means first pkt of message recevied, requesting client to send other pkt
  sendTCPPacket(
   socket,
   CHAT_MESSAGE_NEXT,
   null,
   'request for next chat message',
  );
  //updating chat message
  setChatMessage(packetObjRecevied.payload?.data);
 } else if (packetObjRecevied.pktType === CHAT_MESSAGE_LAST) {
  //last packet of client's message recevied.
  //updating chat message and client name
  setChatMessage(packetObjRecevied.payload?.data);
  setClientName(packetObjRecevied.clientUserName);

  //gnerating sha 256 hash from message recevied
  const genreatedHash = generateChunkHash(getChatMessage() as string);
  if (genreatedHash === packetObjRecevied.payload?.checksum) {
   //hash mactched, requesting client to close the socket connection
   sendTCPPacket(socket, TCP_PACKET_RECEVIED, null, 'recevied chat message');
  } else {
   //hash mismatched requesting client to resend the message
   setChatMessage(null);
   sendTCPPacket(socket, CHECKSUM_ERROR, null, 'message hash not matched');
  }
 } else if (packetObjRecevied.pktType === CHAT_MESSAGE_RESET) {
  //this means client is trying to resend the message, resetting everything on server side.
  setChatMessage(null);
  sendTCPPacket(
   socket,
   CHAT_MESSAGE_NEXT,
   null,
   'request for next chat message',
  );
 } else {
  // this means packet send by client is of invalid encoding
  setChatMessage(null);
  sendTCPPacket(socket, TCP_PACKET_ERROR, null, 'invalid protocol used');
 }
}

export async function closeListenerServer(
 error: boolean,
 socket: Socket,
 getChatMessage: () => void,
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
 if (getChatMessage) {
  console.log(
   chalk.bgMagenta('Message from client'),
   chalk.yellow(getClientName()),
   chalk.blue(getChatMessage()),
  );
 }
 if (error) {
  console.log('Socket was closed because of transmission error');
 }
}
