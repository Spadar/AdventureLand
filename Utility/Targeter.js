//Example Usage
var targeter = new Targeter({goo: 2, mole: 1}, ["Foaly"], ["Maela"], {UseGreyList: true, RequireLOS: true, DebugPVP: false, TagTargets: true});

setInterval(function(){
	var targets = targeter.GetPriorityTarget(3);
	clear_drawings();
	if(targets)
	{
		console.log(targets);
		for(var id in targets)
		{
			var target = targets[id];
			draw_circle(target.real_x, target.real_y, 20);
		}
	}
}, 100);


/*
	priorityArgs:
		An object that describes what priority a mtype will be given.
		You will always target an accessible priority 1 monster before a priority 2 monster.
		Players are given a priority of zero.
		Example:
		{
			goo: 1,
			bee: 2
		}
		
	whitelist:
		An array of player names which defines players that will under no circumstances be targeted.
		Example:
			["Foaly", "SpadarFaar"]
	blacklist:
		An array of player names which defines players that will always be targeted if in a PvP environment.
		Example:
			["Foaly", "SpadarFaar"]
	args:
		An object containing additional optional configuration options.
		Example (Default Values):
			{
				UseGreyList: true, //If this is false then all players not whitelisted are attacked on sight.
				RequireLOS: true, //If this is false then monsters located on the other side of obstacles will be targeted.
				DebugPVP: false, //If this is true then players will be targeted in non-pvp areas.
				TagTargets: true //If this is false then only monsters which are already targeting the party will be targeted.
				
			}
		
*/
function Targeter(priorityArgs, whitelist, blacklist, args)
{
	//Set up configuration
	this.TargetingPriority = priorityArgs;
	this.WhiteList = whitelist;
	this.BlackList = blacklist;
	this.GreyList = {};
	
	if(args.UseGreyList === undefined){
		args.UseGreyList = true;
	}
	this.UseGreyList = args.UseGreyList;
	
	if(args.RequireLOS === undefined){
		args.RequireLOS = true;
	}
	this.RequireLOS = args.RequireLOS;
	
	if(args.DebugPVP === undefined){
		args.DebugPVP = false;
	}
	this.DebugPVP = args.DebugPVP;
	
	if(args.TagTargets === undefined){
		args.TagTargets = true;
	}
	this.TagTargets = args.TagTargets;
	
	/*
		Primary targeting function.
		
		If you specify count, an array of the top n targets will be returned, otherwise only the closest, highest priority, target will be returned.
	*/
	this.GetPriorityTarget = function(count){
		let potentialTargets = [];
		
		for(let id in parent.entities)
		{
			let entity = parent.entities[id];
			
			if(this.IsPVP() && entity.type == "character" && !entity.npc && !entity.rip)
			{
				if(this.GreyList[entity.id] === undefined)
				{
					this.GreyListPlayer(entity);
				}
				
				if(!this.IsPlayerSafe(entity))
				{
					let targetArgs = {};
					targetArgs.priority = 0;
					targetArgs.distance = parent.distance(character, entity);
					targetArgs.entity = entity;
					potentialTargets.push(targetArgs);
				}
			}
			else
			{
				if(entity.type == "monster")
				{
					if((this.TagTargets && entity.target == null) || this.IsTargetingParty(entity))
					{
						if(this.TargetingPriority[entity.mtype] != null)
						{
							if(!this.RequireLOS || can_move_to(entity.real_x, entity.real_y))
							{
								let targetArgs = {};
								targetArgs.priority = this.TargetingPriority[entity.mtype];
								targetArgs.distance = parent.distance(character, entity);
								targetArgs.entity = entity;
								potentialTargets.push(targetArgs);
							}
						}
					}
				}
			}
		}
		
		potentialTargets.sort(function(a, b) {
			if(a.priority > b.priority)
			{
				return 1;
			}
			else if(a.priority < b.priority)
			{
				return -1;
			}
			else if(a.distance > b.distance)
			{
				return 1;
			}
			else
			{
				return -1;
			}
		});
		
		if(potentialTargets.length > 0)
		{
			if(!count)
			{
				return potentialTargets[0].entity;
			}
			else
			{
				return potentialTargets.slice(0, count).map(a => a.entity);
			}
		}
		
		return null;
	};
	
	/*
		Returns if the player is currently in a PvP environment.
	*/
	this.IsPVP = function(){
		if(this.DebugPVP || parent.is_pvp || get_map().pvp)
		{
			return true;
		}
		else
		{
			return false;
		}
	}
	
	/*
		Returns if the provided entity is targeting either the player or the player's party.
	*/
	this.IsTargetingParty = function(entity){
		if(entity.target == character.id)
		{
			return true;
		}
		
		if(parent.party_list.indexOf(entity.id) > -1)
		{
			return true;
		}
		
		return false;
	}
	
	/*
		Returns if, according to our configuration, a player should be attacked or not.
	*/
	this.IsPlayerSafe = function(entity){
		
		if(parent.party_list.indexOf(entity.id) > -1)
		{
			return true;
		}
		
		if(this.BlackList.indexOf(entity.id) > -1)
		{
			return false;
		}
		
		if(this.WhiteList.indexOf(entity.id) > -1)
		{
			return true;
		}
		
		let greyListEntry = this.GreyList[entity.id];
		
		
		if(this.UseGreyList && (greyListEntry === undefined || greyListEntry === true))
		{
			return true;
		}
		
		return false;
	};
	
	/*
		Adds a player to the GreyList, which is used to allow players to not be attacked unless instigated.
	*/
	this.GreyListPlayer = function(entity){
		if(entity.type == "character")
		{
			game_log("Adding " + entity.id + " to GreyList.");
			this.GreyList[entity.id] = true;
		}
	};
	
	/*
		Marks a player on the GreyList to be no longer considered safe. This means that they will be attacked in PvP environments.
	*/
	this.RemoveFromGreyList = function(name){
		this.GreyList[name] = false;
	};
	
	/*
		Returns whether or not we want to consider hostile action against this player a reason to engage the aggressor in PvP.
	*/
	this.IsPlayerFriendly = function(name){
		if(character.id == name)
		{
			return true;
		}
		
		if(parent.party_list.indexOf(name) > -1)
		{
			return true;
		}
		
		return false;
	}
	
	//Set up hit event handling to react when attacked
	
	//Clean out an pre-existing listeners
	if (parent.prev_handlerstargeting) {
		for (let [event, handler] of parent.prev_handlerstargeting) {
		  parent.socket.removeListener(event, handler);
		}
	}

	parent.prev_handlerstargeting = [];

	//handler pattern shamelessly stolen from JourneyOver
	function register_targetinghandler(event, handler) 
	{
		parent.prev_handlerstargeting.push([event, handler]);
		parent.socket.on(event, handler);
	};
	
	let targeter = this;
	this.hitHandler = function(event){
		console.log(event);
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
				if(attackedEntity.type == "character" && targeter.IsPlayerFriendly(attacked))
				{
					
					targeter.RemoveFromGreyList(attacker);
					game_log("Removing " + attacker + " from greylist for attacking " + attacked);
				}
			}
		}
	}

	register_targetinghandler("hit", this.hitHandler);
}