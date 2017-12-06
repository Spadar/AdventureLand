auto_reload();

function load_code_cache(name,onerror) // onerror can be a function that will be executed if load_code fails
{
	if(!onerror) onerror=function()
	{ 
		game_log("load_code: Failed to load","#E13758"); 
	}
	
	var code = localStorage.getItem("CODE_" + name);
	
	if(code != null)
	{
		var library=document.createElement("script");
		library.type="text/javascript";
		library.text=code;
		library.onerror=onerror;
		code = library;
		
		game_log("Code Fetched From Cache");
	}
	
	if(code == null || code == "")
	{
		var xhrObj = new XMLHttpRequest();
		xhrObj.open('GET',"/code.js?name="+encodeURIComponent(name)+"&timestamp="+(new Date().getTime()), false);
		xhrObj.send('');
		var library=document.createElement("script");
		library.type="text/javascript";
		library.text=xhrObj.responseText;
		library.onerror=onerror;
		code = library;
		localStorage.setItem("CODE_" + name, code.text);
		game_log("Code Fetched From Server");
	}
	document.getElementsByTagName("head")[0].appendChild(code);
}

var requiredModules = ["Targeting", "Pathfinding", "AutoUpgrade",
					  "Comms",
					  "AutoParty"];

function loadModules()
{
	for(id in requiredModules)
	{
		var module = requiredModules[id];
		load_code_cache(module);
	}
	
	var allLoaded = true;
	
	for(id in requiredModules)
	{
		var module = requiredModules[id];
		
		loadedIndex = parent.ModulesLoaded.indexOf(module);
		
		if(loadedIndex == -1)
		{
			allLoaded = false
		}
	}
	
	parent.successful_load = allLoaded;
}

loadModules();

setInterval(function()
{
	if(parent.socket != null)
	{
		parent.last_contact = new Date();
	}
}, 1000);

assistPartyLeader = "false";

var commTargetOverride = "YOUR PARTY LEADER HERE";

var startTime = new Date();

var minTimeBetweenAlerts = 1000;
var lastAlert;
var target;
var lastTarget;
var bossIndex = 0;
var bossSpawnIndex = 0;
var bossesToCheck = ["mrpumpkin", "mrgreen", "jr", "greenjr"];
var viableMaps = ["cave", "main", "halloween", "winterland", "tunnel", "winterland", "arena", "spookytown"];

var bossID;

var teleport = false;
var lastEvacuate;
var serverHop = true;
var serverTargets = ["AM1", "EL1", "EU1", "EUP", "AMP"];
var excludeServers = [];
var homeServer = "EUP";

setInterval(function(){
	
	
	//setUnknownServers();
	
	if(highestPriorityTarget != null 
	  && (bossTargets.includes(highestPriorityTarget.mtype) || highestPriorityTarget.type == "character"))
	{
		if(lastAlert == null || new Date() - lastAlert > minTimeBetweenAlerts)
		{
			target = highestPriorityTarget;
			
			if(serverHop == true)
			{
				localStorage.setItem("Active_Server", currentServer());
			}
			
			game_log("Target " + target.id + " spotted!");
			
			var priority = "low";
			
			if(target.type == "character" && (lastTarget == null || lastTarget.id != highestPriorityTarget.id))
			{
				priority = "high";
			}
			
			lastTarget = highestPriorityTarget
			lastAlert = new Date();
			
			sendCMToParty({name: "assistance_request", id: target.id, type: target.type, mtype: target.mtype, x: target.real_x, y: target.real_y, map: target.in, priority: priority});
		}
		
		var movePos = pointOnAngle(highestPriorityTarget, angleToPoint(highestPriorityTarget.real_x, highestPriorityTarget.real_y), 300);
		goToPoint(movePos.x, movePos.y, character.map, true, true, true);
	}
	else
	{
		//localStorage.setItem("Active_Server", homeServer); //Send Group Back to Home Server
	}
},1);

setInterval(function(){
	if(character.hp/character.max_hp < 0.5)
	{
		if(lastEvacuate == null || new Date() - lastEvacuate > 1000)
		{
				set_message("Evacuating");
				parent.socket.emit('town');
				lastEvacuate = new Date();
		}
	}
	if(highestPriorityTarget == null 
	   || (!bossesToCheck.includes(highestPriorityTarget.mtype) 
	   && highestPriorityTarget.type != "character"))
	{
		if((bossID == null || parent.entities[bossID] == null) && character.hp/character.max_hp > 0.8)
		{
			bossID = null;
			checkBossSpawns();
			set_message("Scouting");
		}
		else
		{
			goToPoint(character.real_x, character.real_y, character.map, true, true, false);
		}
	}
	else
	{
		bossID = highestPriorityTarget.id;
	}
	
	tryHeal();
	
	if(character.rip) 
	{
		respawn();
	}
},250);

function pointOnAngle(entity, angle, distance)
{
	var circX = entity.real_x + (distance * Math.cos(angle));
	var circY = entity.real_y + (distance * Math.sin(angle));
	
	return {x: circX, y: circY};
}

function entityAngle(entity)
{
	return (entity.angle * Math.PI)/180;
}

