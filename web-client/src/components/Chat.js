import React from 'react';
import styled from 'styled-components';
import { Button } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';

import { getUserList, sendChatMessage } from '../utilities/chat';

export default function Chat({ setChatMessages, chatMessages }) {
 const [localChatState, setLocalChatState] = React.useState(chatMessages);
 const [userList, setUserList] = React.useState();
 const [userSelected, setUserSelected] = React.useState(null);
 const [message, setMessage] = React.useState('');

 React.useEffect(() => {
  getUserList(setUserList);
  const interval = setInterval(() => {
   getUserList(setUserList);
  }, 60000);
  return () => {
   clearInterval(interval);
  };
 }, []);

 React.useEffect(() => {
  setLocalChatState(chatMessages);
 }, [chatMessages]);

 const clickHandler = () => {
  sendChatMessage(setChatMessages, message, userSelected);
  setMessage('');
 };

 return (
  <MainSection>
   <Users>
    {userList ? (
     <>
      {Object.keys(userList).map((key) => {
       return (
        <User key={userList[key].ipAddr}>
         <div>Username - {userList[key].peerUserName}</div>
         <div>Ip-address - {userList[key].ipAddr}</div>
         <div>Load - {parseFloat(userList[key].load).toFixed(2)}%</div>
         <Button
          variant='contained'
          size='small'
          onClick={() => {
           setUserSelected(userList[key].ipAddr);
          }}
         >
          Chat
         </Button>
        </User>
       );
      })}
     </>
    ) : (
     <p>No Acitve users</p>
    )}
   </Users>
   {userSelected ? (
    <Chats>
     <section className='chat-section'>
      {localChatState[userSelected] ? (
       <>
        {localChatState[userSelected].map((message) => {
         return (
          <div
           key={message.date}
           className={message.sended ? 'receiver' : 'sender'}
          >
           {message.message}
          </div>
         );
        })}
       </>
      ) : (
       <p>No messages</p>
      )}
     </section>
     <FormControl
      sx={{ m: 1 }}
      size='small'
      variant='outlined'
      style={{ display: 'flex', flexDirection: 'row', gap: '2rem' }}
     >
      <OutlinedInput
       size='small'
       value={message}
       placeholder='Chat message'
       onChange={(e) => setMessage(e.target.value)}
      />
      <Button size='small' variant='contained' onClick={clickHandler}>
       Send
      </Button>
     </FormControl>
    </Chats>
   ) : (
    <p>Select a user to chat</p>
   )}
  </MainSection>
 );
}

const MainSection = styled.section`
 display: flex;
 height: 100%;
 width: 100%;
 gap: 1rem;
 overflow-y: hidden;
 font-size: 1rem;
`;

const Users = styled.section`
 width: 25%;
 display: flex;
 flex-direction: column;
 gap: 1rem;
 overflow-y: auto;
 padding: 1rem;
 background-color: var(--lime-yellow);
`;
const User = styled.div`
 display: flex;
 flex-direction: column;
 font-size: 0.85rem;
 text-align: left;
 padding: 1rem;
 border-radius: 1rem;
 gap: 0.5rem;
 background: white;
`;

const Chats = styled.div`
 width: 75%;
 display: flex;
 flex-direction: column;
 heigth: auto;
 max-height: 100%;
 overflow: auto;
 section {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
 }
 .sender,
 .receiver {
  width: fit-content;
  background-color: var(--lime-yellow);
  border-radius: 0.5rem;
  font-size: 0.85rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: start;
  word-wrap: break-word;
  max-width: 15rem;
 }
 .sender {
  align-self: start;
 }
 .receiver {
  align-self: end;
 }
`;
