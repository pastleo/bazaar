import * as peerConns from './peerConns.js'

import { init as gameInit } from './game.js'
import { init as nickNameInit } from './nickname.js'
import { init as messageInit } from './message.js'
import { init as avatarInit } from './avatar.js'

peerConns.setRtcConfig({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
const myName = peerConns.getMyName();

export const phxPeerName = 'phx-wss://bazaar-ws-peer.pastleo.me/peer';

document.addEventListener('DOMContentLoaded', async () => {
  await gameInit();
  await peerConns.connect(phxPeerName)
  await avatarInit();
  nickNameInit();
  messageInit();

  findPeers();
});

async function findPeers() {
  const peersToConnect = (await peerConns.queryPeers(phxPeerName)).filter(p => p !== myName && !peerConns.isConnected(p));
  for(const peer of peersToConnect) {
    await peerConns.connect(peer, phxPeerName);
  }
}

