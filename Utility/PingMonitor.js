var pingSent;
var pingReceived;
var pingInterval = 1000;
var pingThreshold = 5000;
var reconnecting = false;

parent.socket.removeAllListeners("ping_ack");

setInterval(function()
			{
	if(pingReceived || pingReceived == null)
	{
		console.log("Ping Sent");
		parent.socket.emit("ping_trig", {});

		pingSent = new Date();
		pingReceived = false;
	}
}, pingInterval);

//Clean out an pre-existing listeners
if (parent.prev_handlerspingmonitor) {
    for (let [event, handler] of parent.prev_handlerspingmonitor) {
      parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlerspingmonitor = [];

//handler pattern shamelessly stolen from JourneyOver
function register_pingmonitorhandler(event, handler) 
{
    parent.prev_handlerspingmonitor.push([event, handler]);
    parent.socket.on(event, handler);
};

function pingmonitor_ack()
{
	var ping = new Date() - pingSent;
	
	parent.lastPing = ping;
	
	console.log("Ping Received: " + ping);
	
	if(ping > pingThreshold)
	{
		game_log("PING LIMIT EXCEEDED");
		if(!reconnecting)
		{
			//Disconnect in 1 second.
			setTimeout(function()
					   {
			parent.location.reload();
			}, 1000);
		}
		reconnecting = true;
	}
	
	pingReceived = true;
}


register_pingmonitorhandler("ping_ack", pingmonitor_ack);
