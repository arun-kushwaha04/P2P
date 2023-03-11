import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ProSidebarProvider } from 'react-pro-sidebar';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import Stream from './components/Stream';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
 <BrowserRouter>
  <Routes>
   <Route
    path='/'
    element={
     <ProSidebarProvider>
      <App />
     </ProSidebarProvider>
    }
   />
   <Route path='stream/:fileHash' element={<Stream />} />
   <Route path='*' element={<div>Invalid Url</div>} />
  </Routes>
 </BrowserRouter>,
);
