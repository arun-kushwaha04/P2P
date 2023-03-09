import React from 'react';
import styled from 'styled-components';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import { Search as SearchIcon } from '@mui/icons-material';
import InputAdornment from '@mui/material/InputAdornment';
import { Button } from '@mui/material';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import { HeadingText } from '../SharedStyledComponents';
import NoSearchResultGif from '../assets/no-result.gif';
import { formatBytes } from '../utility';

const testSearchResult = {
 '8426e4e03052a442f68248b087a09064d0d0a1ac23cf766845a2e3bbfbee3cb8': {
  extentsion: {
   '.exe': {
    'BraveBrowserSetup.exe': ['192.168.1255'],
   },
  },
  size: '1212032',
  isFolder: false,
  subFiles: [],
 },
 ecc5104b96c45e5d6be078f582c42df0f6421d9f8e0e4e851764cc6f643c49e4: {
  extentsion: {
   '.exe': {
    'BraveBrowserSetup (1).exe': ['192.168.1255'],
   },
  },
  size: '1368192',
  isFolder: false,
  subFiles: [],
 },
 c359297996f4d967b7768fa93ea1e01fb21c8e95c3f2041f101f0904e94bb333: {
  extentsion: {
   '.manifest': {
    'runner.exe.manifest': ['192.168.1255'],
   },
  },
  size: '874',
  isFolder: false,
  subFiles: [],
 },
 c4d95965f062d1ac56b2e100452b30d7d4a32bffc30fa1a56375cf90b900ed2f: {
  extentsion: {
   '.exe': {
    'VisualStudioSetup.exe': ['192.168.1255'],
   },
  },
  size: '3708248',
  isFolder: false,
  subFiles: [],
 },
 d7608fbd854b3689102ff48b03c8cc77b35138f9f7350d134306da0ba5751464: {
  extentsion: {
   '.exe': {
    'Git-2.39.2-64-bit.exe': ['192.168.1255'],
   },
  },
  size: '53002824',
  isFolder: false,
  subFiles: [],
 },
 '643a4da6a373828ea34cb21bed0e45109276816ec723ca43bc54cd1210243a9b': {
  extentsion: {
   '.exe': {
    'VSCodeUserSetup-x64-1.76.0.exe': ['192.168.1255'],
   },
  },
  size: '90137488',
  isFolder: false,
  subFiles: [],
 },
};

const columns = [
 { id: 's.no', label: 'S.No', minWidth: 50 },
 {
  id: 'fileHash',
  label: 'File Hash',
  minWidth: 20,
  align: 'right',
  maxWidth: 50,
 },
 {
  id: 'fileName',
  label: 'File Name',
  minWidth: 150,
  align: 'right',
 },
 {
  id: 'size',
  label: 'Size',
  minWidth: 50,
  align: 'center',
  // format: (value: number) => value.toLocaleString('en-US'),
 },
 {
  id: 'isFolder',
  label: 'Is Folder',
  minWidth: 50,
  align: 'center',
 },
 {
  id: 'peerCount',
  label: 'Peer Count',
  minWidth: 50,
  align: 'center',
 },
 {
  id: 'download',
  label: 'Download',
  minWidth: 100,
  align: 'center',
 },
];

const formatSearchResult = (serachResultUpdater, searchResult, setExpanded) => {
 const result = [];
 const expanded = {};
 let i = 0;
 Object.keys(searchResult).forEach((key) => {
  let peers = {};
  const temp = {};
  temp.fileHash = key;
  temp.size = searchResult[key].size;
  temp.isFolder = searchResult[key].isFolder;
  temp.subFiles = searchResult[key].subFiles;
  temp.files = [];
  Object.keys(searchResult[key].extentsion).forEach((ext) => {
   Object.keys(searchResult[key].extentsion[ext]).forEach((fn) => {
    temp.files.push(fn);
    searchResult[key].extentsion[ext][fn].forEach(
     (peer) => (peers[peer] = true),
    );
   });
  });
  temp.peerCount = Object.keys(peers).length;
  result.push(temp);
  expanded[i] = false;
  i++;
 });
 serachResultUpdater(result);
 setExpanded(expanded);
};

const mapClassName = (peerCount) => {
 if (peerCount <= 5) return 'red';
 if (peerCount <= 10) return 'yellow';
 return 'green';
};

