game_log("---Communications Start---");

if(parent.ModulesLoaded == null)
{
	parent.ModulesLoaded = [];
}

parent.ModulesLoaded.push("Comms");

//Override disconnect to allow code execution to continue.
//parent.disconnect = function(){};

var servers = {};
servers["EU1"] = {name: "EU1", ip: "52.59.255.62", port: "8090"};
//servers["EU2"] = {name: "EU2", ip: "52.59.255.62", port: "8092"};
servers["AM1"] = {name: "AM1", ip: "54.242.16.227", port: "8090"};
servers["EUP"] = {name: "EUP", ip: "52.59.255.62", port: "8091"};
servers["AMP"] = {name: "AMP", ip: "54.242.16.227", port: "8091"};
servers["EL1"] = {name: "EL1", ip: "54.169.213.59", port: "8090"};

var teleChase = false;

var scoutOverride;

var entityResponse;
var respondingToScout = false;
var scoutTarget;
var originalPos = {x: character.real_x, y: character.real_y, map: character.map};
var haltAttack = false;
var minTimeBetweenAlerts = 1000;
var lastAlert;

var oldDisconnect = parent.disconnect;

var reconnectDelay = 100;

function on_cm(name,data)
{
}

function scoutFoundTarget(target)
{
    if(lastAlert == null || new Date() - lastAlert > minTimeBetweenAlerts)
    {
        target = highestPriorityTarget;
        console.log(target);
        game_log("Target " + target.id + " spotted!");
        sendCMToParty({name: "assistance_request", id: target.id, type: target.type, mtype: target.mtype, x: target.real_x, y: target.real_y, map: target.in});
			
        lastAlert = new Date();
    }
}

var lastEntityRequest
function requestEntity(target)
{
    if(lastEntityRequest == null || new Date() - lastEntityRequest > 1000)
    {
		game_log("Requesting entity from " + target);
        sendCMToParty({name: "entity_request", target: target, sender: character.id});
        lastEntityRequest = new Date();
    }
}

function findScoutTarget()
{
	return parent.entities[scoutTarget.id];
}

function respondToScout() {
    if (scoutTarget != null) {
        if (highestPriorityTarget == null || mobTargets.includes(highestPriorityTarget.mtype)) {
            var distToScoutPos = distance(character.real_x, character.real_y, scoutTarget.x, scoutTarget.y);
            if (character.map != scoutTarget.map || distToScoutPos > 25) {
                goToPoint(scoutTarget.x, scoutTarget.y, scoutTarget.map, true, true);
            }
            else {
                //All Clear
                game_log("All Clear");
                goToPoint(originalPos.x, originalPos.y, originalPos.map, true);
                scoutTarget = null;
                respondingToScout = false;
            }
        }
        else {
			var kiting = followKitePath();
			
			if(!kiting)
			{
				goToPoint(highestPriorityTarget.real_x, highestPriorityTarget.real_y, highestPriorityTarget.in, true, true);
			}
        }
    }
    else {
        respondingToScout = false;
    }
}

