import * as peerConns from './peerConns.js'

import { init as gameInit } from './game.js'
import { init as nickNameInit } from './nickname.js'
import { init as messageInit } from './message.js'
import { init as avatarInit } from './avatar.js'

peerConns.setRtcConfig({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
const myId = peerConns.getMyId();

export const phxPeerId = 'phx-wss://bazaar-ws-peer.herokuapp.com/peer';

document.addEventListener('DOMContentLoaded', async () => {
  await gameInit();
  await peerConns.connect(phxPeerId)
  await avatarInit();
  nickNameInit();
  messageInit();

  findPeers();
});

async function findPeers() {
  const peersToConnect = (await peerConns.queryPeers(phxPeerId)).filter(p => p !== myId && !peerConns.isConnected(p));
  for(const peer of peersToConnect) {
    await peerConns.connect(peer, phxPeerId);
  }
}

