import socket from '../socketConfig';
export const searchForResource = (fileName, updateResult) => {
 socket.emit('search_file', {
  fileName: fileName,
 });

 socket.on('search_file_result', (result) => {
  updateResult(result);
 });
};
