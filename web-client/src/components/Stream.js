import React from 'react';
import { useParams } from 'react-router-dom';

export default function Stream() {
 const [peers, setPeers] = React.useState(['localhost']);
 const [videoUrl, setVideoUrl] = React.useState('');
 let params = useParams();

 React.useEffect(() => {
  const fileHash = params.fileHash;
  //get video peers;

  setTimeout(() => {
   const index = 0 + Math.floor((peers.length - 0) * Math.random());
   setVideoUrl('http://' + peers[index] + ':1250/stream/' + fileHash);
  }, 10000);
 });

 return (
  <div>
   {peers && peers.length > 0 && videoUrl.length > 0 && (
    <video src={videoUrl} controls></video>
   )}
  </div>
 );
}
