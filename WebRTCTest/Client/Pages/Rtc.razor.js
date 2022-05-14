const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
export function setLocalStream(stream) {
    localVideo.srcObject = stream;
}

export function setRemoteStream(stream) {
    remoteVideo.srcObject = stream;
}