if (parent.prev_handlerscomms) {
    for (let [event, handler] of parent.prev_handlerscomms) {
      parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlerscomms = [];

function sendCMToParty(message)
{
    for(id in parent.party_list)
    {
        var player = parent.party_list[id];
        if(player != character.name)
        {
            parent.send_code_message(player, message);
        }
    }
}

//Looks for a spawn at an X,Y Coordinate. Returns null if there isn't one.
function findSpawn(mapName, coordinate)
{
    var map = parent.G.maps[mapName];
	
    var index = 0;
    for(id in map.spawns)
    {
        var spawn = map.spawns[id];
		
        if(spawn[0] == coordinate.x && spawn[1] == coordinate.y)
        {
            return index;
        }
		
        index++;
    }
}

//handler pattern shamelessly stolen from JourneyOver
function register_commshandler(event, handler) 
{
    parent.prev_handlerscomms.push([event, handler]);
    parent.socket.on(event, handler);
};

//Report teleport actions to the party if party lead
function transport_handler(transport)
{
    if(character.party == character.name)
    {	
        var commandName = "transport";
	
        var map = transport.name;
	
        var coordinate = {x: transport.x, y: transport.y};
		
        var spawn = findSpawn(map, coordinate);
	
        var command = {name: commandName, to: map, s: spawn};
	
        sendCMToParty(command);
    }
}

function codemessage_handler(message)
{	
	if(parent != null)
	{
		console.log(message);
		
		if((message.name != character.name && parent.party_list.includes(message.name)) || message.name == scoutOverride)
		{
			var command = getCommand(message.message);
			if(command != null)
			{
				executeCommand(command);
			}
			else
			{
			}
		}
	}
}

//Logic for performing commands.
function executeCommand(command)
{
    switch(command.name)
    {
        case "transport":
            game_log("Executing Teleport");
            parent.socket.emit(command.name, {to: command.to, s: command.s});
            break;
        case "assistance_request":
			if(respondingToScout == false)
			{
            	game_log("Responding to request for assistance");
			}
			
			if(highestPriorityTarget == null 
			   ||!bossTargets.includes(highestPriorityTarget.mtype))
			{
				scoutTarget = command;
				
				if(command.type == "character")
				{
					if(playerGreylist[command.id] == null)
					{
						playerGreylist[command.id] = {};
					}
					
					playerGreylist[command.id].greylisted = false;
				}
				
				respondingToScout = true;
			}
            break;
        case "entity_request":
            if(command.target == character.name)
            {
                sendCMToParty({name: "entity_response", entity: 
							   {id: character.id, name: character.name, real_x: character.real_x, real_y: character.real_y, angle: character.angle, map: character.map, range: character.range}, sender: command.sender});
            }
            break;
        case "entity_response":
            if(command.sender == character.id)
            {
                entityResponse = command.entity;
            }
            break;
		case "server_change":
			if(character.name == character.party)
			{
				sendCMToParty({name: "server_change", serverName: command.serverName});
			}
			changeServer(command.serverName);
			break;
		case "stop_attack":
			{
				if(haltAttack == false)
				{
					game_log("Holding Attacks");
				}
					
				haltAttack = true;
			}
			break;
		case "start_attack":
			{
				if(haltAttack == true)
				{
					game_log("Starting Attacks");
				}
					
				haltAttack = false;
			}
			break;
    }
}

//Removes the command component from a command message.
function getCommand(message)
{	
    var obj;
	
    try
    {
        obj = JSON.parse(message);
    }
    catch(err)
    {
        return null;
    }
	
    return obj;
}

function isMapPvP(mapname)
{
    var map = parent.G.maps[mapname];
    if(map != null && (parent.is_pvp || map.pvp))
    {
        return true;
    }
    else
    {
        return false;
    }
}

function currentServer()
{
	var serverMatch = Object.values(servers).filter(s => s.ip == parent.server_addr && s.port == parent.server_port);
	
	if(serverMatch.length != 0)
	{
		return serverMatch[0].name;
	}
	else
	{
		return null;
	}
}

function changeServer(name)
{
	changeServerRefresh(name);
}

function changeServerFast(name)
{
	var server = servers[name];
	
	function disconnected()
	{
	}

	parent.disconnect = disconnected;
	
	game_log("Closing connection to current server...");
	if(parent.socket != null)
	{
		parent.socket.close();
	}
	
	character.parent.removeChild(character);
	
	game_log('Initializing Connection to new server...');
	parent.server_addr = server.ip;
	parent.server_port = server.port;
	parent.init_socket();
	
	setTimeout(function()
	{
		var user_id = parent.user_id;
		var real_id = parent.real_id;
		var user_auth = parent.user_auth;
		
		game_log('Logging in...');
		parent.log_in(user_id,real_id,user_auth);
		parent.disconnect = oldDisconnect;
	}, reconnectDelay);
}

function changeServerRefresh(servername)
{
	if(parent != null && parent.socket != null && new Date() > parent.next_transport)
	{
		game_log("Changing Servers");
		//parent.setTimeout(function()
				   //{
					//Not loading code due to looping, but eventually will want this.
					var code = parent.codemirror_render.getValue()

					var server = servers[servername];
					var refreshTime = new Date((new Date()).getTime() + 1000);
					var b = {
							ip: server.ip,
							port: server.port,
							code: code,
							time: refreshTime,
							mstand: null
							};
					parent.window.localStorage.setItem("reload" + parent.server_region + parent.server_identifier, JSON.stringify(b));
					parent.window.localStorage.setItem("character_" + parent.real_id, JSON.stringify(b));
					parent.window.localStorage.setItem("extension_" + parent.real_id, JSON.stringify(b));
					parent.reload_state = 'synced';
					parent.manual_reload = true;
					//parent.window.location = parent.window.location.origin + "?load=" + parent.real_id + "&times=" + 0
		//}, 2000);
		parent.socket.disconnect();
	}
}

parent.changeServer = changeServer;

function disappear_handler(event)
{
	if(character.party != null && character.party != character.name && event.id == character.party)
	{
		console.log(event);
		game_log("Following party leader's teleport");
		var s = 0;
		
		if(event.s != null)
		{
			s = event.s;
		}
		
		var spawn = parent.G.maps[event.to].spawns[s];
		
		goToPoint(spawn[0], spawn[1], event.to, true, true, true);
	}
}

//Register event handlers
register_commshandler("cm", codemessage_handler);
register_commshandler("new_map", transport_handler);
register_commshandler("disappear", disappear_handler);

parent.disconnect = function() {
    var a = "DISCONNECTED"
      , b = "Disconnected";
    game_loaded = false;
    if (window.disconnect_reason == "limits") {
        a = "REJECTED";
        add_log("Oops. You exceeded the limitations.", "#83BDCF");
        add_log("You can use one character on a normal server, one additional character on a PVP server and one merchant.", "#CF888A")
    } else {
        if (window.disconnect_reason) {
            add_log("Disconnect Reason: " + window.disconnect_reason, "gray")
        }
    }
    if (character && parent.manual_reload == null && (auto_reload == "on" || auto_reload == "auto" && (character.stand || code_run || 1))) {
        auto_reload = true;
        code_to_load = null;
        if (code_run) {
            code_to_load = codemirror_render.getValue()
        }
        b = "Reloading";
        add_log("Auto Reload Active", colors.serious_red);
        reload_state = "start"
    }
    $("body").children().each(function() {
        if (this.tagName != "CANVAS" && this.id != "bottomrightcorner" && this.id != "bottomleftcorner2") {
            $(this).remove()
        } else {
            if (this.id == "bottomrightcorner" || this.id == "bottomleftcorner2") {
                this.style.zIndex = 2000
            }
        }
    });
    $("body").append("<div style='position: fixed; top: 0px; left: 0px; right: 0px; bottom: 0px; z-index: 999; background: rgba(0,0,0,0.85); text-align: center'><div onclick='refresh_page()' class='gamebutton clickable' style='margin-top: " + (round(height / 2) - 10) + "px'>" + a + "</div></div>");
    if (character) {
        $("title").html(b + " - " + character.name)
    }
    if (socket) {
        socket = null,
        socket.disconnect()
    }
}