export default function Search() {
 const [searchText, setSearchText] = React.useState('');
 const [searchResult, setSearchResult] = React.useState(testSearchResult);
 const [formattedSearchResult, setFormattedSearchResult] = React.useState(null);
 const [expanded, setExpanded] = React.useState({});

 React.useEffect(() => {
  formatSearchResult(setFormattedSearchResult, searchResult, setExpanded);
 }, [searchResult]);

 return (
  <MainSection>
   <HeadingText alingment='left'>Search resources over lan</HeadingText>
   <SearchBox>
    <FormControl
     fullWidth
     sx={{ m: 1 }}
     size='small'
     variant='outlined'
     style={{ display: 'flex', flexDirection: 'row', gap: '2rem' }}
    >
     <OutlinedInput
      size='small'
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      startAdornment={
       <InputAdornment position='start'>
        <SearchIcon />
       </InputAdornment>
      }
     />
     <Button size='small' variant='contained'>
      Search
     </Button>
    </FormControl>
   </SearchBox>
   <SearchResult>
    {formattedSearchResult ? (
     <SearchResultDiv>
      <TableContainer component={Paper}>
       <Table>
        <TableHead>
         <TableRow>
          {columns.map((column) => (
           <TableCell
            key={column.key}
            align={column.align ? column.align : 'center'}
            minwidth={column.minWidth}
            width={column.maxWidth}
            style={{ fontWeight: 'bold' }}
           >
            {column.label}
           </TableCell>
          ))}
         </TableRow>
        </TableHead>
        <TableBody>
         {formattedSearchResult.map((row, index) => (
          <TableRow
           key={row.fileHash}
           sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
          >
           <TableCell component='th' scope='row'>
            {index + 1}
           </TableCell>
           <TableCell align='right' width={columns[1].maxWidth}>
            {row.fileHash}
           </TableCell>
           <TableCell align='left'>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
             <div
              style={{
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'start',
              }}
             >
              <p>{row.files[0]}</p>
              {row.files.length > 0 && (
               <div>
                <IconButton
                 size='small'
                 onClick={() =>
                  setExpanded((oldVal) => {
                   return { ...oldVal, [index]: !oldVal[index] };
                  })
                 }
                >
                 {expanded[index] ? (
                  <KeyboardArrowUpIcon />
                 ) : (
                  <KeyboardArrowDownIcon />
                 )}
                </IconButton>
               </div>
              )}
             </div>
             {expanded[index] && (
              <div
               style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'start',
                alignItems: 'start',
                fontSize: '0.75rem',
               }}
              >
               <p style={{ fontWeight: 'bold' }}>Ohter Names</p>
               {row.files.map((file) => (
                <p>{file}</p>
               ))}
              </div>
             )}
            </div>
           </TableCell>
           <TableCell
            align='right'
            style={{ fontSize: '0.75rem', fontWeight: 'bold' }}
           >
            {formatBytes(row.size)}
           </TableCell>
           <TableCell
            align='center'
            style={{
             color: 'var(--purple-light)',
             fontSize: '0.75rem',
             fontWeight: 'bold',
            }}
           >
            {row.isFolder ? 'Yep!' : 'Nope'}
           </TableCell>
           <TableCell align='center' className={mapClassName(row.peerCount)}>
            {row.peerCount}
           </TableCell>
           <TableCell align='center'>
            <Button onClick={() => console.log(row.fileHash)}>Download</Button>
           </TableCell>
          </TableRow>
         ))}
        </TableBody>
       </Table>
      </TableContainer>
     </SearchResultDiv>
    ) : (
     <NoSearchResult>
      <img src={NoSearchResultGif} alt='No search result'></img>
     </NoSearchResult>
    )}
   </SearchResult>
  </MainSection>
 );
}

const MainSection = styled.section`
 display: flex;
 height: 100%;
 width: 100%;
 flex-direction: column;
 overflow-y: hidden;
`;

const SearchBox = styled.div`
 border-radius: 2rem;
 margin: 1rem 2rem;
`;

const SearchResult = styled.div`
 color: var(--purple-light);
 flex: 1;
 width: 100%;
 overflow-y: auto;

 ::-webkit-scrollbar {
  display: none;
 }
`;

const NoSearchResult = styled.div`
 width: 100%;
 height: 100%;
 display: flex;
 font-size: 1.5rem;
 align-items: center;
 justify-content: center;
`;

const SearchResultDiv = styled.div`
 width: 100%;
 flex: 1;
`;
