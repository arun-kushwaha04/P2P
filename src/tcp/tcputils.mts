import { Socket } from 'net';
import crypto from 'crypto';

import { USER_ID, USER_NAME, UDP_SERVER } from '../server.mjs';
import { tcpPacket } from './tcp.mjs';

//send a tcp packet from the open socket
export const sendTCPPacket = (
 socket: Socket,
 pktType: number,
 buffer: string | null,
 message: string,
 hash: string | null = null,
): boolean => {
 return socket.write(
  genreateTcpPktToStr(pktType, buffer, message, hash),
  () => {
   socket.end();
  },
 );
};
const genreateTcpPktToStr = (
 pktType: number,
 data: any,
 message: string,
 hash: string | null = null,
): string => {
 const objToSend: tcpPacket = {
  pktType,
  clientId: USER_ID,
  clientUserName: USER_NAME!,
  clientIPAddr: UDP_SERVER.MY_IP_ADDRESS,
  payload: { data, message, checksum: hash },
  currTime: new Date(),
 };
 return JSON.stringify(objToSend);
};

export const parseToJson = (data: string): Promise<tcpPacket> => {
 return new Promise<tcpPacket>((resolve, reject) => {
  try {
   const tcpPacket = JSON.parse(data);
   resolve(tcpPacket);
  } catch (error) {
   reject(error);
  }
 });
};

export const generateChunkHash = (chunk: string): string => {
 let hash = crypto.createHash('sha256');
 hash.update(chunk);
 return hash.digest().toString();
};
