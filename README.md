# P2P  : Share/Stream/Gossip Over LAN

## Introduction

P2P helps you to share and stream resources over LAN, where each acts as a independent node. There is no dependency on a central server, each peer have their own local database which help them to act independant.

## Features Implemented
1. Triggring events when a peer leave/joins the network:
    - Uses nodejs dgram libaray to broadcast UDP packet when a peer joins/leaves the network.
    - Each peer maintains their own list of active user found in network.

2. Sharing/Browsing resources over lan:
    - Share resources by just providing their path.
    - SHA-256 hash used to uniquely identify files/folders.
    - Look for resources shared by other active peer in the network.

2. Download Resources:
    - Uses nodejs net library to transfer file chunk over TCP socket.
    - Pulls chunk from different peers to build file.
    - Allows folder download without compressing it.
    - Health of chunk chunk checked using checksum.
    - Automatically pauses the download when peers goes offline.
    - Ability to resume download from last chunk.
    
3. Chat With Other Peers :
    - Provide ability to send chat message over TCP socket.
    
3. Stream Shared Videos From Other Peers :
    - Real time video streaming from other active peer on network.
    - No need to download videos on local PC.

<br>

## Frameworks/Libraries/Packages Used

    - Node Js
    - React
    - Dgram
    - Net
    - Inquirer
    - Commander
    - Crypto
    - Socket.io
    - Docker
    - Mongodb

<br>

## Local Setup

Clone the repositorie, cd into it, and then follow the below mentioned steps for starting backend and web-client.

Starting node:

    - Fork the repository.
    - Clone the repository (git clone https://github.com/arun-kushwaha04/P2P.git).
    - Open the folder in which you cloned the repository.
    - Run *npm install*.
    - Find your networks broadcast address using ifconfig(mac/linux) or ipconfig.    
    - Now you can run 'npm start {provide_a_desired_username_here}'.    
    - Enter broadcast address in the cli prompt and you are good to go.
    
![Getting Broadcast Address](https://user-images.githubusercontent.com/73020364/224513947-b9cb6e47-f7ef-481b-b002-60dc60b125e4.png)
![Starting Command](https://user-images.githubusercontent.com/73020364/224513886-0e787700-0f46-4aaf-932a-3e593614231e.png)   

Web-client:

    - cd to `web-client` folder.
    - Run *npm install*.
    - Run *npm start* to run web-client.
    - Open `http://localhost:3000/` to access web-client.

## Screenshots
![Starting your peer](https://user-images.githubusercontent.com/73020364/224514167-d6e44ff2-570d-42e9-a0b3-8209a5e5a276.png)
![Search result over lan](https://user-images.githubusercontent.com/73020364/224514769-4175a971-364c-4c03-864b-3ec02ae01191.PNG)
![Downloads in progress](https://user-images.githubusercontent.com/73020364/224514763-9ac0d6c5-00d0-48c4-8bd8-308badb957e5.PNG)
![Shared Resources](https://user-images.githubusercontent.com/73020364/224514765-0ae0e016-83da-4c42-89ed-2a642eaa1572.PNG)
![Chat Screen](https://user-images.githubusercontent.com/73020364/224514766-e65a579d-5684-4990-bb19-244e6e5b30ae.PNG)

## TO-DO
- [ ] Improve Web ui.
- [ ] Client app for mobile devices.
- [ ] Better error handling.
- [ ] Smooth user experience.
- [ ] Dockerizing.
- [ ] Ui for customizing settings.



