import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import styled from 'styled-components';

import { formatBytes } from '../utilities/utility';
import { Button } from '@mui/material';
import NoActiveDownloadGIF from '../assets/no_active_downloads.gif';
import { HeadingText } from '../utilities/SharedStyledComponents';
import {
 getPausedDownloads,
 resumeDownload,
} from '../utilities/pausedDownloads';

const columns = [
 { id: 's.no', label: 'S.No', minWidth: 10 },
 {
  id: 'fileName',
  label: 'File Name',
  minWidth: 50,
  align: 'center',
 },
 {
  id: 'size',
  label: 'Size',
  minWidth: 10,
  align: 'center',
  // format: (value: number) => value.toLocaleString('en-US'),
 },
 {
  id: 'isFolder',
  label: 'Is Folder',
  minWidth: 10,
  align: 'center',
 },
 {
  id: 'chunk',
  label: 'Chunks Downloaded / Total Chunks',
  minWidth: 20,
  align: 'center',
 },
 {
  id: 'pause',
  label: 'Resume Downloading',
  minWidth: 10,
  align: 'center',
 },
];

export default function PausedDownloads() {
 const [pausedDownloads, setPausedDownloads] = React.useState(null);

 React.useEffect(() => {
  getPausedDownloads(setPausedDownloads);
 }, []);

 return (
  <MainSection>
   {pausedDownloads && pausedDownloads.length > 0 ? (
    <TableContainer component={Paper}>
     <Table sx={{ minWidth: 650 }} aria-label='simple table'>
      <TableHead>
       <TableRow>
        {columns.map((column) => (
         <TableCell
          key={column.key}
          align={column.align ? column.align : 'center'}
          width={column.maxWidth}
          variant='head'
          style={{ fontWeight: 'bold' }}
         >
          {column.label}
         </TableCell>
        ))}
       </TableRow>
      </TableHead>
      <TableBody>
       {pausedDownloads.map((row, index) => (
        <TableRow
         key={row.fileName}
         sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
        >
         <TableCell component='th' scope='row'>
          {index + 1}
         </TableCell>
         <TableCell component='th' scope='row'>
          {row.fileName}
         </TableCell>
         <TableCell
          align='center'
          style={{ fontSize: '0.75rem', fontWeight: 'bold' }}
         >
          {formatBytes(row.fileSize)}
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
         <TableCell align='center'>
          {row.chunksDownlaoded}/{row.totalChunks}
         </TableCell>
         <TableCell align='center'>
          <Button onClick={() => resumeDownload(row.downloaderId)}>
           Resume Download
          </Button>
         </TableCell>
        </TableRow>
       ))}
      </TableBody>
     </Table>
    </TableContainer>
   ) : (
    <NoDownloadDiv>
     <img src={NoActiveDownloadGIF} alt='No acitve download gif' />
     <HeadingText>No Paused Downloads</HeadingText>
    </NoDownloadDiv>
   )}
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

const NoDownloadDiv = styled.div`
 display: flex;
 align-items: center;
 justify-content: center;
 width: 100%;
 height: 100%;
 flex-direction: column;
 gap: 1rem;
`;
