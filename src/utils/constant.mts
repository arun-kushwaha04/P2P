import os from 'os';
//defining server contantas here

//application constants
export const UDP_SERVER_PORT: number = 1050;
export const TCP_SERVER_PORT: number = 1150;
export const TCP_PACKET_SIZE: number = 5000;
export const MAX_TRIES: number = 5;
export const FILE_SEARCH_RESULT: number = 23543;
export const CHAT_MESSAGE: number = 2342;
export const FILE_CHUNK: number = 3456;
export const CHUNK_TRANSFERED: number = 10 * 1024 * 1024;
export const MAX_TCP_CONNECTIONS: number = 20;
export const MAX_FILE_TRANSFERS: number = 5;
export const HEART_BEAT_GAP = 60 * 1000; //1 min
export const TEMP_FOLDER: string = `${os.homedir()}/P2P/temp`;
export const DOWNLOAD_FOLDER: string = `${os.homedir()}/P2P/downloads`;
export const LOGS: string = `${os.homedir()}/P2P/logs`;

//udp packets constants
export const UDP_PING: number = 1;
export const UDP_PONG: number = 2;
export const CLOSING_PEER: number = 3;
export const FILE_SEARCH_QUERY: number = 4;
export const FILE_CHUNK_REQUEST: number = 5;
export const FILE_SEARCH_HASH: number = 6;
export const FILE_SEARCH_HASH_RESPONSE: number = 7;
export const DOWNLOADS_CHOKED: number = 8;
export const UDP_HEART_BEAT: number = 9;

//tcp packets constants
export const TCP_PACKET_RECEVIED: number = 1;
export const TCP_PACKET_ERROR: number = 2;
export const TCP_MESSAGE: number = 3;
export const TCP_MESSAGE_NEXT: number = 4;
export const TCP_MESSAGE_LAST: number = 5;
export const TCP_MESSAGE_RESET: number = 6;
export const CHECKSUM_ERROR: number = 7;

export const delay = (ms: number) =>
 new Promise((resolve) => setTimeout(resolve, ms));
