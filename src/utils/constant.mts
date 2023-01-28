import path from 'path';
//defining server contantas here

//application constants
export const UDP_SERVER_PORT: number = 1050;
export const TCP_SERVER_PORT: number = 1150;
export const TCP_PACKET_SIZE: number = 5000;
export const MAX_TRIES: number = 5;
export const FILE_SEARCH_RESULT: number = 6;
export const CHAT_MESSAGE: number = 7;

//udp packets constants
export const UDP_PING: number = 1;
export const UDP_PONG: number = 2;
export const CLOSING_PEER: number = 3;
export const FILE_SEARCH_QUERY: number = 4;

//tcp packets constants
export const TCP_PACKET_RECEVIED: number = 1;
export const TCP_PACKET_ERROR: number = 2;
export const TCP_MESSAGE: number = 3;
export const TCP_MESSAGE_NEXT: number = 4;
export const TCP_MESSAGE_LAST: number = 5;
export const TCP_MESSAGE_RESET: number = 6;
export const CHECKSUM_ERROR: number = 7;

//file constant
export const P2P_FOLDER = path.normalize('~/P2P');
export const P2P_FILE = path.normalize(`${P2P_FOLDER}/shared.json`);
export const TEMP_FOLDER = path.normalize('~/P2P/temp');
export const DOWNLOAD_FOLDER = path.normalize('~/P2P/downloads');
