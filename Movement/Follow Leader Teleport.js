//The below code needs to be run by the Party Leader, and anyone in the party that wishes to automatically follow through teleports.

//Identifies command messages in chat.
var commandPrefix = "[COMMAND]"; 

//Clean out an pre-existing listeners
if (parent.prev_handlerslocal) {
    for (let [event, handler] of parent.prev_handlerslocal) {
      parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlerslocal = [];

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
function register_handler(event, handler) 
{
	parent.prev_handlerslocal.push([event, handler]);
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
	
		var command = JSON.stringify({name: commandName, to: map, s: spawn});
	
		parent.party_say("[COMMAND]" + command, 1);
	}
}

//Listen for commands, execute commands given by party leader.
function partymessage_handler(message)
{
	if(message.owner == character.party && message.owner != character.name)
	{
		var chatMessage = message.message;
	
		if(isCommand(chatMessage))
		{
			var command = getCommand(chatMessage);
			
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
	if(command.name == "transport")
	{
		game_log("Executing Teleport");
		parent.socket.emit(command.name, {to: command.to, s: command.s});
	}
}

//Verifies that the command prefix is at the beginning of the message
function isCommand(message)
{
	if(message.substring(0, commandPrefix.length) == commandPrefix)
	{
		return true;
	}
	else
	{
		return false;
	}
}

//Removes the command component from a command message.
function getCommand(message)
{
	var command = message.substring(commandPrefix.length, message.length);
	
	var obj;
	
	try
	{
		obj = JSON.parse(command);
	}
	catch(err)
	{
		return null;
	}
	
	return obj;
}


//Register event handlers
register_handler("partym", partymessage_handler);
register_handler("new_map", transport_handler);