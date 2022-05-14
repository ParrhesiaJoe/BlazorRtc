using Microsoft.AspNetCore.SignalR;

namespace BlazorRtc.Server.Hubs;

/// <summary>
/// Users create channels
/// </summary>
public class MessageHub : Hub
{
    public async Task Join(string channel)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, channel);
        await Clients.OthersInGroup(channel).SendAsync("Join", Context.ConnectionId);
    }
    public async Task Leave(string channel)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, channel);
        await Clients.OthersInGroup(channel).SendAsync("Leave", Context.ConnectionId);
    }

    // Used in rtc.razor/webrtcservice.cs
    public async Task SignalWebRtc(string channel, string type, string payload)
    {
        await Clients.OthersInGroup(channel).SendAsync("SignalWebRtc", channel, type, payload);
    }

    // Used on index.razor
    public async Task Offer(string channel, string offer)
    {
        await Clients.OthersInGroup(channel).SendAsync("ReceiveOffer", offer);
    }
    public async Task Answer(string channel, string answer)
    {
        await Clients.OthersInGroup(channel).SendAsync("ReceiveAnswer", answer);
    }
    public async Task Candidate(string channel, string candidate)
    {
        await Clients.OthersInGroup(channel).SendAsync("ReceiveCandidate", candidate);
    }
}