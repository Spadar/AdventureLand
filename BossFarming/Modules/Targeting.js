game_log("---Targeting Start---");

if(parent.ModulesLoaded == null)
{
	parent.ModulesLoaded = [];
}

parent.ModulesLoaded.push("Targeting");

var pvpDebug = false;//Pretend PvP is enabled on PvE servers
var aggressive = false;//Kills everyone but 'weak' players as defined by isSafe()
var assistPartyLeader = true;
var spreadTargets = false;
var prioritizeAdds = false;
var protectWhitelist = true;

var playerWhitelist = ["Maela"];//player names of who not to attack

var useGreylist = true;
var playerGreylist = {};

var highPriorityPlayers = [];//Short Circuits and attacks these players immediately in PvP
var blacklist = [];//Attacks these players in PvP
var softWhitelist = [];//Always add these people to greylist.

var potentialTargets = {monsters:{}, players:{}};

var bossTargets = ["mrgreen", "jr", "greenjr", "mrpumpkin"]; //Given Top Priority when attacking Monsters.
var mobTargets = [];

var highestPriorityTarget;//Constantly maintained, just check this variable to find who you should be attacking.

var lastPM;

loadExistingEntities();

setInterval(function()
{
	if(parent != null && parent.socket != null)
	{
		var start = window.performance.now();

		var assistTarget;
		var leader = getPlayer(character.party);

		if(assistPartyLeader)
		{
			assistTarget = getLeaderTarget();
		}

		if(!assistPartyLeader || leader == null || leader.hp == 0)
		{
			highestPriorityTarget = getHighestPriorityTarget();
		}
		else
		{
			highestPriorityTarget = assistTarget;
		}
		
	}
    //game_log(window.performance.now() - start);
}, 1);

function getLeaderTarget()
{
	var leaderName = character.party;
	
	if(leaderName != null)
	{
		var leader = getPlayer(leaderName);
		
		if(leader != null && leader.hp > 0)
		{
			var target = parent.entities[leader.target];
			
			if(target != null && (target.type != "character" || (target.name != null && isPvP() && !isPlayerFriendly(target.name))))
			{
				return target;
			}
		}
	}
}

function getPlayer(name)
{
	for(id in parent.entities)
	{
		var entity = parent.entities[id];
		
		if(entity.type == "character" && entity.name == name)
		{
			return entity;
		}
	}
}

function loadExistingEntities()
{
    for(id in parent.entities)
    {
        var entity = parent.entities[id];
		
        if(entity.type == "character")
        {
            tryAddPotentialPlayer(entity);
        }
        else if(entity.type == "monster")
        {
            tryAddPotentialMonster(entity.id, entity.mtype, entity.hp);
        }
		else
		{
			game_log(entity.type);
		}
    }
}

function drawAllPotentialTargets()
{
    var playersIDs = Object.values(potentialTargets.players);
	
    var players = [];
	
    for(id in playersIDs)
    {
        var playerID = playersIDs[id];
        var player = parent.entities[playerID];
		
        if(player != null)
        {
            players.push(player);
        }
    }
	
    for(id in playersIDs)
    {
        var playerID = playersIDs[id];
        var player = parent.entities[playerID];
		
        if(player != null)
        {
            draw_circle(player.real_x,player.real_y, player.range);
        }
    }
	
    var monstersIDs = [];
    var types = Object.keys(potentialTargets.monsters);
	
    for(id in types)
    {
        var mobType = types[id];
		
        var typeMonsters = potentialTargets.monsters[mobType];
		
        if(typeMonsters != null)
        {
            var monsters = Object.values(typeMonsters);
            monstersIDs.push.apply(monstersIDs, monsters);
        }
    }
	
	
    for(id in monstersIDs)
    {
        var monsterID = monstersIDs[id];
        var monster = parent.entities[monsterID];
        //console.log(monsterID);
        if(monster != null)
        {
			var monsterType = parent.G.monsters[monster.mtype];
			
			draw_circle(monster.real_x,monster.real_y, monsterType.range);
        }
    }
}

