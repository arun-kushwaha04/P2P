import socket from '../socketConfig';
import { notifyError, notifyInfo } from '../ToastNotification';

export const getPausedDownloads = (updatePausedDownloads) => {
 socket.emit('get_paused_download');

 socket.on('paused_download_info', (pausedDownloads) => {
  console.log(pausedDownloads);
  updatePausedDownloads(pausedDownloads);
 });
};
