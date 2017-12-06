auto_reload();

if(character.skin != "mm_blue")
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

assistPartyLeader = false;

var leadName = "YOUR PARTY LEADER HERE";
setInterval(function(){
if(character.party != null && character.party != leadName)
{
	parent.socket.emit("party",{event:"leave"});
}},1000);
var lastEntityRequest;

var lastUpgrade = null;

var lastAttack;
var minTimeBetweenTargetChanges = 100;
var lastTargetChange;
var minTimeBetweenAttacks = 100;

//Targeting&AttackInterval
setInterval(function(){
	
	if(highestPriorityTarget != null)
	{	
		if((bossTargets.includes(highestPriorityTarget.mtype) && highestPriorityTarget.target != null)
			  || !bossTargets.includes(highestPriorityTarget.mtype))
		{
			if(distance(highestPriorityTarget.real_x, highestPriorityTarget.real_y, character.real_x, character.real_y) > character.range + 100)
			{
				tryCharge();
			}
			
			if(highestPriorityTarget.target != null && highestPriorityTarget.target != leadName && highestPriorityTarget.target != character.name)
			{
				tryTaunt(highestPriorityTarget);
			}
			
			if(can_attack(highestPriorityTarget) && !haltAttack)
			{
				hammer_attack(highestPriorityTarget);
			}
		}
	}
	
	equip_shield();
},1);

setInterval(function(){
	tryHeal();
	loot();
	var leadTarget = findTargetByName(leadName);
	var requestUpdate = false;
	var map = character.map;
	if(leadTarget == null)
	{
		requestUpdate = true;
		if(entityResponse != null)
		{
			leadTarget = entityResponse;
			map = leadTarget.map;
		}
	}
	else
	{
		entityResponse = null;
	}
	
	var tagTarget = highestPriorityTarget;
	
	if(tagTarget != null && tagTarget.rip == true)
	{
		tagTarget = null;
	}
	
	if(leadTarget != null)
	{	var targetPoint
		if(tagTarget == null || distance(leadTarget.real_x, leadTarget.real_y, character.real_x, character.real_y) > leadTarget.range )
		{
			if(distance(leadTarget.real_x, leadTarget.real_y, character.real_x, character.real_y) > 200)
			{
				tryCharge(highestPriorityTarget);
			}
			
			targetPoint = pointOnAngle(leadTarget, entityAngle(leadTarget) + Math.PI, 40);
		}
		else
		{
			var dist = distance(tagTarget.real_x, tagTarget.real_y, character.real_x, character.real_y);
			targetPoint = pointOnAngle(tagTarget, angleToPoint(tagTarget.real_x, tagTarget.real_y), character.range - 50);
		}
		
		var combat = false;
	 
	 	if(tagTarget != null)
		{
			combat = true;
		}
	 
		goToPoint(targetPoint.x, targetPoint.y, map, true, true, combat);
	}
	
	if(leadTarget == null || requestUpdate)
	{
		requestEntity(leadName);
	}
			
},100);

var lastEquipShield;
function equip_shield()
{
	if(lastEquipShield == null || new Date() - lastEquipShield > 100)
	{
		var shieldIndex = scanInventoryForItemIndex("shield");
		if(shieldIndex != null)
		{
			unequip("mainhand");
			equip(shieldIndex);
		}
		lastEquipShield = new Date();
	}
}

var lastHammerAttack;
function hammer_attack(target)
{
	if(lastAttack == null || new Date() - lastAttack > 1000/character.frequency)
	{
		var hammerIndex = scanInventoryForItemIndex("basher");
		if(hammerIndex != null)
		{
			unequip("offhand");
			equip(hammerIndex);
		}
		
		silent_attack(target);
		
		if(hammerIndex != null)
		{
			equip(hammerIndex);
		}
		
		if(hammerIndex == null)
		{
			var shieldIndex = scanInventoryForItemIndex("sshield");
			if(shieldIndex != null)
			{
				equip(shieldIndex);
			}
		}
		
		lastHammerAttack = new Date();
	}
}

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

var lastCharge;
function tryCharge(target)
{
	var cooldown = parent.G.skills["charge"].cooldown;
	if((lastCharge == null || new Date() - lastCharge > cooldown))
	{
		parent.socket.emit("ability", {
		name: "charge"
		});
		lastCharge = new Date();
	}
}

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

var lastTaunt;
function tryTaunt(target)
{
	var cooldown = parent.G.skills["taunt"].cooldown;
	if(lastTaunt == null || new Date() - lastTaunt > cooldown)
	{
		parent.socket.emit("ability", {
		name: "taunt",
		id: target.id
		});
		lastTaunt = new Date();
	}
}

function entityAngle(entity)
{
	return (entity.angle * Math.PI)/180;
}

function angleToPoint(x, y)
{
	var deltaX = character.real_x - x;
	var deltaY = character.real_y - y;
	
	return Math.atan2(deltaY, deltaX);
}

function pointOnAngle(entity, angle, distance)
{
	var circX = entity.real_x + (distance * Math.cos(angle));
	var circY = entity.real_y + (distance * Math.sin(angle));
	
	return {x: circX, y: circY};
}

function offsetToPoint(x, y)
{
	var angle = angleToPoint(x, y) + Math.PI;
	
	return angle - characterAngle();
	
}

function distanceToPoint(x, y)
{
	return Math.sqrt(Math.pow(character.real_x - x, 2) + 							Math.pow(character.real_y - y, 2));
}

function findTargetByName(name)
{
	for(id in parent.entities)
    {
        var current=parent.entities[id];
		
		if(current.name == name)
		{
			return current;
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
