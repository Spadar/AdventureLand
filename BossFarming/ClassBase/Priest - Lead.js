auto_reload();
parent.auto_reload = "on";

if(character.skin != "mf_blue")
{
	parent.socket.emit('activate',{slot:'ring1'});
}

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
					  "Comms", "DynamicKitePaths", "InventoryManagement",
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

itemTransferTarget = "YOUR MERCHANT HERE";

dpsInterval = 60000;

var startTime = new Date();

var respawnWaitTime = 75;

var logoutWait = 45000;

invites = ["YOUR GROUP MEMBERS HERE"];
var bossesToCheck = ["xscorpion"];
bossTargets.push("mrpumpkin");
var viableMaps = ["cave", "main", "halloween", "winterland", "tunnel", "winterland", "arena", "spookytown"];
var bossIndex = 0;
var bossSpawnIndex = 0;
var serverHop = true;
var serverTargets = ["EU1", "AM1", "EL1", "EUP", "AMP"];
var bossID;
scoutOverride = "YOUR SCOUT HERE";

var chestLootCount = 1;

var lootState = false;

var kite = false;

teleChase = false;

mobTargets = ["xscorpion"];

var pauseMovement = false;

function changeServerLead(serverName)
{
	sendCMToParty({name: "server_change", serverName: serverName});

	setTimeout(function () 
	{
		changeServer(serverName);
	}, 1000);
}

parent.changeServerLead = changeServerLead;

function checkActiveServer()
{
	var activeServer = localStorage.getItem("Active_Server");

	if(new Date - startTime > logoutWait && activeServer != null)
	{

		if(currentServer() != activeServer)
		{
			sendCMToParty({name: "server_change", serverName: activeServer});

			setTimeout(function () 
			{
				changeServer(activeServer);
			}, 1000);
		}
	}
}

var lastAttackControl = new Date();

setInterval(function(){
	if(parent != null && parent.socket != null)
	{
		checkActiveServer();
	}
}, 250);

function findLowestHPPartyMember() {
    if (character.party == null) {
        return null;
    }

    var lowestHP;
    for (id in parent.entities) {
        var current = parent.entities[id];

        if (character.party != null && current.party == character.party && current.id != character.id) {
            if (lowestHP == null || (current.hp < lowestHP.hp && current.hp / current.max_hp < 0.75)) {
                lowestHP = current;
            }
        }
    }

    if (lowestHP != null && lowestHP.hp / lowestHP.max_hp < 0.85) {
        return lowestHP;
    }
}

//Targeting&AttackInterval
setInterval(function () {
	if(parent != null && parent.socket != null)
	{
		var healTarget = findLowestHPPartyMember();

		if (character.hp / character.max_hp < 0.85) {
			if (can_heal(character)) {
				book_heal(character);
			}
		}
		if (healTarget != null && healTarget.hp / healTarget.max_hp < 0.75) {
			if (can_heal(healTarget)) {
				book_heal(healTarget);
			}
		}

		if (highestPriorityTarget != null && can_attack(highestPriorityTarget) && !haltAttack) {
				book_attack(highestPriorityTarget);
			tryCurse(highestPriorityTarget);
		}
	}
}, 50);

var midasSlot = scanInventoryForItemIndex("handofmidas", 10);
var lastEvacuate;
setInterval(function () {
	if(parent != null && parent.socket != null)
	{
		tryHeal();

		if (numEmptyInvSlots() > 0) {
			var numChests = getNumChests()
			if (numChests >= chestLootCount && lootState == false) {
				lootState = true;

				var invSlot = findBoosterSlot();

				//shift(invSlot, "goldbooster");

				var tryUpdateMidasSlot = scanInventoryForItemIndex("handofmidas", 10);
				if (tryUpdateMidasSlot != null) {
					midasSlot = tryUpdateMidasSlot;
				}

				if (midasSlot != null) {;
					//equip(midasSlot)
				}
			}
			else if (numChests == 0 && lootState == true) {
				lootState = false;

				var invSlot = findBoosterSlot();

				//shift(invSlot, "luckbooster");

				if (midasSlot != null) {
					//equip(midasSlot);
				}
			}
		}

		if (lootState == true) {
			if ((lastLoot == null || new Date() - lastLoot > 500)) {

				loot();

				lastLoot = new Date();
			}
		}
		if(!pauseMovement)
		{
			if(needPotions())
			{
				goToPoint(-60, -100, "main", true, true, true);
			}
			else if (!respondingToScout) {
				if(highestPriorityTarget != null)
				{
					var kiting = followKitePath();

					if(kiting == false)
					{
						var movePos = pointOnAngle(highestPriorityTarget, angleToPoint(highestPriorityTarget.real_x, highestPriorityTarget.real_y), 100);
						goToPoint(movePos.x, movePos.y, character.map, true, true, true);
					}
				}
				else
				{
					checkBossSpawns();
				}
			}
			else if (respondingToScout) {
				respondToScout();
			}
		}
	}
}, 50);

