import mongoose from 'mongoose';

const file = new mongoose.Schema({
 fileName: {
  type: 'string',
  requrie: true,
 },
 fileHash: {
  type: 'string',
  require: true,
 },
 filePath: {
  type: 'string',
  require: true,
 },
 fileMimeType: {
  type: 'string',
  require: true,
 },
 fileSize: {
  type: 'string',
  require: true,
 },
 fileExtentsion: {
  type: 'string',
  require: true,
 },
 isFolder: {
  type: Boolean,
  require: true,
 },
});

export default mongoose.model('File', file);
