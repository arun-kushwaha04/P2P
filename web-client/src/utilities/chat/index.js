import socket from '../socketConfig';
// import { notifyError, notifyInfo } from '../ToastNotification';

export const getUserList = (updateUserList) => {
 socket.emit('get_active_users');

 socket.on('active_users', ({ activeUsers }) => {
  console.log(activeUsers);
  updateUserList(activeUsers);
  return;
 });
 return;
};

export const sendChatMessage = (setChatMessages, message, receiver) => {
 socket.emit('send_chat_message', { message, receiver });
 let handledOnce = false;
 socket.on('message_sent', () => {
  if (handledOnce) return;
  handledOnce = true;
  setChatMessages((oldVal) => {
   if (oldVal[receiver])
    return {
     ...oldVal,
     [receiver]: [
      ...oldVal[receiver],
      { message, sended: true, date: Date.now() },
     ],
    };
   else
    return {
     ...oldVal,
     [receiver]: [{ message, sended: true }],
    };
  });
  return;
 });
 return;
};
