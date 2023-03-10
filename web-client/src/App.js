import React from 'react';
import { ToastContainer } from 'react-toastify';

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
import ActiveDownloads from './components/ActiveDownloads';
import PausedDownloads from './components/PausedDownloads';

function App() {
 const { collapseSidebar } = useProSidebar();
 const [navButtonSelected, setSelectedNavButton] = React.useState('home');

 const navButtonClickHandler = (navId) => {
  setSelectedNavButton(navId);
 };

 React.useEffect(() => {
  Socket.on('connection_succeed', () => {
   console.log('Connection established with server');
  });
 }, []);

 return (
  <>
   <ToastContainer />
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

      <MenuItem
       icon={<HomeOutlinedIcon />}
       onClick={() => navButtonClickHandler('home')}
       className={navButtonSelected === 'home' ? 'selected_nav_button' : ''}
      >
       Home
      </MenuItem>
      <MenuItem
       icon={<DownloadOutlinedIcon />}
       onClick={() => navButtonClickHandler('active_downloads')}
       className={
        navButtonSelected === 'active_downloads' ? 'selected_nav_button' : ''
       }
      >
       Active Downloads
      </MenuItem>
      <MenuItem
       icon={<PauseOutlinedIcon />}
       onClick={() => navButtonClickHandler('paused_downloads')}
       className={
        navButtonSelected === 'paused_downloads' ? 'selected_nav_button' : ''
       }
      >
       Paused Downloads
      </MenuItem>
      <MenuItem
       icon={<ShareOutlinedIcon />}
       onClick={() => navButtonClickHandler('share_files')}
       className={
        navButtonSelected === 'share_files' ? 'selected_nav_button' : ''
       }
      >
       Shared Files
      </MenuItem>
      <MenuItem
       icon={<ChatOutlinedIcon />}
       onClick={() => navButtonClickHandler('chat')}
       className={navButtonSelected === 'chat' ? 'selected_nav_button' : ''}
      >
       Chat On LAN
      </MenuItem>
     </Menu>
    </Sidebar>
    <MainSection>
     {navButtonSelected === 'home' ? (
      <Search />
     ) : navButtonSelected === 'active_downloads' ? (
      <ActiveDownloads />
     ) : navButtonSelected === 'paused_downloads' ? (
      <PausedDownloads />
     ) : navButtonSelected === 'share_files' ? (
      <>share files</>
     ) : navButtonSelected === 'chat' ? (
      <>chat</>
     ) : (
      <>No such page exists</>
     )}
    </MainSection>
   </div>
  </>
 );
}

const MainSection = styled.section`
 flex: 1;
 height: 100vh;
 padding: 2rem 1rem;
 overflow: hidden;
`;

export default App;
