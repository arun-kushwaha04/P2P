#! /usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import { exit } from 'process';
import { UDPSever, peerInfo } from './udp/udp.mjs';
import { TCPserver } from './tcp/tcp.mjs';
import chalk from 'chalk';
import { File } from './files/index.mjs';
import { CHAT_MESSAGE } from './utils/constant.mjs';
import { Downloader } from './downloader/index.mjs';
// import heapdump from  'heapdump'

export let BROADCAST_ADDR = '172.17.255.255';
export const USER_NAME: string | null | undefined = process.argv[2];
export const USER_ID = uuidv4();
export let UDP_SERVER: UDPSever;
export let TCP_SERVER: TCPserver;
export let FILE_MANAGER: File;
export let ACTIVE_DOWNLOADS: { [key: string]: Downloader } = {};
export let FILE_TRANSFERS: number = 0;

export let incrFileTransfers = () => {
 FILE_TRANSFERS++;
 console.log('Current active file transfers', FILE_TRANSFERS);
};

export let decsFileTransfers = () => {
 FILE_TRANSFERS--;
 console.log('Current active file transfers', FILE_TRANSFERS);
};

if (!USER_NAME) {
 throw new Error('Pass argument for username');
 exit(-1);
}

//starting cli program
program.version('1.0.0').description('P2P CLI');

async function takeBroadcastIp() {
 const answers = await inquirer.prompt([
  {
   name: 'bc_ip',
   type: 'input',
   message: 'Enter broadcast IP address\n',
  },
 ]);

 if (answers.bc_ip) {
  BROADCAST_ADDR = answers.bc_ip;
 } else {
  console.log(chalk.red('Enter a ip address \n'));
  exit(-1);
 }
 return;
}

//cli options
//users information
//show online users
//allow user to send a message
//exit the server
async function prompt() {
 const answers = await inquirer.prompt({
  name: 'cli options',
  type: 'list',
  message: 'Choose an action\n',
  choices: [
   'View your info',
   'View online peers',
   'Search a file',
   'Share a file',
   'Start a download',
   'Send a chat message\n',
   //  'Exit\n',
  ],
 });
 await handleAnswer(answers['cli options'] as string);
 await prompt();
 return;
}

async function sendChatMessage() {
 const answers = await inquirer.prompt([
  {
   name: 'client_ip',
   type: 'input',
   message: 'Enter client IP address\n',
  },
  {
   name: 'message',
   type: 'input',
   message: 'Enter message\n',
  },
 ]);

 if (validateIp(answers.client_ip)) {
  TCP_SERVER.sendMessage(answers.message, answers.client_ip, CHAT_MESSAGE);
 } else {
  console.log(chalk.red('Invalid ip or peer on online \n'));
 }
 return;
}

const handleFilePrompt = async () => {
 const answers = await inquirer.prompt([
  {
   name: 'fileQuery',
   type: 'input',
   message: 'File/folder name, you are looking for\n',
  },
 ]);
 UDP_SERVER.sendFileSearchQuery(answers.fileQuery, BROADCAST_ADDR);
 return;
};

const handleShareFilePrompt = async () => {
 const answers = await inquirer.prompt([
  {
   name: 'filePath',
   type: 'input',
   message: 'File/folder path, you want to share\n',
  },
 ]);
 FILE_MANAGER.shareFile(answers.filePath);
 return;
};

const startDownload = async () => {
 const answers = await inquirer.prompt([
  {
   name: 'fileHash',
   type: 'input',
   message: 'File/folder hash, you want to download\n',
  },
 ]);
 const dowloaderId = uuidv4();
 const downloader = new Downloader(answers.fileHash, dowloaderId);
 ACTIVE_DOWNLOADS[dowloaderId] = downloader;
 return;
};

async function handleAnswer(choosenValue: string) {
 console.log(chalk.blue(choosenValue));
 if (choosenValue === 'View your info') {
  console.log(chalk.green("Your's Infomation\n"));
  console.log(chalk.yellow(`User name - ${USER_NAME}\n`));
  console.log(chalk.yellow(`Peer id - ${USER_ID}\n`));
  console.log(chalk.yellow(`IP address - ${UDP_SERVER.MY_IP_ADDRESS}\n`));
  console.log(chalk.yellow(`Network broadcast address - ${BROADCAST_ADDR}\n`));
 } else if (choosenValue === 'View online peers') {
  if (Object.keys(UDP_SERVER.ACTIVE_USERS).length > 0) {
   let onlinePeer: peerInfo[] = [];
   for (let [_, value] of UDP_SERVER.ACTIVE_USERS) {
    onlinePeer.push(value);
   }
   console.table(onlinePeer);
  } else {
   console.log(chalk.bgRed('No online peer found in network'));
  }
 } else if (choosenValue === 'Search a file') {
  await handleFilePrompt();
 } else if (choosenValue === 'Share a file') {
  await handleShareFilePrompt();
 } else if (choosenValue === 'Start a download') {
  await startDownload();
 } else {
  await sendChatMessage();
 }
 return;
}

// validating ip enetered by user
export const validateIp = (ip: string): boolean => {
 return UDP_SERVER.ACTIVE_USERS.has(ip);
};

const startServer = async () => {
 //intalizing the p2p file structure
 FILE_MANAGER = new File();

 await takeBroadcastIp();

 //  creating a UDP server
 UDP_SERVER = new UDPSever(BROADCAST_ADDR, USER_NAME, USER_ID);

 //  creating a TCP server
 TCP_SERVER = new TCPserver();

 setTimeout(() => {
  (async () => await prompt())();
 }, 2000);
};

startServer();

//handling server close cases
async function exitHandler(options: any, exitCode: any) {
 if (options.cleanup) {
  console.log('Exited');
 }
 if (exitCode || exitCode === 0) console.log(exitCode);
 if (options.exit) {
  await TCP_SERVER.closeTCPServer();
  process.exit();
 }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
