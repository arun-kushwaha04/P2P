import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ProSidebarProvider } from 'react-pro-sidebar';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
 <React.StrictMode>
  <ProSidebarProvider>
   <App />
  </ProSidebarProvider>
 </React.StrictMode>,
);
