import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { SOCKET_SERVER_PORT } from '../utils/constant.mjs';

export class SocketServer {
 private io: Server;
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
   console.log('Web client connected');
   socket.emit('connection_succeed');
   socket.on('search_query', (data) => {
    console.log(data);
   });
  });
 };
}