//Clean out an pre-existing listeners
if (parent.prev_handlerstargeting) {
    for (let [event, handler] of parent.prev_handlerstargeting) {
      parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlerstargeting = [];



function getHighestPriorityTarget()
{
    return getHighestPriorityPlayer()
		|| getHighestPriorityAdd()
        || getHighestPriorityBoss()
        || getHighestPriorityMonster();
}

function getHighestPriorityAdd()
{
	if(prioritizeAdds == false)
	{
		return null;
		
	}
	var adds = [];
	
	for(id in parent.entities)
	{
		var entity = parent.entities[id];
		
		if(entity.type == "monster" && isTargetingParty(id))
		{
		    var bossIndex = bossTargets.indexOf(entity.mtype);
			
			if(bossIndex == -1)
			{
				//Not a boss, if it's targeting us kill it first.
				entity.distance = distance(entity.real_x, entity.real_y, character.real_x, character.real_y);
				adds.push(entity);
			}
		}
	}
	
	adds.sort(function(a, b) {
        if (a.distance > b.distance) {
            return 1;
        } else if (a.distance < b.distance) { 
            return -1;
        }
    });
	
    return adds[0]
}
function getHighestPriorityPlayer()
{
    var playersIDs = Object.values(potentialTargets.players);
	
    var players = [];
	
    for(id in playersIDs)
    {
        var playerID = playersIDs[id];
        var player = parent.entities[playerID];
		
		var playerTarget = null;
		
		if(player != null)
		{
			playerTarget = parent.entities[player.target];
		}
		
		if(player != null && playerTarget != null && playerTarget.mtype == "wabbit")
        {
			if(isGreylisted(player.id))
			{
				pmWarning(message, player.id);
				playerGreylist[player.id].greylisted = false;
				console.log("Removed " + player.id + " from greylist. Reason:  Attacking Wabbit");
			}
            players.push(player);
        }
        else if(player != null && (!isGreylisted(player.id) || !isSafe(player)))
        {
			if(isGreylisted(player.id))
			{
				var message = "You've grown stronger! I'm sorry but I can't consider you harmless anymore and will attack on sight.";
				pmWarning(message, player.id);
				playerGreylist[player.id].greylisted = false;
				console.log("Removed " + player.id + " from greylist. Reason: Too Strong");
			}
            players.push(player);
        }
    }
	
    for(id in players)
    {
        var player = players[id];
		
		if(highPriorityPlayers.includes(player.id))
		{
			return player;
		}
		
        if(player.rip == true || player.ctype == "merchant")
        {
            players.splice(id);
        }
		
        if(player != null)
        {
            player.distance = distance(player.real_x, player.real_y, character.real_x, character.real_y);

            if(player.distance < character.range)
            {
                player.distance = character.range;
            }

            player.DmgHPRatio = getDmgHPRatio(player);
			
			//console.log("Player: " + player.id + " DmgHpRatio:" + player.DmgHPRatio);
        }
    }
	
    players.sort(function(a, b) {
        if (a.distance > b.distance) {
            return 1;
        } else if (a.distance < b.distance) { 
            return -1;
        }

        // Else go to the 2nd item
        if (a.DmgHPRatio < b.DmgHPRatio) { 
            return -1;
        } else if (a.DmgHPRatio > b.DmgHPRatio) {
            return 1
        } else { // nothing to split them
            return 0;
        }
    });
	
	if(players.length > 0)
	{
		console.log("Highest Priority: " + players[0].id);
	}
	
    return players[0]
}

function getHighestPriorityBoss()
{    
	var bosses = [];
    var bossIDs = [];
    for(id in bossTargets)
    {
        var bossType = bossTargets[id];
		
        var typeMonsters = potentialTargets.monsters[bossType];

        if(typeMonsters != null)
        {
            var monsters = Object.values(typeMonsters);
            bosses.push.apply(bossIDs, monsters);
        }
    }
	

	
    for(id in bossIDs)
    {
        var bossID = bossIDs[id];
        var boss = parent.entities[bossID];
		
        if(boss != null)
        {
            bosses.push(boss);
        }
    }
	
	var bossesToDelete = []
	
    for(id in bosses)
    {
        var boss = bosses[id];
		
        if(bossTargets.indexOf(boss.mtype) != -1)
        {
            if(boss.hp == 0)
            {
                bosses.splice(id);
            }
			if(boss == null || boss.hp == 0)
			{
				bossesToDelete.push(boss);
			}
            if(boss != null)
            {
                boss.distance = distance(boss.real_x, boss.real_y, character.real_x, character.real_y);
            }
        }
        else
        {
            bossesToDelete.push(boss);
        }
    }
	
    for(id in bossesToDelete)
    {
        var pendingDelete = bossesToDelete[id]
			
        for(id in bosses)
        {
            var deleteCheck = bosses[id];
				
            if(deleteCheck.id == pendingDelete.id)
            {
                bosses.splice(id, 1);
            }
        }
    }
	
    bosses.sort(function(a, b) {
        if (a.distance > b.distance) {
            return 1;
        } else if (a.distance < b.distance) { 
            return -1;
        }
    });
	
    return bosses[0]
}

function getHighestPriorityMonster()
{
    var monstersIDs = [];
    var types = Object.keys(potentialTargets.monsters);
    for(id in types)
    {
		
        var mobType = types[id];
        var typeMonsters = potentialTargets.monsters[mobType];

        if(typeMonsters != null)
        {
            var monsters = Object.values(typeMonsters);
            monstersIDs.push.apply(monstersIDs, monsters);
        }
    }
	
    var monsters = [];
	
    for(id in monstersIDs)
    {
        var monsterID = monstersIDs[id];
        var monster = parent.entities[monsterID];
		
        if(monster != null)
        {
            monsters.push(monster);
        }
    }
	
    for(id in monsters)
    {
        var monster = monsters[id];
		
        var isTargetType = mobTargets.indexOf(monster.mtype) != -1;
		
        monster.targetingParty = false;
		
        monster.targetingParty = monster.target == character.name ||  parent.party_list.indexOf(monster.target) != -1;
		
		
        var monstersToDelete = []
		
        if(monster == null 
		   || monster.hp == 0 
		   || (!monster.targetingParty && !isTargetType) 
		   || (monster.target != null && !monster.targetingParty))
        {
            monstersToDelete.push(monster);
        }
		
        for(id in monstersToDelete)
        {
            var pendingDelete = monstersToDelete[id]
			
            for(id in monsters)
            {
                var deleteCheck = monsters[id];
				
                if(deleteCheck.id == pendingDelete.id)
                {
                    monsters.splice(id, 1);
                }
            }
        }

        if(monster != null)
        {
            monster.distance = distance(monster.real_x, monster.real_y, character.real_x, character.real_y);
        }
    }
	
    monsters.sort(function(a, b) {
        if(!a.targetingParty && b.targetingParty)
        {
			if(!spreadTargets)
			{
            	return 1;
			}
			else
			{
				return -1
			}
        }
        else if(a.targetingParty && !b.targetingParty)
        {
            if(!spreadTargets)
			{
            	return -1;
			}
			else
			{
				return 1
			}
        }
		
        if (a.distance > b.distance) {
            return 1;
        } 
        else if (a.distance < b.distance) { 
            return -1;
        }
    });
	
    return monsters[0]
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function getDmgHPRatio(entity)
{
    var effectiveHP = getEffectiveHP(entity);
    var effectiveDamage = getEffectiveDamage(entity);
	
    var dmgHPRatio = effectiveDamage/effectiveHP;
	
    var debug = {name: entity.name, effectiveHP: effectiveHP, effectiveDamage: effectiveDamage, ratio: dmgHPRatio};
	
    return dmgHPRatio;
}

function getEffectiveDamage(entity)
{
    var damageMult = 1;
	
    switch(entity.ctype)
    {
        case "priest":
            damageMult = 0.4;
            break;	
    }
	
    return entity.attack * damageMult * entity.frequency;
}

function getEffectiveHP(entity)
{
    var defenseType = "armor";
	
    switch(character.ctype)
    {
        case "merchant":
            defenseType = "armor";
            break;
        case "warrior":
            defenseType = "armor";
            break;
        case "ranger":
            defenseType = "armor";
            break;
        case "rogue":
            defenseType = "armor";
            break;
        case "mage":
            defenseType = "resistance";
            break;
        case "priest":
            defenseType = "resistance";
            break;	
    }
	
    var defense = entity[defenseType]/100 * 0.10;
	
    var effectiveHP = entity.hp + (entity.hp * defense);
	
    return effectiveHP;
}

function isPlayerFriendly(name)
{
	var partyMember = -1;
	
	if(parent.party_list != null)
	{
		partyMember = parent.party_list.indexOf(name);
	}
	
	var whitelistIndex = playerWhitelist.indexOf(name);
	
	var entity = parent.entities[name];
	
	if(partyMember == -1 && whitelistIndex == -1)
	{
		return false;
	}
	else
	{
		return true;
	}
}

function isTargetingParty(id)
{
    var entity = parent.entities[id];
	
    if(entity == null || entity.target == null)
    {
        return false;
    }
	
    var isTargetingParty = false;
	
    if(entity.target == character.name)
    {
        return true;
    }
	
    if(parent.party_list.indexOf(entity.target) != -1)
    {
        return true;
    }
	
    return false;
}

function isPvP()
{
	if(pvpDebug || parent.is_pvp || get_map().pvp)
	{
		return true;
	}
	else
	{
		return false;
	}
}

//handler pattern shamelessly stolen from JourneyOver
function register_targetinghandler(event, handler) 
{
    parent.prev_handlerstargeting.push([event, handler]);
    parent.socket.on(event, handler);
};


function entitesHandler(event)
{	
    if(parent != null)
    {
        var eventClone = JSON.parse(JSON.stringify(event));
        if(eventClone.monsters != null && eventClone.monsters.length > 0)
        {
            for(id in eventClone.monsters)
            {
                var monster = eventClone.monsters[id];
                tryAddPotentialMonster(monster.id, monster.type, monster.hp);
            }
        }

        if(isPvP() && eventClone.players != null && eventClone.players.length > 0)
        {
            for(id in eventClone.players)
            {
                var player = eventClone.players[id];
                tryAddPotentialPlayer(player);
            }
        }
    }
}

function tryAddPotentialMonster(id, mtype, hp)
{
    var bossIndex = bossTargets.indexOf(mtype);
    var mobIndex = mobTargets.indexOf(mtype);

    var targetingParty = isTargetingParty(id);

    //Monster must not be dead.
    //It must not be tagged
    //It must be in either the boss list/mob list, or already attacking a party member
    if(hp > 0 && (bossIndex != -1 || mobIndex != -1 || targetingParty))
    {		
        if(potentialTargets.monsters[mtype] == null)
        {
            potentialTargets.monsters[mtype] = {};
        }

        potentialTargets.monsters[mtype][id] = id;
    }
    else
    {
        if(potentialTargets.monsters[mtype] != null && potentialTargets.monsters[mtype][id] != null)
        {
            delete potentialTargets.monsters[mtype][id];
        }
    }
}

function isGreylisted(id)
{
	var greylistPlayer = playerGreylist[id];
	
	if(greylistPlayer != null && greylistPlayer.greylisted == true)
	{
		return true;
	}
	else
	{
		return false;
	}
}

function isSafe(player)
{
	var safe = player.level < 70 && player.attack < lowestHPPartyMember().hp/4 && !blacklist.includes(player.id);
	
	if(!aggressive && !blacklist.includes(player.id))
	{
		safe = true;
	}
	
	return safe || softWhitelist.includes(player.id);
}

function lowestHPPartyMember()
{
	var lowestHP = character;
	
	if(character.party == null)
	{
		return lowestHP;
	}
	
	for(id in parent.party_list)
	{
		var name = parent.party_list[id];
		
		var entity = parent.entities[name];
		
		if(entity != null && entity.hp < lowestHP.hp)
		{
			lowestHP = entity;
		}
	}
	
	return lowestHP;
	
}

function tryAddPotentialPlayer(player)
{
	var entity = parent.entities[player.id];
	
    if(entity != null && player != null && player.id != "Ace" && (entity.citizen == null || entity.citizen == false))
    {
        var partyMember = parent.party_list.indexOf(player.id);
		
        if(partyMember == -1)
        {
            var whitelistIndex = playerWhitelist.indexOf(player.id);
			
            if(isPvP() && whitelistIndex == -1 && player.hp > 0)
            {
				
				if(useGreylist == true && isSafe(player))
				{
					if(playerGreylist[player.id] == null)
					{
						playerGreylist[player.id] = {removalTimer: new Date(), greylisted: true};
						var allMonsters = [];
						
						allMonsters = allMonsters.concat(mobTargets);
						allMonsters = allMonsters.concat(bossTargets);

						game_log("Grey listing " + player.id + "(" + player.owner + ")");
						var message = "I have added you to my pvp greylist. Unless you attack someone in my group, or attack a monster I'm farming " + JSON.stringify(allMonsters) + ", I won't attack you.";
						
						console.log(player.id + "," + message);
						//pmWarning(message, player.id);
					}
				}
                potentialTargets.players[player.id] = player.id;
            }
            else
            {
                if(potentialTargets.players[player.id] != null)
                {
                    delete potentialTargets.players[player.id];
                }
            }
        }
    }
}

function on_disappear(event)
{
	if(parent != null)
    {
        var entity = event;

        if(entity != null && entity.type == "character")
        {
            if(potentialTargets.players[entity.id] != null)
            {
                delete potentialTargets.players[event.id];
            }
        }
        else if(entity != null && entity.type == "monster")
        {
            if(potentialTargets.monsters[entity.mtype] != null)
            {
                delete potentialTargets.monsters[entity.mtype][entity.id];
            }
        }
    }
}

function deathHandler(event)
{
    if(parent != null)
    {
        var entity = parent.entities[event.id];

        if(entity != null && entity.type == "character")
        {
            if(potentialTargets.players[entity.id] != null)
            {
                delete potentialTargets.players[event.id];
            }
        }
        else if(entity != null && entity.type == "monster")
        {
            if(potentialTargets.monsters[entity.mtype] != null)
            {
                delete potentialTargets.monsters[entity.mtype][entity.id];
            }
        }
    }
}

function hitHandler(event)
{
	if(parent != null)
	{
		var attacker = event.hid;
		var attacked = event.id;

		var attackedEntity = parent.entities[attacked];
		
		if(attacked == character.name)
		{
			attackedEntity = character;
		}

		if(attackedEntity != null && event.heal == null)
		{
			if(attackedEntity.type == "character" 
			   && (isPlayerFriendly(attackedEntity.name))
			  ||
			  (character.party == null && attacked == character.name))
			{
				if(playerGreylist[attacker] != null && playerGreylist[attacker].greylisted == true)
				{
					playerGreylist[attacker].greylisted = false;
					game_log("Removing " + attacker + " from greylist for attacking " + attacked);
					var message = "You were from removed from my greylist for attacking: " + attacked;
					pmWarning(message, attacker);
					console.log("Removed " + player.id + " from greylist. Reason: Attacked Friendly Player");
				}
			}
			else if(attackedEntity.type == "monster" && (bossTargets.includes(attackedEntity.mtype) || mobTargets.includes(attackedEntity.mtype)))
			{
				if(playerGreylist[attacker] != null && playerGreylist[attacker].greylisted == true)
				{
					playerGreylist[attacker].greylisted = false;
					game_log("Removing " + attacker + " from greylist for attacking " + attackedEntity.mtype);
					var message = "You were from removed from my greylist for attacking: " + attacked;
					pmWarning(message, attacker);
					console.log("Removed " + player.id + " from greylist. Reason:  Attacked Target Monster Type");
				}
			}
		}
	}
}

function pmWarning(message, playerName)
{
	if(character.party == null || character.party == character.name)
	{
		if(lastPM == null || new Date() - lastPM > 16000)
		{
			parent.private_say(playerName, message, undefined);
			//socket.emit("say", {message: message,
								//code: 1, name: character.name});
			lastPM = new Date();
		}
	}
}

function new_mapHandler(event)
{
    //Clear Potential Targets
    potentialTargets = {monsters:{}, players:{}};
}

register_targetinghandler("new_map", new_mapHandler);
register_targetinghandler("death", deathHandler);
register_targetinghandler("entities", entitesHandler);
register_targetinghandler("hit", hitHandler);
