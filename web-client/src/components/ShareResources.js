import React from 'react';
import styled from 'styled-components';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import { Button } from '@mui/material';
import {
 getSharedResources,
 sharedResource,
 unshareResources,
} from '../utilities/shareResources';

export default function ShareResources() {
 const [fileLocation, setFileLocation] = React.useState(null);
 const [pageNumber, setPageNumber] = React.useState(0);
 const [sharedResources, setSharedResources] = React.useState(null);
 const limit = 28;

 const clickHandler = (val) => {
  setPageNumber((oldVal) => oldVal + val);
 };

 React.useEffect(() => {
  getSharedResources(setSharedResources, pageNumber, limit);
 }, [pageNumber]);

 const unShareHandler = (id) => {
  unshareResources(id, setSharedResources);
 };

 //onepage has 28 elements

 return (
  <MainSection>
   <FormControl
    sx={{ m: 1 }}
    size='small'
    variant='outlined'
    style={{ display: 'flex', flexDirection: 'row', gap: '2rem' }}
   >
    <OutlinedInput
     size='small'
     value={fileLocation}
     placeholder='Enter resource path'
     onChange={(e) => setFileLocation(e.target.value)}
    />
    <Button
     size='small'
     variant='contained'
     onClick={() => sharedResource(fileLocation)}
    >
     Share
    </Button>
   </FormControl>
   <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
    {pageNumber > 0 && (
     <Button size='small' variant='contained' onClick={() => clickHandler(-1)}>
      Previous
     </Button>
    )}
    {sharedResources && sharedResources.length > 0 && (
     <Button size='small' variant='contained' onClick={() => clickHandler(1)}>
      Next
     </Button>
    )}
   </div>
   <SharedDiv>
    {sharedResources &&
     sharedResources.map((resource) => (
      <Row key={resource._id}>
       <div>
        <p>{resource.filePath}</p>
       </div>
       <div>
        <p>{resource.fileName}</p>
       </div>
       <Button
        size='small'
        variant='text'
        onClick={() => unShareHandler(resource._id)}
       >
        Unshare
       </Button>
      </Row>
     ))}
   </SharedDiv>
  </MainSection>
 );
}

const MainSection = styled.section`
 display: flex;
 height: 100%;
 width: 100%;
 justify-content: start;
 flex-direction: column;
 overflow-y: auto;
 gap: 1rem;
`;

const SharedDiv = styled.div`
 display: grid;
 /* flex-direction: column; */
 grid-template-columns: repeat(4, 15rem);
 justify-content: space-evenly;
 width: 100%;
 gap: 1rem;
`;

const Row = styled.div`
 width: 15rem;
 display: flex;
 height: auto;
 border-radius: 1rem;
 background-color: var(--blue-light);
 padding: 1rem;
 font-size: 0.75rem;
 font-weight: bold;
 flex-direction: column;
 justify-content: center;
 align-items: center;
 gap: 0.5rem;
 div {
  width: 100%;
  p {
   word-wrap: break-word;
  }
 }
`;
