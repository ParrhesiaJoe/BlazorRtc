'use strict';

// Set up media stream constant and parameters.

// In this codelab, you will be streaming video only: "video: true".
// Audio will not be streamed because it is set to "audio: false" by default.
const mediaStreamConstraints = {
    video: true,
};

// Set up to exchange only video.
const offerOptions = {
    offerToReceiveVideo: 1,
};

// Define initial start time of the call (defined as connection between peers).
let startTime = null;

// Define peer connections, streams and video elements.
const localVideo = document.getElementById('localVideo');
localVideo.addEventListener('loadedmetadata', logVideoLoaded);

const remoteVideo = document.getElementById('remoteVideo');
remoteVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('onresize', logResizedVideo);

// WebRtc
let localStream;
let remoteStream;
let peerConnection;

// Define and add behavior to buttons.
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// Interop. Wrapper for Index.razor.
let dotNet;

// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;

// Sets the MediaStream as the video element src.
function gotLocalMediaStream(mediaStream) {
    localVideo.srcObject = mediaStream;
    localStream = mediaStream;
    trace('Received local stream.');
    createPeerConnection();
    callButton.disabled = false;  // Enable call button.
}

// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error) {
    trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

// Handles remote MediaStream success by adding it as the remoteVideo src.
function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace('Remote peer connection received remote stream.');
}

// Add behavior for video streams.

// Logs a message with the id and size of a video element.
function logVideoLoaded(event) {
    const video = event.target;
    trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
        `videoHeight: ${video.videoHeight}px.`);
}

// Logs a message with the id and size of a video element.
// This event is fired when video begins streaming.
function logResizedVideo(event) {
    logVideoLoaded(event);

    if (startTime) {
        const elapsedTime = window.performance.now() - startTime;
        startTime = null;
        trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
    }
}


// Define RTC peer connection behavior.

// Connects with new peer candidate.
function handleConnection(event) {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;

    if (iceCandidate) {
        dotNet.invokeMethodAsync('SetCandidate', JSON.stringify(iceCandidate));

        trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
            `${event.candidate.candidate}.`);
    }
}

// Logs that the connection succeeded.
function handleConnectionSuccess(peerConnection) {
    trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
};

// Logs that the connection failed.
function handleConnectionFailure(peerConnection, error) {
    trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n` +
        `${error.toString()}.`);
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
    const peerConnection = event.target;
    trace('ICE state change event: ', event);
    trace(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
    const peerName = getPeerName(peerConnection);
    trace(`${peerName} ${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description) {
    trace(`Offer from peerConnection:\n${description.sdp}`);

    trace('peerConnection setLocalDescription start.');
    peerConnection.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(peerConnection);
        }).catch(setSessionDescriptionError);

    dotNet.invokeMethodAsync('SetOffer', JSON.stringify(description));
    return;
}
export function processAnswer(descriptionText) {
    let description = JSON.parse(descriptionText);
    trace('processAnswer');
    trace('peerConnection setRemoteDescription start.');
    peerConnection.setRemoteDescription(description)
        .then(() => {
            setRemoteDescriptionSuccess(peerConnection);
        }).catch(setSessionDescriptionError);
}

export function processCandidate(candidateText) {
    let candidate = JSON.parse(candidateText);
    trace('processCandidate');
    trace('peerConnection addIceCandidate start.');
    peerConnection.addIceCandidate(candidate)
        .then(() => {
            setRemoteDescriptionSuccess(peerConnection);
        }).catch(setSessionDescriptionError);
}

export function processOffer(descriptionText) {
    let description = JSON.parse(descriptionText);
    trace('processOffer');
    trace('peerConnection setRemoteDescription start.');
    peerConnection.setRemoteDescription(description)
        .then(() => {
            setRemoteDescriptionSuccess(peerConnection);
        }).catch(setSessionDescriptionError);

    trace('peerConnection createAnswer start.');
    peerConnection.createAnswer()
        .then(createdAnswer)
        .catch(setSessionDescriptionError);
}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(answer) {
    trace(`Answer from remote:\n${answer.sdp}.`);

    trace('peerConnection setLocalDescription start.');
    peerConnection.setLocalDescription(answer)
        .then(() => {
            setRemoteDescriptionSuccess(peerConnection);
        }).catch(setSessionDescriptionError);

    dotNet.invokeMethodAsync('SetAnswer', JSON.stringify(answer));
}

// Handles start button action: creates local MediaStream.
export function startAction(dotNetRef) {
    dotNet = dotNetRef;
    startButton.disabled = true;
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
    trace('Requesting local stream.');
}
function createPeerConnection() {
    const servers = {
        iceServers: [
            {
                urls: 'turn:coturn.myserver.com:3478',
                username: 'username',
                credential: 'password'
            }
        ]
    }
    // Create peer connections and add behavior.
    peerConnection = new RTCPeerConnection(servers);
    trace('Created local peer connection object peerConnection.');

    peerConnection.addEventListener('icecandidate', handleConnection);
    peerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
    peerConnection.addEventListener('addstream', gotRemoteMediaStream);

    // Add local stream to connection and create offer to connect.
    peerConnection.addStream(localStream);
    trace('Added local stream to peerConnection.');

}
// Handles call button action: creates peer connection.
export function callAction() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    trace('Starting call.');
    startTime = window.performance.now();

    // Get local media stream tracks.
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();
    if (videoTracks.length > 0) {
        trace(`Using video device: ${videoTracks[0].label}.`);
    }
    if (audioTracks.length > 0) {
        trace(`Using audio device: ${audioTracks[0].label}.`);
    }

    trace('peerConnection createOffer start.');
    peerConnection.createOffer(offerOptions)
        .then(createdOffer).catch(setSessionDescriptionError);
}

// Handles hangup action: ends up call, closes connections and resets peers.
export function hangupAction() {
    peerConnection.close();
    peerConnection = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
    trace('Ending call.');
}

// Gets the name of a certain peer connection.
function getPeerName(peerConnection) {
    return 'peerConnection';
}

// Logs an action (text) and the time when it happened on the console.
function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(now, text);
}
