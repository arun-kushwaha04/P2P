import mongoose from 'mongoose';

const download = new mongoose.Schema({
 downloaderId: {
  type: 'string',
  require: true,
 },
 fileHash: {
  type: 'string',
  require: true,
 },
 folderName: {
  type: 'string',
  require: true,
 },
 fileName: {
  type: 'string',
  require: true,
 },
 fileSize: {
  type: 'string',
  require: true,
 },
 isFolder: {
  type: 'boolean',
  require: true,
 },
 chunkArray: [
  {
   type: 'Boolean',
  },
 ],
 subFiles: { type: Array, default: [] },
});

export default mongoose.model('Pausedownload', download);
