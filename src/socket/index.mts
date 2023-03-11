import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { CHAT_MESSAGE, SOCKET_SERVER_PORT } from '../utils/constant.mjs';
import {
 ACTIVE_DOWNLOADS,
 BROADCAST_ADDR,
 FILE_MANAGER,
 TCP_SERVER,
 UDP_SERVER,
 startDownload,
} from '../server.mjs';

import { namespace } from '../files/index.mjs';
import { DownloadInfo, Downloader } from '../downloader/downloader.mjs';
import fileModel from '../files/fileModel.mjs';
import fs from 'fs';

export class SocketServer {
 private io: Server;
 public socket: Socket | null = null;
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

  app.get('/stream/:hashId', async (req, res) => {
   const fileInfo = await fileModel.findOne({ fileHash: req.params.hashId });

   if (!fileInfo) {
    res.status(404).json({ message: 'Bad Request' });
   }

   const videoPath = fileInfo?.filePath!;
   const videoSize = parseInt(fileInfo?.fileSize!);
   const videoFileType = fileInfo?.fileMimeType;

   if (!videoFileType!.includes('video')) {
    if (!fileInfo) {
     res.status(404).json({ message: 'Can only stream video files' });
    }
   }

   const range = req.headers.range;
   const chunkSize = 1024 * 1024 * 5; //5mb
   const start = Number(range?.replace(/\D/g, ''));
   const end = Math.min(start + chunkSize, videoSize - 1);

   const contentLength = end - start + 1;

   const headers = {
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    'Content-Type': videoFileType,
   };
   res.writeHead(206, headers);

   const stream = fs.createReadStream(videoPath, { start, end });
   stream.pipe(res);
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

   //get shared resources
   socket.on('get_shared_resources', async ({ limit, pageNumber }) => {
    console.log('Getting Shared Resources');
    const sharedResources = await fileModel
     .find()
     .limit(limit)
     .skip(pageNumber * limit);
    socket.emit('shared_resources', sharedResources);
   });

   //share resources
   socket.on('share_resource', async ({ filePath }) => {
    await FILE_MANAGER.shareFile(filePath);
    socket.emit('resource_shared');
   });

   //unshare resources
   socket.on('unshare_resources', async ({ id }) => {
    console.log('Getting Shared Resources');
    const sharedResources = await fileModel.findOneAndDelete({ _id: id });
    socket.emit('resource_unshared', sharedResources);
   });

   //emit active users
   socket.on('get_active_users', () => {
    console.log('Getting active users');
    socket.emit('active_users', {
     activeUsers: Object.fromEntries(UDP_SERVER.ACTIVE_USERS),
    });
   });

   //send chat message
   socket.on('send_chat_message', ({ message, receiver }) => {
    console.log('Send Chat Message');
    TCP_SERVER.sendMessage(message, receiver, CHAT_MESSAGE);
    socket.emit('message_sent');
   });

   //search peer by filehash
   socket.on('search_peer_filehash', async ({ fileHash }) => {
    console.log('Searching peer for file hash: ' + fileHash);
    UDP_SERVER.sendFileSearchHash(fileHash, 'socket', BROADCAST_ADDR);
    const file = await fileModel.findOne({ fileHash: fileHash });
    if (file) {
     socket.emit('peer_filehash', {
      peerIpAddr: UDP_SERVER.MY_IP_ADDRESS,
      fileHash: fileHash,
     });
    }
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
