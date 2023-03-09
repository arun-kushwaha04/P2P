import io from 'socket.io-client';
let socket = io('http://localhost:1250');
export default socket;
