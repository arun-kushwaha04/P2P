import dgram, { Socket, RemoteInfo } from 'dgram';
import { exit } from 'process';
import { v4 as uuidv4 } from 'uuid';

//file imports
import {
 UDP_SERVER_PORT,
 UDP_PING,
 UDP_PONG,
 CLOSING_PEER,
 FILE_SEARCH_QUERY,
} from './constant';

const BROADCAST_ADDR = '172.17.255.255';
const USER_NAME: string | null | undefined = process.argv[2];
const USER_ID = uuidv4();

if (!USER_NAME) {
 throw new Error('Pass argument for username');
 exit(-1);
}

interface peerInfo {
 ipAddr: String;
 clientId: String;
 peerUserName: String;
}

interface activeUserObject {
 [key: string]: peerInfo;
}

interface udpPacket {
 pktType: number;
 clientId: string;
 clientUserName: string;
 payload: null;
 currTime: Date;
 ipInfo: {
  senderPort: number;
  senderIpAddr: string;
  clientPort: number;
  clientIpAddr: string;
 };
}

const ACTIVE_USERS: activeUserObject = {};
let MY_IP_ADDRESS: string;

//this protcol transfer data in form of valid json objects stringified as strings.
//sampleJsonObj = {
// pktType: 'NEW_CONNECTION' denotes type of packet,
// clientId: USER_NAME, unique username of client sending the packet
// currTime: new Date().getTime(), time when the packet was sended
// payload: null, packet metadata
// }

function createUDPServer() {
 // this server will only send broadcast message
 // UDP_PING
 // UDP_PONG
 // CLOSING_PEER
 // FILE_SEARCH_QUERY
 let server: Socket = dgram.createSocket('udp4');

 server.bind(UDP_SERVER_PORT, () => {
  console.log('UDP server running', "Peer's username -", USER_NAME);
  server.setBroadcast(true);
 });

 return server;
}

// function createUDPClient() {
//  // this client will handle all incoming UDP request
//  // NEW_PEER
//  // CLOSING_PEER
//  // FILE_SEARCH_QUERY
//  let client = dgram.createSocket('udp4');

//  client.bind(UDP_CLIENT_PORT, () => {
//   console.log('UDP client running', "Peer's username -", USER_NAME);
//   server.setBroadcast(true);
//  });
//  return client;
// }

const UDP_SERVER: Socket = createUDPServer();

// adding handler to handle request on udp server port
UDP_SERVER.on('message', async (message: string, rinfo: RemoteInfo) => {
 //handling type of packet
 let packetObjRecevied: udpPacket;
 try {
  packetObjRecevied = await JSON.parse(message);
 } catch (error) {
  throw new Error('Invalid json packet recevied');
 }

 if (packetObjRecevied.pktType === UDP_PING) {
  //adding the new client to active user object
  if (packetObjRecevied.clientId === USER_ID) {
   MY_IP_ADDRESS = rinfo.address;
   return;
  }
  console.log(
   'New peer connected to network',
   "Peer's username - ",
   packetObjRecevied.clientId,
   rinfo.address,
  );
  ACTIVE_USERS[packetObjRecevied.clientId] = {
   peerUserName: packetObjRecevied.clientUserName,
   clientId: packetObjRecevied.clientId,
   ipAddr: rinfo.address,
  };
  sendPong(rinfo.address);
 } else if (packetObjRecevied.pktType === UDP_PONG) {
  console.log(
   'New peer found in network',
   "Peer's username - ",
   packetObjRecevied.clientId,
   rinfo.address,
  );
  ACTIVE_USERS[packetObjRecevied.clientId] = {
   peerUserName: packetObjRecevied.clientUserName,
   clientId: packetObjRecevied.clientId,
   ipAddr: rinfo.address,
  };
 } else if (packetObjRecevied.pktType === CLOSING_PEER) {
  //removig the client form active user object
  if (packetObjRecevied.clientId !== USER_ID) {
   console.log(
    'A peer is leaving the netwrok',
    "Peer's username - ",
    packetObjRecevied.clientId,
    rinfo.address,
   );
   delete ACTIVE_USERS[packetObjRecevied.clientId];
  }
 } else if (packetObjRecevied.pktType === FILE_SEARCH_QUERY) {
  //TODO:
 } else {
  throw new Error('Invalid packet recevied');
 }
 return;
});

UDP_SERVER.on('listening', () => {
 sendPing();
});

UDP_SERVER.on('close', () => {
 sendLastPacket();
});

const sendPing = () => {
 // this function for sending new connection notification to the network
 const objToSend: udpPacket = {
  pktType: UDP_PING,
  clientId: USER_ID,
  clientUserName: USER_NAME,
  currTime: new Date(),
  payload: null,
  ipInfo: {
   senderPort: UDP_SERVER_PORT,
   senderIpAddr: MY_IP_ADDRESS,
   clientPort: UDP_SERVER_PORT,
   clientIpAddr: BROADCAST_ADDR,
  },
 };
 sendUdpPacket(objToSend, () => {
  console.log('NEW_PEER event sent to the network');
 });
};

const sendLastPacket = () => {
 // this function for sending new connection notification to the network
 return new Promise((resolve, reject) => {
  const objToSend: udpPacket = {
   pktType: CLOSING_PEER,
   clientId: USER_ID,
   clientUserName: USER_NAME,
   currTime: new Date(),
   payload: null,
   ipInfo: {
    senderPort: UDP_SERVER_PORT,
    senderIpAddr: MY_IP_ADDRESS,
    clientPort: UDP_SERVER_PORT,
    clientIpAddr: BROADCAST_ADDR,
   },
  };

  try {
   sendUdpPacket(objToSend, () => {
    console.log('CLOSING_PEER event sent to the network');
   });
   resolve('Sent');
  } catch (error) {
   reject('Failed to send CLOSING_PEER packet');
   throw new Error(`Failed to send CLOSING_PEER packet /n ${error}`);
  }
 });
};

const sendPong = (peerIPAddr: string) => {
 const objToSend: udpPacket = {
  pktType: UDP_PONG,
  clientId: USER_ID,
  clientUserName: USER_NAME,
  currTime: new Date(),
  payload: null,
  ipInfo: {
   senderPort: UDP_SERVER_PORT,
   senderIpAddr: MY_IP_ADDRESS,
   clientPort: UDP_SERVER_PORT,
   clientIpAddr: peerIPAddr,
  },
 };
 sendUdpPacket(objToSend);
};

//send message
const sendUdpPacket = (
 packet: udpPacket,
 callback: () => void = () => {},
): void => {
 const message: String = JSON.stringify(packet);
 const bufferMessage: Buffer = Buffer.from(message);

 UDP_SERVER.send(
  bufferMessage,
  0,
  bufferMessage.length,
  packet.ipInfo.clientPort,
  packet.ipInfo.clientIpAddr,
  callback,
 );
};

//handling server close cases
async function exitHandler(options: any, exitCode: any) {
 await sendLastPacket();
 if (options.cleanup) console.log('clean');
 if (exitCode || exitCode === 0) console.log(exitCode);
 if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
