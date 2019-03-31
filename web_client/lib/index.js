import { Socket } from 'https://unpkg.com/phoenix@1.4.3/assets/js/phoenix.js?module';

const rtcConfig = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};
console.log('rtcConfig:', rtcConfig);

const myName = Date.now().toString(36);
const peerSocket = new Socket("ws://localhost:4000/peer", {});
peerSocket.connect();

let peerName, phxChannel, rtcConnection, rtcChannel;

const setPeerName = name => {
  peerName = name;
  document.getElementById('peer-name').textContent = peerName;
}

const linkStart = () => {
  phxChannel.push("all")
    .receive("ok", ({ peers }) => {
      const peerNames = Object.keys(peers);
      setPeerName(
        peerNames[0] !== myName ? peerNames[0] : peerNames[1]
      );
      prepareOfferAndPush();
    });
}

const onTold = ({ from, payload }) => {
  console.log("from:", from, "onTold", payload)
  switch (payload.type) {
    case 'offer':
      setPeerName(from);
      prepareAnswerAndPush(payload.offer)
      break;
    case 'answer':
      useAnswer(payload.answer)
      break;
    case 'ice':
      useIceCandidate(payload.ice)
      break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  phxChannel = peerSocket.channel(`peer:${myName}`, {params: {loc: [0, 0]}})
  phxChannel
    .join()
    .receive("ok", () => {
      console.log("ok")
    })
  phxChannel.on("told", onTold);

  document.getElementById('link-start')
    .addEventListener('click', linkStart);
  document.getElementById('send')
    .addEventListener('click', sendMsg);
  document.getElementById('my-name').textContent = myName;
}, false);

// WebRTC part...

// connecting side
function prepareOfferAndPush() {
  rtcConnection = new RTCPeerConnection(rtcConfig);

  // IMPORTANT! createDataChannel is required before creating offer
  rtcChannel = rtcConnection.createDataChannel("msg");
  rtcChannel.onmessage = receiveMsg;

  rtcConnection.onicecandidate = pushIceCandidate;
  rtcConnection.oniceconnectionstatechange = rtcConnectionChanged;

  rtcConnection
    .createOffer()
    .then(offer => rtcConnection.setLocalDescription(offer))
    .then(() => {
      console.log('push offer description:', JSON.stringify(rtcConnection.localDescription))
      phxChannel.push("tell", {
        who: peerName,
        payload: {
          type: 'offer',
          offer: JSON.stringify(rtcConnection.localDescription)
        }
      });
    })
}

// connected side
function prepareAnswerAndPush(offer) {
    console.log('get offer:', offer);

    rtcConnection = new RTCPeerConnection(rtcConfig);

    rtcConnection.ondatachannel = ({channel}) => {
      rtcChannel = channel;
      rtcChannel.onmessage = receiveMsg;
    }

    rtcConnection.onicecandidate = pushIceCandidate;
    rtcConnection.oniceconnectionstatechange = rtcConnectionChanged;

    rtcConnection
      .setRemoteDescription(JSON.parse(offer))
      .then(() => rtcConnection.createAnswer())
      .then(answer => rtcConnection.setLocalDescription(answer))
      .then(() => {
        console.log('push answer description:', JSON.stringify(rtcConnection.localDescription))
        phxChannel.push("tell", {
          who: peerName,
          payload: {
            type: 'answer',
            answer: JSON.stringify(rtcConnection.localDescription)
          }
        });
      })
}

function useAnswer(answer) {
  console.log('using answer:', answer);
  rtcConnection.setRemoteDescription(JSON.parse(answer));
}

function pushIceCandidate({candidate}) {
  if(candidate) {
    console.log('push ice candidate:', JSON.stringify(candidate))
    phxChannel.push("tell", {
      who: peerName,
      payload: {
        type: 'ice',
        ice: JSON.stringify(candidate),
      }
    });
  }
}

function useIceCandidate(ice) {
  console.log('using ice:', ice);
  rtcConnection.addIceCandidate(JSON.parse(ice));
}

function rtcConnectionChanged() {
  const { iceConnectionState } = rtcConnection;
  console.log(iceConnectionState)
}

function sendMsg() {
  rtcChannel.send(
    JSON.stringify(
      Math.floor(Math.random() * 10000).toString(36)
    )
  );
}

function receiveMsg({ data }) {
  console.log('receiveMsg', data);
}
