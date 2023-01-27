// const mongoose = require('mongoose');
import mongoose, { ConnectOptions } from 'mongoose';
const DB_CONNECTION_STRING = 'mongodb://127.0.0.1:27017/P2P';

mongoose.set({ strictQuery: false });
export const connectToDB = async () => {
 await mongoose.connect(`${DB_CONNECTION_STRING}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
 } as ConnectOptions);

 const db = mongoose.connection;
 db.on('error', console.error.bind(console, 'Error connecting to database'));
 db.once('open', () => {
  console.log('Connected to database successfully');
  module.exports = db;
 });
};
