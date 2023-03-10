import { toast } from 'react-toastify';

export const notifyError = (text, id, ms) => {
 console.log(text, id, ms);
 return toast.error(text, {
  position: 'top-center',
  autoClose: ms ?? 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  toastId: id,
 });
};

export const notifySuccess = (text, id, ms) => {
 console.log(text, id, ms);
 return toast.success(text, {
  position: 'top-center',
  autoClose: ms ?? 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  toastId: id,
 });
};

export const notifyInfo = (text, id, ms) => {
 return toast.warning(text, {
  position: 'top-center',
  autoClose: ms ?? 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  toastId: id,
 });
};
