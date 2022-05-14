"use strict";
// Set up media stream constant and parameters.
const mediaStreamConstraints = {
    video: true
    //audio: true
};

// Set up to exchange only video.
const offerOptions = {
    offerToReceiveVideo: 1
    //offerToReceiveAudio: 1
};

const servers = {
    iceServers: [
        {
            urls: "turn:coturn.myserver.com:3478",
            username: "username",
            credential: "password"
        }
    ]
}

let dotNet;
let localStream;
let remoteStream;
let peerConnection;

let isOffering;
let isOffered;

export function initialize(dotNetRef) {
    dotNet = dotNetRef;
}
export async function startLocalStream() {
    console.log("Requesting local stream.");
    localStream = await navigator.mediaDevices.getUserMedia(mediaStreamConstraints);
    return localStream;
}

function createPeerConnection() {
    if (peerConnection != null) return;
    // Create peer connections and add behavior.
    peerConnection = "hello";
    peerConnection = new RTCPeerConnection(servers);
    console.log("Created local peer connection object peerConnection.");

    peerConnection.addEventListener("icecandidate", handleConnection);
    peerConnection.addEventListener("iceconnectionstatechange", handleConnectionChange);
    peerConnection.addEventListener("addstream", gotRemoteMediaStream);

    // Add local stream to connection and create offer to connect.
    peerConnection.addStream(localStream);
    console.log("Added local stream to peerConnection.");
}

// first flow: This client initiates call. Sequence is:
// Create offer - send to peer - receive answer - set stream
// Handles call button action: creates peer connection.
export async function callAction() {
    if (isOffered) return Promise.resolve();

    isOffering = true;
    console.log("Starting call.");
    createPeerConnection();

    console.log("peerConnection createOffer start.");
    let offerDescription = await peerConnection.createOffer(offerOptions);
    console.log(`Offer from peerConnection:\n${offerDescription.sdp}`);
    console.log("peerConnection setLocalDescription start.");
    await peerConnection.setLocalDescription(offerDescription);
    console.log("peerConnection.setLocalDescription(offerDescription) success");
    return JSON.stringify(offerDescription);
}

// Signaling calls this once an answer has arrived from other peer. Once
// setRemoteDescription is called, the addStream event trigger on the connection.
export async function processAnswer(descriptionText) {
    let description = JSON.parse(descriptionText);
    console.log("processAnswer: peerConnection setRemoteDescription start.");
    await peerConnection.setRemoteDescription(description);
    console.log("peerConnection.setRemoteDescription(description) success");
}

// In this flow, the user gets an offer from signaling from a peer.
// In this case, we setRemoteDescription similar to when we got the answer
// in the flow above. srd triggers addStream.
export async function processOffer(descriptionText) {
    console.log("processOffer");
    if (isOffering) return;

    createPeerConnection();
    let description = JSON.parse(descriptionText);
    console.log("peerConnection setRemoteDescription start.");
    await peerConnection.setRemoteDescription(description);

    console.log("peerConnection createAnswer start.");
    let answer = await peerConnection.createAnswer();
    console.log(`Answer: ${answer.sdp}.`);
    console.log("peerConnection setLocalDescription start.");
    await peerConnection.setLocalDescription(answer);

    console.log("dotNet SendAnswer.");
    dotNet.invokeMethodAsync("SendAnswer", JSON.stringify(answer));
}

export async function processCandidate(candidateText) {
    let candidate = JSON.parse(candidateText);
    console.log("processCandidate: peerConnection addIceCandidate start.");
    await peerConnection.addIceCandidate(candidate);
    console.log("addIceCandidate added.");
}

// Handles hangup action: ends up call, closes connections and resets peers.
export function hangupAction() {
    peerConnection.close();
    peerConnection = null;
    console.log("Ending call.");
}

// Handles remote MediaStream success by handing the stream to the blazor component.
async function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    console.log(mediaStream);
    remoteStream = mediaStream;
    await dotNet.invokeMethodAsync("SetRemoteStream");
    console.log("Remote peer connection received remote stream.");
}
export function getRemoteStream() {
    return remoteStream;
}

// Sends candidates to peer through signaling.
async function handleConnection(event) {
    const iceCandidate = event.candidate;

    if (iceCandidate) {
        await dotNet.invokeMethodAsync("SendCandidate", JSON.stringify(iceCandidate));

        console.log(`peerConnection ICE candidate:${event.candidate.candidate}.`);
    }
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log("ICE state change event: ", event);
    console.log(`peerConnection ICE state: ${peerConnection.iceConnectionState}.`);
}


