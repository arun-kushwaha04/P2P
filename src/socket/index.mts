import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { SOCKET_SERVER_PORT } from '../utils/constant.mjs';
import {
 ACTIVE_DOWNLOADS,
 BROADCAST_ADDR,
 FILE_MANAGER,
 UDP_SERVER,
 startDownload,
} from '../server.mjs';

import { namespace } from '../files/index.mjs';
import { DownloadInfo, Downloader } from '../downloader/downloader.mjs';

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

   //start a file download
   socket.on('start_download', ({ fileHash }) => {
    startDownload(fileHash);
    console.log('Download started for filehash: ' + fileHash);
    socket.emit('download_started');
   });

   //send current download updates
   socket.on('get_active_downloads', () => {
    const downloadInfo: DownloadInfo[] = [];
    Object.keys(ACTIVE_DOWNLOADS).forEach((downloaderId) => {
     if (ACTIVE_DOWNLOADS[downloaderId] instanceof Downloader) {
      const download: Downloader = ACTIVE_DOWNLOADS[downloaderId] as Downloader;
      if (!download.isSubFile()) {
       downloadInfo.push(download.getDownloadInfo());
      }
     }
    });
    //sending active download info to web client
    socket.emit('active_download_info', downloadInfo);
   });

   //pausing a download
   socket.on('pause_download', ({ downloaderId }) => {
    if (ACTIVE_DOWNLOADS[downloaderId]) {
     const downloader = ACTIVE_DOWNLOADS[downloaderId] as Downloader;
     downloader.pauseDownloadAndSaveState(true);
     socket.emit('download_paused');
    }
   });

   //get paused downloads
   socket.on('get_paused_download', async () => {
    console.log('Getting paused downloads');
    const downloads = await FILE_MANAGER.getPausedDownloads();
    socket.emit('paused_download_info', downloads);
    return;
   });

   //disconnection of socket
   socket.on('disconnect', () => {
    this.socket = null;
    console.log('Web client disconnected');
   });
  });
 };

 public sendFileSearchResponse = (data: namespace.FileInfoInterface) => {
  if (this.socket !== null) {
   this.socket.emit('search_file_result', data);
  }
 };
}
