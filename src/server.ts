#! /usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import { exit } from 'process';
import { UDPSever, peerInfo } from './udp';
import { TCPserver } from './tcp';
import chalk from 'chalk';

export const BROADCAST_ADDR = '172.17.255.255';
export const USER_NAME: string | null | undefined = process.argv[2];
export const USER_ID = uuidv4();

if (!USER_NAME) {
 throw new Error('Pass argument for username');
 exit(-1);
}

//starting cli program
program.version('1.0.0').description('P2P CLI');

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
   'Send a chat message',
   'Exit',
  ],
 });
 handleAnswer(answers['cli options'] as string);
 await prompt();
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
  try {
   await TCP_SERVER.sendToTCPServer(answers.message, answers.client_ip);
  } catch (error) {
   console.log(chalk.red('Failed to send chat message'));
  }
 } else {
  console.log(chalk.red('Invalid ip or peer on online \n'));
 }
 return;
}

async function handleAnswer(choosenValue: string) {
 if (choosenValue === 'View your info') {
  console.log(chalk.green("Your's Infomation\n"));
  console.log(chalk.yellow(`User name - ${USER_NAME}\n`));
  console.log(chalk.yellow(`Peer id - ${USER_ID}\n`));
  console.log(chalk.yellow(`IP address - ${UDP_SERVER.MY_IP_ADDRESS}\n`));
  console.log(chalk.yellow(`Network broadcast address - ${BROADCAST_ADDR}\n`));
 } else if (choosenValue === 'View online peers') {
  if (Object.keys(UDP_SERVER.ACTIVE_USERS).length > 0) {
   let onlinePeer: peerInfo[] = [];
   Object.keys(UDP_SERVER.ACTIVE_USERS).forEach((key) => {
    onlinePeer.push(UDP_SERVER.ACTIVE_USERS[key]);
   });
   console.table(onlinePeer);
  } else {
   console.log(chalk.bgRed('No online peer found in network'));
  }
 } else if (choosenValue === 'Send a chat message') {
  await sendChatMessage();
 } else {
  exit(0);
 }
 return;
}

// validating ip enetered by user
const validateIp = (ip: string): boolean => {
 if (ip === UDP_SERVER.MY_IP_ADDRESS || ip === BROADCAST_ADDR) return false;
 Object.keys(UDP_SERVER.ACTIVE_USERS).forEach((key) => {
  if (UDP_SERVER.ACTIVE_USERS[key].ipAddr === ip) return true;
 });
 return false;
};

//creating a UDP server
const UDP_SERVER = new UDPSever(BROADCAST_ADDR, USER_NAME, USER_ID);

//creating a TCP server
const TCP_SERVER = new TCPserver(USER_NAME, USER_ID);

setTimeout(() => {
 (async () => await prompt())();
}, 2000);

// setTimeout(() => {
//  const firstUserIP =
//   UDP_SERVER.ACTIVE_USERS[Object.keys(UDP_SERVER.ACTIVE_USERS)[0]].ipAddr;
//  TCP_SERVER.sendToTCPServer(`Hello mate how are you ${USER_NAME}`, firstUserIP);
// }, 10000);

//handling server close cases
async function exitHandler(options: any, exitCode: any) {
 await UDP_SERVER.sendLastPacket();
 await TCP_SERVER.closeTCPServer();
 if (options.cleanup) console.log('clean');
 if (exitCode || exitCode === 0) console.log(exitCode);
 if (options.exit) process.exit();
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
