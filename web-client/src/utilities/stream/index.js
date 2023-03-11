import socket from '../socketConfig';
// import { notifyError, notifyInfo } from '../ToastNotification';

export const getPeerByFileHash = (updatePeer, fileHashr) => {
 socket.emit('search_peer_filehash', { fileHash: fileHashr });
 socket.on('peer_filehash', ({ peerIpAddr, fileHash }) => {
  if (fileHashr === fileHash) {
   updatePeer((oldVal) => {
    const temp = oldVal.filter((addr) => addr !== peerIpAddr);
    temp.push(peerIpAddr);
    return temp;
   });
  }
 });
};
