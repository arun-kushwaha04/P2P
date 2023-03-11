import socket from '../socketConfig';
import { notifyError, notifyInfo } from '../ToastNotification';

export const getPausedDownloads = (updatePausedDownloads) => {
 socket.emit('get_paused_download');

 socket.on('paused_download_info', (pausedDownloads) => {
  updatePausedDownloads(pausedDownloads);
  return;
 });
 return;
};

export const resumeDownload = (downloaderId) => {
 console.log(downloaderId);
 socket.emit('resume_download', { downloaderId });
 socket.on('download_resumed', () => {
  notifyInfo('Download resumed');
  return;
 });
 return;
};
