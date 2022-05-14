# WebRtc, Coturn, SignalR and Blazor WebAssembly
Blazor WebAssembly offers a compelling environment on which to develop peer-to-peer applications. The browser is the ultimate in no-install ease of use, and WASM is blazingly fast.

In our sample application, we stream video over WebRTC in a Blazor WebAssembly application using javascript interop and SignalR as the WebRTC signaling channel. There are two approaches used in this application.

First, in Index.razor, we use a code-behind JS file which interacts with the elements on the razor page directly. This makes it easy to set the stream on the video directly, rather than passing complex objects through Blazor to be used in other js calls through interop. Also, the Index.razor.js sample makes much more use of the .then() pattern, as opposed to async/await.

Since the Google samples were written using the .then() pattern, I wanted to refactor the code to async/await as a good example of a straight conversion. 

WebRTCService shows a more service-oriented approach on the Blazor size, and a more modern async/await pattern in the javascript. The accompanying javascript is placed in wwwroot, rather than alongside the coupled WebRTCService Blazor class. The WebRTCService is added to services in program.cs, and used in Rtc.razor/Rtc.razor.js.

This pair of classes is very slim. Almost all the heavy lifting is done in WebRTCService.
One note: WebRTCService has a standard .net event. This should be replaced with a weak event. I normally use PeanutButter.TinyEventAggregator.

## WebRTC
To make a WebRTC call, you create a RTCPeerConnection(options) in JavaScript and call CreateOffer(options) on that. The offer that gets created must be sent to the other party. When they receive the offer, they create a RTCPeerConnection and setRemoteDescription(offer) on it. The sender also sends connection candidates, which the receiver passes to addIceCandidate(candidate) on RTCPeerConnection. Next, they call createAnswer() and send it back to the original party. Once the answer is received by the original person, we have everything we need to create a WebRTC connection.

## Signaling
The offer, answer, and connection candidates must be sent back and forth between offeror and answerer. This is called 'signaling'. In our case, the Blazor app is connected to an Asp.Net Core webserver with SignalR installed. A single hub, MessageHub handles all SignalR traffic too and from the parties, using a very simple named channel.

## Coturn
WebRTC needs a Stun/Turn server to get around firewalls. 
The easiest way to install Coturn is on a Linux server with Docker. A command to bring up a Coturn server in a single command is. 

`docker run -d --network=host coturn/coturn -n --log-file=stdout --external-ip='$(detect-external-ip)' --relay-ip='$(detect-external-ip)'`

Running Coturn in this way sets up stun/turn on the server over port 3478. Stun servers typically don't take credentials, but Turn relays are way more expensive, so they usually have a password. This should be changed in production, but the defaults are:

            username: 'username'
            credential: 'password'

Note that some documentation has this listed as 'credentials' with an 's'. WRONG.

            credentials: 'password'
 
