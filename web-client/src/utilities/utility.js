export const formatBytes = (bytes, decimals = 2) => {
 if (!+bytes) return '0 Bytes';

 const k = 1024;
 const dm = decimals < 0 ? 0 : decimals;
 const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

 const i = Math.floor(Math.log(bytes) / Math.log(k));

 return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatTime = (time) => {
 time = parseInt(time / 1000);
 console.log(time);
 let seconds = (time % 60).toLocaleString('en-US', {
  minimumIntegerDigits: 2,
  useGrouping: false,
 });
 time = parseInt(time / 60);
 let minutes = (time % 60).toLocaleString('en-US', {
  minimumIntegerDigits: 2,
  useGrouping: false,
 });
 time = parseInt(time / 60);
 let hours = time.toLocaleString('en-US', {
  minimumIntegerDigits: 2,
  useGrouping: false,
 });

 console.log(hours, minutes, seconds);
 if (hours === '00' && minutes === '00') return seconds + 's';
 else if (hours === '00') return minutes + ':' + seconds + 'm';
 return hours + ':' + minutes + ':' + seconds + 'h';
};
