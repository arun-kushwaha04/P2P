import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getPeerByFileHash } from '../utilities/stream';
import searchingPeers from '../assets/seraching_peers.gif';

import styled from 'styled-components';
import { HeadingText } from '../utilities/SharedStyledComponents';

export default function Stream() {
 const [peers, setPeers] = React.useState([]);
 const [videoUrl, setVideoUrl] = React.useState('');
 const vidRef = useRef(null);
 let params = useParams();

 console.log(peers, videoUrl);

 console.log(vidRef);

 React.useEffect(() => {
  const fileHash = params.fileHash;
  const timer = setInterval(() => {
   getPeerByFileHash(setPeers, setVideoUrl, fileHash);
   if (peers.length === 0) return;
   const index = 0 + Math.floor((peers.length - 0) * Math.random());
   setVideoUrl('http://' + peers[index] + ':1250/stream/' + fileHash);
  }, 60000);

  return () => {
   return clearInterval(timer);
  };
 }, [params.fileHash, peers]);

 React.useEffect(() => {
  const fileHash = params.fileHash;
  getPeerByFileHash(setPeers, setVideoUrl, fileHash);
 }, [params.fileHash]);

 return (
  <MainSection>
   {peers && peers.length > 0 && videoUrl.length > 0 ? (
    <Video ref={vidRef} src={videoUrl} type='video/mp4' controls></Video>
   ) : (
    <NoPeerDiv>
     <img src={searchingPeers} alt='Searching peers' />
     <HeadingText style={{ color: 'white' }}>
      Searching for peers to stream
     </HeadingText>
    </NoPeerDiv>
   )}
  </MainSection>
 );
}

const MainSection = styled.section`
 display: flex;
 height: 100vh;
 width: 100vw;
 flex-direction: column;
 overflow-y: hidden;
 padding: 2rem;
 background-color: var(--purple-light);
 align-items: center;
 justify-content: center;
`;

const Video = styled.video`
 width: 100%;
 height: auto;
 max-height: 100%;
 padding: 1rem;
`;

const NoPeerDiv = styled.div`
 display: flex;
 align-items: center;
 justify-content: center;
 width: 100%;
 height: 100%;
 flex-direction: column;
 gap: 1rem;
`;
