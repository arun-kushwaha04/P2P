import { toast } from 'react-toastify';

export const notifyError = (text, ms) => {
 return toast.error(text, {
  position: 'top-center',
  autoClose: ms ?? 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
 });
};

export const notifySuccess = (text, ms) => {
 return toast.success(text, {
  position: 'top-center',
  autoClose: ms ?? 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
 });
};

export const notifyInfo = (text, ms) => {
 return toast.warning(text, {
  position: 'top-center',
  autoClose: ms ?? 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
 });
};
