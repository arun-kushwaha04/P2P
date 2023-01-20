import { v4 as uuidv4 } from 'uuid';
import { exit } from 'process';
import { UDPSever } from './udp';
import { TCPserver } from './tcp';

export const BROADCAST_ADDR = '172.17.255.255';
export const USER_NAME: string | null | undefined = process.argv[2];
export const USER_ID = uuidv4();

if (!USER_NAME) {
 throw new Error('Pass argument for username');
 exit(-1);
}

//creating a UDP server
const UDP_SERVER = new UDPSever(BROADCAST_ADDR, USER_NAME, USER_ID);

//creating a TCP server
const TCP_SERVER = new TCPserver(USER_NAME, USER_ID);
//handling server close cases
async function exitHandler(options: any, exitCode: any) {
 await UDP_SERVER.sendLastPacket();
 await TCP_SERVER.closeTCPServer();
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
