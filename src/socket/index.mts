import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { SOCKET_SERVER_PORT } from '../utils/constant.mjs';
import { BROADCAST_ADDR, UDP_SERVER } from '../server.mjs';

import { namespace } from '../files/index.mjs';

export class SocketServer {
 private io: Server;
 private socket: Socket | null = null;
 constructor() {
  const app = express();
  const server = http.createServer(app);
  this.io = new Server(server, {
   cors: {
    origin: '*',
    methods: ['GET', 'POST'],
   },
  });

  app.get('/', (req, res) => {
   res.send(`Server running on ${SOCKET_SERVER_PORT}`);
  });

  this.intializeSocket();

  server.listen(SOCKET_SERVER_PORT, () => {
   console.log('Socket server listening');
  });
 }

 private intializeSocket = () => {
  this.io.on('connection', (socket) => {
   this.socket = socket;
   console.log('Web client connected');
   socket.emit('connection_succeed');

   //search a file event
   socket.on('search_file', ({ fileName }) => {
    UDP_SERVER.sendFileSearchQuery(fileName, BROADCAST_ADDR);
   });
  });
 };

 public sendFileSearchResponse = (data: namespace.FileInfoInterface) => {
  if (this.socket !== null) {
   this.socket.emit('search_file_result', data);
  }
 };
}
