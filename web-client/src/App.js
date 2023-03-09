import React from 'react';

import { Sidebar, Menu, MenuItem, useProSidebar } from 'react-pro-sidebar';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PauseOutlinedIcon from '@mui/icons-material/PauseOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import styled from 'styled-components';
import './App.css';
import Search from './components/Search';
import Socket from './utilities/socketConfig';

function App() {
 const { collapseSidebar } = useProSidebar();

 React.useEffect(() => {
  Socket.on('connection_succeed', () => {
   console.log('Connection established with server');
  });
 }, []);

 return (
  <div className='App' style={({ height: '100vh' }, { display: 'flex' })}>
   <Sidebar style={{ height: '100vh', backgroundColor: '#b225ef' }}>
    <Menu>
     <MenuItem
      icon={<MenuOutlinedIcon />}
      onClick={() => {
       collapseSidebar();
      }}
      style={{ textAlign: 'center' }}
     >
      {' '}
      <h2>P2P</h2>
     </MenuItem>

     <MenuItem icon={<HomeOutlinedIcon />}>Home</MenuItem>
     <MenuItem icon={<DownloadOutlinedIcon />}>Active Downloads</MenuItem>
     <MenuItem icon={<PauseOutlinedIcon />}>Paused Downloads</MenuItem>
     <MenuItem icon={<ShareOutlinedIcon />}>Shared Files</MenuItem>
     <MenuItem icon={<ChatOutlinedIcon />}>Chat On LAN</MenuItem>
    </Menu>
   </Sidebar>
   <MainSection>
    <Search />
   </MainSection>
  </div>
 );
}

const MainSection = styled.section`
 flex: 1;
 height: 100vh;
 padding: 2rem 1rem;
 overflow: hidden;
`;

export default App;
