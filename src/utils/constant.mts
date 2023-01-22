//defining server contantas here

//application constans
export const UDP_SERVER_PORT: number = 10500;
export const UDP_CLIENT_PORT: number = 10501;
export const TCP_SERVER_PORT: number = 11500;
export const TCP_PACKET_SIZE: number = 5000;
export const MAX_TRIES: number = 5;

//udp packets constants
export const UDP_PING: number = 1;
export const UDP_PONG: number = 2;
export const CLOSING_PEER: number = 3;
export const FILE_SEARCH_QUERY: number = 4;

//tcp packets constants
export const TCP_PACKET_RECEVIED: number = 1;
export const TCP_PACKET_ERROR: number = 2;
export const CHAT_MESSAGE: number = 3;
export const CHAT_MESSAGE_NEXT: number = 4;
export const CHAT_MESSAGE_LAST: number = 5;
export const CHECKSUM_ERROR: number = 6;
export const CHAT_MESSAGE_RESET: number = 5;
