import socket from '../socketConfig';
import { notifyError, notifyInfo } from '../ToastNotification';

export const getSharedResources = (
 updateSharedResources,
 pageNumber,
 limit,
) => {
 socket.emit('get_shared_resources', { pageNumber, limit });
 socket.on('shared_resources', (sharedResources) => {
  updateSharedResources(sharedResources);
 });
};

export const unshareResources = (id, updateSharedResources) => {
 socket.emit('unshare_resources', { id });
 socket.on('resource_unshared', () => {
  notifyInfo('Resource unshared', 1000);
  updateSharedResources((oldVal) => {
   const temp = oldVal.filter((res) => res._id !== id);
   return temp;
  });
 });
};
