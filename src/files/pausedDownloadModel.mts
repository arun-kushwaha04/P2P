import mongoose from 'mongoose';

const download = new mongoose.Schema({
 fileHash: {
  type: 'string',
  require: true,
 },
 folderName: {
  type: 'string',
  require: true,
 },
 chunkArray: [
  {
   type: 'number',
  },
 ],
});

export default mongoose.model('Pausedownload', download);
