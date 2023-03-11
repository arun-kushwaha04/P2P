import socket from '../socketConfig';
// import { notifyError, notifyInfo } from '../ToastNotification';

export const getActiveDownloads = (updateActiveDownloads) => {
 socket.emit('get_active_downloads');

 socket.on('active_download_info', (acitveDownloads) => {
  updateActiveDownloads(acitveDownloads);
 });
};
