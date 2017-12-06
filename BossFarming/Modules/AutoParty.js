game_log("---AutoParty Start---");

if(parent.ModulesLoaded == null)
{
	parent.ModulesLoaded = [];
}

parent.ModulesLoaded.push("AutoParty");

var invites = [];
var accept_invites = ["YOUR PARTY LEADER HERE"];

parent.socket.on('invite', (data) => {
	if(parent != null)
	{
    if (accept_invites.includes(data.name)) {
        parent.socket.emit('party', { event: 'accept', name: data.name });
    }
	}
});
parent.socket.on('request', (data) => {
	if(parent != null)
	{
    if (accept_invites.includes(data.name)) {
        parent.socket.emit('party', { event: 'raccept', name: data.name });
    }
	}
});

var missing_member_list = [];
var invite_missing_members;

function self_invite() {
    // Refreshing Handler
    Party_Handler = setTimeout(self_invite, 1000);

    // Short Circuit
    if (parent.party_list.length >= 6) { return; }

    // Inviting
    let party_members = parent.party_list;
    let missing_members = invites.filter(p => !party_members.includes(p));
    let interval = 1000 / missing_members.length;
    missing_member_list = missing_members;
    invite_missing_members = setInterval(invite_missing, interval);
}
function invite_missing() {
    let invite_member = missing_member_list.shift();
	if(invite_member != null)
	{
		invite(invite_member);
	}
    if (missing_member_list.length <= 0) { clearInterval(invite_missing_members); }
}

var Party_Handler = setTimeout(self_invite, 1000);
parent.stop_partying = function () {
    clearTimeout(Party_Handler);
}
parent.restart_partying = function () {
    clearTimeout(Party_Handler);
    self_invite();
}
var invite = (m) => {
	if(parent != null && parent.socket != null)
	{
		console.debug(`Inviting ${m}, ${missing_member_list.length} to go.`);
		if(m != null)
		{
			parent.socket.emit('party', { event: 'invite', name: m });
			parent.socket.emit('party', { event: 'request', id: m });
		}
	}
}

parent.invite = invite;