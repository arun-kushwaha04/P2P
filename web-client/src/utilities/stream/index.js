import socket from '../socketConfig';
// import { notifyError, notifyInfo } from '../ToastNotification';

export const getPeerByFileHash = (updatePeer, setVideoUrl, fileHashr) => {
 socket.emit('search_peer_filehash', { fileHash: fileHashr });
 socket.on('peer_filehash', ({ peerIpAddr, fileHash }) => {
  console.log('peer_filehash', peerIpAddr, fileHash);
  if (fileHashr === fileHash) {
   setVideoUrl((oldVal) => {
    if (oldVal.length === 0) {
     return 'http://' + peerIpAddr + ':1250/stream/' + fileHash;
    }
    return oldVal;
   });
   updatePeer((oldVal) => {
    const temp = oldVal.filter((addr) => addr !== peerIpAddr);
    temp.push(peerIpAddr);
    return temp;
   });
  }
  return;
 });
 return;
};
