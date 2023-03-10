import socket from '../socketConfig';
import { notifyError, notifyInfo } from '../ToastNotification';
export const searchForResource = (fileName, updateResult) => {
 socket.emit('search_file', {
  fileName: fileName,
 });
 notifyInfo('Search in progress', Date.now(), 5000);

 socket.on('search_file_result', (result) => {
  if (Object.keys(result).length > 0) {
   updateResult(result);
  } else {
   updateResult(null);
   notifyError('No result found', Date.now(), 1000);
  }
  return;
 });
 return;
};