var lastLoot = null;

//Functions
var lastAttack;
function silent_attack(target)
{
	if(lastAttack == null || new Date() - lastAttack > 1000/character.frequency)
	{
		if(target != null)
		{
			if(target.type == "character")
			{
				parent.socket.emit("click", 
				{
					type: "player_attack",
					id: target.id,
					button: "right"
				});
			}
			else
			{
				parent.socket.emit("click", 
				{
					type: "monster",
					id: target.id,
					button: "right"
				});
			}
			
			lastAttack = new Date();
		}
	}
}

var lastHeal;
function book_heal(target)
{
	if(lastAttack == null || new Date() - lastAttack > 1000/character.frequency)
	{
		var bookindex = scanInventoryForItemIndex("wbook0");
		if(bookindex != null)
		{
			equip(bookindex);
		}
		parent.socket.emit("click", {
            type: "player_heal",
            id: target.id,
            button: "right"
        });
		if(bookindex != null)
		{
			equip(bookindex);
		}
		
		if(bookindex == null)
		{
			var shieldIndex = scanInventoryForItemIndex("sshield");
			if(shieldIndex != null)
			{
				equip(shieldIndex);
			}
		}
		
		lastHeal = new Date();
	}
}

var lastBookAttack;
function book_attack(target)
{
	if(lastAttack == null || new Date() - lastAttack > 1000/character.frequency)
	{
		var bookindex = scanInventoryForItemIndex("wbook0");
		if(bookindex != null)
		{
			equip(bookindex);
		}
		
		silent_attack(target);
		
		if(bookindex != null)
		{
			equip(bookindex);
		}
		
		if(bookindex == null)
		{
			var shieldIndex = scanInventoryForItemIndex("sshield");
			if(shieldIndex != null)
			{
				equip(shieldIndex);
			}
		}
		
		lastBookAttack = new Date();
	}
}

var lastCurse = null;
function tryCurse(target)
{
	
	
	if((lastCurse == null || new Date() - lastCurse > 500) && (target.s.cursed == null || target.s.cursed == 0))
	{
		parent.socket.emit("ability", {name:"curse", id:target.id});
	}
	
	lastCurse = new Date();
}

function getNumChests() {
    var count = 0;
    for (id in parent.chests) {
        count++;
    }

    return count;
}

function findBoosterSlot() {
    var booster = scanInventoryForItemIndex("xpbooster");

    if (booster == null) {
        booster = scanInventoryForItemIndex("luckbooster");
    }

    if (booster == null) {
        booster = scanInventoryForItemIndex("goldbooster");
    }

    return booster;
}

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
	
	if(character.mp < 1000)
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

function offsetToPoint(x, y)
{
	var angle = angleToPoint(x, y) + Math.PI;
	
	return angle - characterAngle();
	
}

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

function characterAngle() {
    return (character.angle * Math.PI) / 180;
}

function getInventorySlot(slot) {
    var slot = character.items[slot];

    return slot
}

function scanInventoryForItem(name, maxLevel) {
    for (var i = 0; i <= 41; i++) {
        var curSlot = character.items[i];

        var itemGrade = item_grade(curSlot);

        if (curSlot != null && curSlot.name == name) {
            if (maxLevel == null || curSlot.level < maxLevel) {
                return curSlot
            }
        }
    }
}

function scanInventoryForItemIndex(name, maxLevel) {
    for (var i = 0; i <= 41; i++) {
        var curSlot = character.items[i];

        if (curSlot != null && curSlot.name == name) {
            if (maxLevel == null || curSlot.level < maxLevel) {
                return i
            }
        }
    }
}

function numEmptyInvSlots() {
    var count = 0;
    for (var i = 0; i <= 41; i++) {
        var curSlot = character.items[i];

        if (curSlot == null) {
            count++;
        }
    }

    return count;
}

function distanceToPoint(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
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
	
	if(bossID == null && parent.entities[bossID] == null)
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
			if(serverHop && new Date() - startTime > logoutWait)
			{
				var server = currentServer();
				
				console.log(server);
				
				var serverIndex = serverTargets.indexOf(server);
				
				var targetServerIndex = serverIndex + 1;
				
				if(targetServerIndex > serverTargets.length - 1)
				{
					targetServerIndex = 0;
				}
				
				var targetServer = serverTargets[targetServerIndex];
				
				//sendCMToParty({name: "server_change", serverName: targetServer});
				
				//game_log(targetServer);
				//game_log(serverIndex);
				
				//setTimeout(function () 
				//{
					//changeServer(targetServer);
    			//}, 1000);
			}
		}
	}
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