function angleToPoint(x, y) {
    var deltaX = character.real_x - x;
    var deltaY = character.real_y - y;

    return Math.atan2(deltaY, deltaX);
}

function sendCMToParty(m) {
	if(!commTargetOverride)
	{
	  parent.party_list
		.forEach(c => {
		if (c == character.name) { return; }
		parent.send_code_message(c, m);
	  });
	}
	else
	{
		parent.send_code_message(commTargetOverride, m);
	}
}

function checkBossSpawns(continueToNext)
{
	var boss = bossesToCheck[bossIndex];
	var mapSpawns = findMonsterSpawns(boss);
	
	var spawns = [];
	
	for(spawn in mapSpawns)
	{
		if(viableMaps.includes(spawn))
		{
			spawnObjs = mapSpawns[spawn];
			for(var spawnObj of spawnObjs)
			{
				spawnObj.map = spawn;
				spawns.push(spawnObj);
			}
		}
	}
	
	var curSpawn = spawns[bossSpawnIndex];
	
	goToPoint(curSpawn.center.x, curSpawn.center.y, curSpawn.map, true, true, false);
	
	if(bossID == null || parent.entities[bossID] == null)
	{
		if(distance(character.real_x, character.real_y, curSpawn.center.x, curSpawn.center.y) < 25)
		{
			nextSpawn();
		}
	}
}

function nextSpawn()
{
	var boss = bossesToCheck[bossIndex];
	var mapSpawns = findMonsterSpawns(boss);
	
	var spawns = [];
	
	for(spawn in mapSpawns)
	{
		if(viableMaps.includes(spawn))
		{
			spawnObjs = mapSpawns[spawn];
			for(var spawnObj of spawnObjs)
			{
				spawnObj.map = spawn;
				spawns.push(spawnObj);
			}
		}
	}
	
	var curSpawn = spawns[bossSpawnIndex];
	
	bossSpawnIndex += 1;
		
	if(bossSpawnIndex > spawns.length - 1)
	{
		bossIndex += 1;
		bossSpawnIndex = 0;
			
		if(bossIndex > bossesToCheck.length - 1)
		{
			bossIndex = 0;
			if(serverHop && new Date() - startTime > 40000 && parent.manual_reload == null)
			{
				var server = currentServer();
				
				var serverIndex = serverTargets.indexOf(server);
				
				var targetServerIndex = serverIndex + 1;
				
				
				if(targetServerIndex > serverTargets.length - 1)
				{
					targetServerIndex = 0;
				}
				
				var targetServer = serverTargets[targetServerIndex];
				
				//sendCMToParty({name: "server_change", serverName: targetServer});
				
				if(targetServer != server && targetServer != null)
				{
					game_log(targetServer);
					game_log(serverIndex);

					changeServer(targetServer);
				}
			}
		}
	}
}

var lastPotionBuy = null;
function tryHeal()
{
	var potionToUse = null;
	
	if(character.hp <= character.max_hp - 400)
	{
		potionToUse = "hpot1";
	}
	else if(character.hp <= character.max_hp - 200)
	{
		potionToUse = "hpot0";
	}
	else if(character.mp <= character.max_mp - 300)
	{
		potionToUse = "mpot0";
	}
	
	if(character.mp < 500)
	{
		potionToUse = "mpot1";
	}
	
	if(potionToUse != null)
	{
		var pots = scanInventoryForItem(potionToUse);

		if(pots != null && new Date() > parent.next_potion && pots.q >= 1)
		{
			var potSlot = scanInventoryForItemIndex(potionToUse);
			use(potSlot);
		}
	}
}

function scanInventoryForItem(name, maxLevel)
{
	for(var i = 0; i <= 41; i++)
	{
		var curSlot = character.items[i];
		
		var itemGrade = item_grade(curSlot);
		
		if(curSlot != null && curSlot.name == name)
		{
			if(maxLevel == null || curSlot.level < maxLevel)
			{
				return curSlot
			}
		}
	}
}

function scanInventoryForItemIndex(name, maxLevel)
{
	for(var i = 0; i <= 41; i++)
	{
		var curSlot = character.items[i];
		
		if(curSlot != null && curSlot.name == name)
		{
			if(maxLevel == null || curSlot.level < maxLevel)
			{
				return i
			}
		}
	}
}

function handle_death()
{
	setTimeout(respawn,15000);
	return true;
}

if (parent.prev_handlersscout) {
    for (let [event, handler] of parent.prev_handlersscout) {
      parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlersscout = [];

//handler pattern shamelessly stolen from JourneyOver
function register_scouthandler(event, handler) 
{
    parent.prev_handlersscout.push([event, handler]);
    parent.socket.on(event, handler);
};

var skipLimit = 1000;
var lastSkip;
function failure_handler(event)
{
	if(lastSkip == null || new Date() - lastSkip > skipLimit)
	{
		if(event == "cant_enter")
		{
			lastSkip = new Date();
			game_log("Spawn is closed, switching to next");
			nextSpawn();
		}
	}
}

//Register event handlers
register_scouthandler("game_response", failure_handler);
