let dgram = require('dgram');
const { exit } = require('process');

const UDP_SERVER_PORT = 10500;
const UDP_CLIENT_PORT = 11500;
const BROADCAST_ADDR = '192.168.65.255';
// const BROADCAST_ADDR = '172.17.255.255';
const USER_NAME = process.argv[2];

if (!USER_NAME) {
 throw new Error('Pass argument for username');
 exit - 1;
}

const ACTIVE_USERS = {};
let MY_IP_ADDRESS;

//this protcol transfer data in form of valid json objects stringified as strings.
//sampleJsonObj = {
// pktType: 'NEW_CONNECTION' denotes type of packet,
// clientId: USER_NAME, unique username of client sending the packet
// currTime: new Date().getTime(), time when the packet was sended
// payload: null, packet metadata
// }

function createUDPServer() {
 // this server will only send broadcast message
 // NEW_PEER
 // CLOSING_PEER
 // FILE_SEARCH_QUERY
 let server = dgram.createSocket('udp4');

 server.bind(UDP_SERVER_PORT, () => {
  console.log('UDP server running', "Peer's username -", USER_NAME);
  server.setBroadcast(true);
 });

 return server;
}

function createUDPClient() {
 // this client will handle all incoming UDP request
 // NEW_PEER
 // CLOSING_PEER
 // FILE_SEARCH_QUERY
 let client = dgram.createSocket('udp4');

 client.bind(UDP_CLIENT_PORT, () => {
  console.log('UDP client running', "Peer's username -", USER_NAME);
  server.setBroadcast(true);
 });
 return client;
}

const UDP_SERVER = createUDPServer();
// const UDP_CLIENT = createUDPClient();

// adding handler to handle request on udp server port
UDP_SERVER.on('message', async (message, rinfo) => {
 //handling type of packet
 let packetObjRecevied;
 try {
  packetObjRecevied = await JSON.parse(message);
 } catch (error) {
  throw new Error('Invalid json packet recevied');
 }

 if (packetObjRecevied.pktType === 'NEW_PEER') {
  //adding the new client to active user object
  if (packetObjRecevied.clientId === USER_NAME) {
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
   clientId: packetObjRecevied.clientId,
   ipAddress: rinfo.address,
  };
  sendPong(UDP_SERVER, rinfo.address);
 } else if (packetObjRecevied.pktType === 'UDP_PONG') {
  console.log(
   'New peer found in network',
   "Peer's username - ",
   packetObjRecevied.clientId,
   rinfo.address,
  );
  ACTIVE_USERS[packetObjRecevied.clientId] = {
   clientId: packetObjRecevied.clientId,
   ipAddress: rinfo.address,
  };
 } else if (packetObjRecevied.pktType === 'CLOSING_PEER') {
  //removig the client form active user object
  if (packetObjRecevied.clientId !== USER_NAME) {
   console.log(
    'A peer is leaving the netwrok',
    "Peer's username - ",
    packetObjRecevied.clientId,
    rinfo.address,
   );
   delete ACTIVE_USERS[packetObjRecevied.clientId];
  }
 } else if (packetObjRecevied.pktType === 'FILE_SEARCH_QUERY') {
  //TODO:
 } else {
  throw new Error('Invalid packet recevied');
 }
 return;
});

UDP_SERVER.on('listening', () => {
 sendNewConnectionMessage(UDP_SERVER);
});

UDP_SERVER.on('close', () => {
 sendClosingConnectionMessage(UDP_SERVER);
});

const sendNewConnectionMessage = (server) => {
 // this function for sending new connection notification to the network
 const objToSend = {
  pktType: 'NEW_PEER',
  clientId: USER_NAME,
  currTime: new Date().getTime(),
  payload: null,
 };
 const message = JSON.stringify(objToSend);

 const bufferMessage = Buffer.from(message);

 server.send(
  bufferMessage,
  0,
  bufferMessage.length,
  UDP_SERVER_PORT,
  BROADCAST_ADDR,
  () => {
   console.log('NEW_PEER event sent to the network');
  },
 );
};

const sendClosingConnectionMessage = (server) => {
 // this function for sending new connection notification to the network
 return new Promise((resolve, reject) => {
  const objToSend = {
   pktType: 'CLOSING_PEER',
   clientId: USER_NAME,
   currTime: new Date().getTime(),
   payload: null,
  };
  const message = JSON.stringify(objToSend);

  const bufferMessage = Buffer.from(message);

  try {
   server.send(
    bufferMessage,
    0,
    bufferMessage.length,
    UDP_SERVER_PORT,
    BROADCAST_ADDR,
    () => {
     console.log('CLOSING_PEER event sent to the network');
    },
   );
   resolve('Sent');
  } catch (error) {
   reject(error);
  }
 });
};

const sendPong = (server, peerIPAddr) => {
 const objToSend = {
  pktType: 'UDP_PONG',
  clientId: USER_NAME,
  currTime: new Date().getTime(),
  payload: null,
 };

 const message = JSON.stringify(objToSend);

 const bufferMessage = Buffer.from(message);

 server.send(
  bufferMessage,
  0,
  bufferMessage.length,
  UDP_SERVER_PORT,
  peerIPAddr,
 );
};

//handling server close cases
async function exitHandler(options, exitCode) {
 await sendClosingConnectionMessage(UDP_SERVER);
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
