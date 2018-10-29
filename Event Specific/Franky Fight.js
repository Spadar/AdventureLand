//Working Variables
var lastAttack = 0;
var lastMove = 0;
var lastPotion = 0;
var targeter = new Targeter({nerfedmummy: 1, franky: 2}, [], [], {UseGreyList: true, RequireLOS: true, DebugPVP: false, TagTargets: true});

//PRIMARY LOOP
setInterval(function(){
	clear_drawings();
	if(new Date() - lastPotion > 2050)
	{
		use_hp_or_mp();
		lastPotion = new Date();
	}
	
	switch(character.ctype)
	{
		case "ranger":
			rangerCombat();
			break;
		case "priest":
			priestCombat();
			break;
		default: 
			defaultCombat();
	}
	
}, 1);


//CLASS COMBAT BEHAVIORS
function rangerCombat(){
	var targets = targeter.GetPriorityTarget(3);
	for(var id in targets)
	{
		var target = targets[id];
		draw_circle(target.real_x, target.real_y, 20);
	}
	if(targets)
	{
		var primaryTarget = targets[0];

		if(primaryTarget)
		{
			if(primaryTarget.mtype != "franky" || primaryTarget.target != null)
			{
				if(new Date() - lastMove > 100)
				{
					var targetPoint = pointOnAngle(targets[0], angleToPoint(targets[0].real_x, targets[0].real_y), character.range - 10);
					move(targetPoint.x, targetPoint.y);
				}

				if(targets.length == 1 || character.level < 60)
				{
					if(can_attack(primaryTarget) && new Date() - lastAttack > 1000/character.frequency + 30)
					{
						attack(primaryTarget);
						lastAttack = new Date();
					}
				}
				else
				{
					try3Shot(targets);
				}
			}
		}
	}
}

function priestCombat(){
	var lowestHPAlly = getLowestHealthAlly();
	
	if(lowestHPAlly.hp/lowestHPAlly.max_hp < 0.99)
	{
		if(new Date() - lastMove > 100)
		{
			var targetPoint = pointOnAngle(lowestHPAlly, angleToPoint(lowestHPAlly.real_x, lowestHPAlly.real_y), character.range - 10);
			move(targetPoint.x, targetPoint.y);
		}
		
		if(can_attack(lowestHPAlly) && new Date() - lastAttack > 1000/character.frequency + 30)
		{
			heal(lowestHPAlly);
			lastAttack = new Date();
		}
	}
	else
	{
		var targets = targeter.GetPriorityTarget(1);
		for(var id in targets)
		{
			var target = targets[id];
			draw_circle(target.real_x, target.real_y, 20);
		}
		if(targets)
		{
			var primaryTarget = targets[0];
			if(primaryTarget)
			{
				if(primaryTarget.mtype != "franky" || primaryTarget.target != null)
				{
					if(new Date() - lastMove > 100)
					{
						var targetPoint = pointOnAngle(primaryTarget, angleToPoint(primaryTarget.real_x, primaryTarget.real_y), character.range - 10);
						move(targetPoint.x, targetPoint.y);
					}

					if(can_attack(primaryTarget) && new Date() - lastAttack > 1000/character.frequency + 30)
					{
						attack(primaryTarget);
						lastAttack = new Date();
					}
				}
			}
		}
	}
}

function defaultCombat(){
	var targets = targeter.GetPriorityTarget(1);
	for(var id in targets)
	{
		var target = targets[id];
		draw_circle(target.real_x, target.real_y, 20);
	}
	if(targets)
	{
		var primaryTarget = targets[0];

		if(primaryTarget)
		{
			if(primaryTarget.mtype != "franky" || primaryTarget.target != null)
			{
				if(new Date() - lastMove > 100)
				{
					var targetPoint = pointOnAngle(primaryTarget, angleToPoint(primaryTarget.real_x, primaryTarget.real_y), character.range - 10);
					move(targetPoint.x, targetPoint.y);
				}

				if(can_attack(primaryTarget) && new Date() - lastAttack > 1000/character.frequency + 30)
				{
					attack(primaryTarget);
					lastAttack = new Date();
				}
			}
		}
	}
}

//UTILITY FUNCTIONS
function getLowestHealthAlly()
{
	var lowestHPEntity;
	var lowestPercentage;
	for(var id in parent.entities)
	{
		var entity = parent.entities[id];
		
		if(entity.type == "character" && !entity.citizen)
		{
			var percentHP = entity.hp/entity.max_hp;
			
			if(lowestPercentage == null || percentHP < lowestPercentage)
			{
				lowestHPEntity = entity;
				lowestPercentage = percentHP;
			}
		}
	}
	
	return lowestHPEntity;
}

//ABILITIES
var last3shot;
function try3Shot(targets)
{
	var ids = [];
	
	for(target in targets)
	{
		ids.push(targets[target].id);
	}

	if(lastAttack == null || new Date() - lastAttack > 1000/character.frequency + 30)
	{
		parent.socket.emit("skill", {
			name: "3shot",
			ids: ids
			});
		lastAttack = new Date();
	}
}

//MATH FUNCTIONS
function entityAngle(entity)
{
	return (entity.angle * Math.PI)/180;
}

function angleFromPointToPoint(x1, y1, x2, y2)
{
	var deltaX = x1 - x2;
	var deltaY = y1 - y2;
	
	return Math.atan2(deltaY, deltaX);
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

//TARGETING

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
			
			if(this.IsPVP() && entity.type == "character" && !entity.npc)
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
					if((this.TagTargets) || this.IsTargetingParty(entity))
					{
						if(this.TargetingPriority[entity.mtype] != null || this.IsTargetingParty(entity))
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


//ENTITY AVOIDANCE
//Usages
//move(x,y) has been overridden to operate via vectors, and will allow avoidance while moving
//smart_move has been overridden to allow avoidance to happen during the path following process

//CONFIGURATION

//Entity Avoidance Configuration
var debugDrawing = false;//Set this to false to stop drawing debug information.
var buffer = 20; //How far out from the minimum range do we want to start?
var charDistance = 30; //Minimum range for players
var avoidPlayers = true;//Do we want to avoid players at all?
var avoidMTypes = [];//What type of monsters do we want to avoid?

var entityScaleMult = 20;//How 'Hard' the avoidance vector will push us away.

//Override base move to hook into the vector logic
function move(x, y)
{
	//Stop smart moving if we are currently doing so.
	if(smart.moving)
	{
		stop();
	}
	curVectorTarget = {x: x, y: y};
}
//holds the current position that we're trying to get to.
var curVectorTarget;

//Loop trying to move along our current calculated vector.
setInterval(function(){
	//If we're smart moving update the target position to the current path node.
	if(smart.moving)
	{
		var currentNode = smart.plot[0];
		
		if(currentNode != null && currentNode.map == currentNode.map)
		{
			if(can_move_to(currentNode))
			{
				curVectorTarget = smart.plot[0];
			}
			else
			{
				curVectorTarget = null;
				smart_move({x: smart.x, y: smart.y, map: smart.map}, smart.on_done);
			}
		}
	}
	MoveOnVector();
}, 50);

//Calculate our overall movement vector and move along it.
var lastMove;
function MoveOnVector()
{
	if(debugDrawing){
		clear_drawings();
		if(curVectorTarget)
		{
			draw_circle(curVectorTarget.x, curVectorTarget.y, 20);
		}
	}
	//Start with a base vector of 0,0
	var moveVector = new Vector();

	//Get the vector which represents a direction which will move us away from any nearby entities and add it to the base vector
	var entityAvoidVector = getEntityAvoidVector();
	moveVector.add(entityAvoidVector);

	//If we have somewhere we want to go, add a vector representing that direction to our current base. If we're close scale back the vector to keep us from overshooting.
	if(curVectorTarget != null)
	{
		var dist = distance2D(curVectorTarget.x, curVectorTarget.y);
		
		if(dist > 0)
		{
			var vectorMag = 15;
			if(dist < 15)
			{
				vectorMag = dist;
			}

			var pathVector = new Vector(curVectorTarget.x - character.real_x, curVectorTarget.y - character.real_y).normalize().multiply(vectorMag);
			moveVector.add(pathVector);
		}
		else
		{
			curVectorTarget = null;
		}
	}
	
	var len = moveVector.length();
	//If the vector is too large, scale it back to a maximum
	if(len > 25)
	{
		moveVector = moveVector.normalize().multiply(25);
	}
	
	//Only move if we have to move an appreciable distance
	if(len > 1)
	{
		if(lastMove == null || new Date() - lastMove > 100)
		{
			parent.move(moveVector.x + character.real_x, moveVector.y + character.real_y);
			lastMove = new Date();
		}
	}
	
	if(debugDrawing)
	{
		var drawVector = new Vector(moveVector.x, moveVector.y);
		var drawLen = drawVector.length();
		drawVector.normalize().multiply(drawLen + 10);
		
		draw_line(character.real_x, character.real_y, drawVector.x + character.real_x, drawVector.y + character.real_y, 1, 0xEA1010);
	}
}

//Caculates a vector which opposes all nearby entities which match the configuration.
function getEntityAvoidVector()
{
	//Start with a base vector of 0,0
	var vector = new Vector();
	//Loop through all entities
	for(id in parent.entities)
	{
		var entity = parent.entities[id];
		
		//Is this a monster we want to avoid?
		var isMonsterToAvoid = avoidMTypes.indexOf(entity.mtype) != -1;
		
		//Or a player we want to avoid?
		var isPlayerToAvoid = entity.type == "character" && !entity.citizen && avoidPlayers;
		
		if(isMonsterToAvoid || isPlayerToAvoid)
		{
			//Base distance is character distance
			var minDist = charDistance;
			
			//If it's a monster, use the monsters range
			if(entity.mtype)
			{
				var range = parent.G.monsters[entity.mtype].range;
				minDist = range + buffer;
			}
			//Add our buffer value to this to determine the max distance;
			var maxDist = minDist + buffer;
			
			
			//What is our current distance to the entity?
			var dist = distance2D(entity.real_x, entity.real_y);
			
			//If we're within our max distance, we need to start avoiding it.
			if(dist < maxDist)
			{
				if(debugDrawing)
				{
					draw_circle(entity.real_x, entity.real_y, minDist, 1, 0xDAEA10);
				}
				
				//Create a normalized vector which represents the direction from the entity towards the player 
				var entVector = new Vector(character.real_x - entity.real_x, character.real_y - entity.real_y).normalize();
				
				//Scale this vector so that maxDist = 0 and minDist = 1
				//This allows far entities to push on our character weaker and close entities to push stronger.
				var scale = 1 - ((dist - minDist) / (maxDist - minDist));
				
				var scaledVector = entVector.multiply(scale*entityScaleMult);
				
				//Add the scaled vector to our base.
				vector = vector.add(scaledVector);
			}
		}
	}
	
	//If our vector is too long, limit it
	if(vector.length() > 25)
	{
		vector = vector.normalize().multiply(25);
	}
	return vector
}

function distance2D(x2, y2)
{
	var a = character.real_x - x2;
	var b = character.real_y - y2;

	var c = Math.sqrt( a*a + b*b );
	
	return c;
}

//Modify Smart Move Logic to let the avoidance code manage the moving.
smart_move_logic = function()
{
	if(!smart.moving) return;
	if(!smart.searching && !smart.found)
	{
		start_pathfinding();
	}
	else if(!smart.found)
	{
		if(Math.random()<0.1)
		{
			parent.move(character.real_x+Math.random()*0.0002-0.0001,character.real_y+Math.random()*0.0002-0.0001);
			parent.d_text(shuffle(["Hmm","...","???","Definitely left","No right!","Is it?","I can do this!","I think ...","What If","Should be","I'm Sure","Nope","Wait a min!","Oh my"])[0],character,{color:shuffle(["#68B3D1","#D06F99","#6ED5A3","#D2CF5A"])[0]});
		}
		continue_pathfinding();
	}
	else if(can_walk(character) && !is_transporting(character))
	{
		if(!smart.plot.length)
		{
			smart.moving=false;
			smart.on_done(true);
			return;
		}
		var current=smart.plot[0];
		
		if(current.map == character.map)
		{
			
			var distCurrent = parent.simple_distance({x: character.real_x, y: character.real_y}, {x: current.x, y: current.y});
			
			if(distCurrent < 5)
			{
				smart.plot.splice(0,1);
			}
		}
		
		if(current.town)
		{
			use("town");
		}
		else if(current.transport)
		{
			parent.socket.emit("transport",{to:current.map,s:current.s});
			// use("transporter",current.map);
		}
	}
}

/*
Simple 2D JavaScript Vector Class
Hacked from evanw's lightgl.js
https://github.com/evanw/lightgl.js/blob/master/src/vector.js
*/

function Vector(x, y) {
	this.x = x || 0;
	this.y = y || 0;
}

/* INSTANCE METHODS */

Vector.prototype = {
	negative: function() {
		this.x = -this.x;
		this.y = -this.y;
		return this;
	},
	add: function(v) {
		if (v instanceof Vector) {
			this.x += v.x;
			this.y += v.y;
		} else {
			this.x += v;
			this.y += v;
		}
		return this;
	},
	subtract: function(v) {
		if (v instanceof Vector) {
			this.x -= v.x;
			this.y -= v.y;
		} else {
			this.x -= v;
			this.y -= v;
		}
		return this;
	},
	multiply: function(v) {
		if (v instanceof Vector) {
			this.x *= v.x;
			this.y *= v.y;
		} else {
			this.x *= v;
			this.y *= v;
		}
		return this;
	},
	divide: function(v) {
		if (v instanceof Vector) {
			if(v.x != 0) this.x /= v.x;
			if(v.y != 0) this.y /= v.y;
		} else {
			if(v != 0) {
				this.x /= v;
				this.y /= v;
			}
		}
		return this;
	},
	equals: function(v) {
		return this.x == v.x && this.y == v.y;
	},
	dot: function(v) {
		return this.x * v.x + this.y * v.y;
	},
	cross: function(v) {
		return this.x * v.y - this.y * v.x
	},
	length: function() {
		return Math.sqrt(this.dot(this));
	},
	normalize: function() {
		return this.divide(this.length());
	},
	min: function() {
		return Math.min(this.x, this.y);
	},
	max: function() {
		return Math.max(this.x, this.y);
	},
	toAngles: function() {
		return -Math.atan2(-this.y, this.x);
	},
	angleTo: function(a) {
		return Math.acos(this.dot(a) / (this.length() * a.length()));
	},
	toArray: function(n) {
		return [this.x, this.y].slice(0, n || 2);
	},
	clone: function() {
		return new Vector(this.x, this.y);
	},
	set: function(x, y) {
		this.x = x; this.y = y;
		return this;
	}
};

/* STATIC METHODS */
Vector.negative = function(v) {
	return new Vector(-v.x, -v.y);
};
Vector.add = function(a, b) {
	if (b instanceof Vector) return new Vector(a.x + b.x, a.y + b.y);
	else return new Vector(a.x + v, a.y + v);
};
Vector.subtract = function(a, b) {
	if (b instanceof Vector) return new Vector(a.x - b.x, a.y - b.y);
	else return new Vector(a.x - v, a.y - v);
};
Vector.multiply = function(a, b) {
	if (b instanceof Vector) return new Vector(a.x * b.x, a.y * b.y);
	else return new Vector(a.x * v, a.y * v);
};
Vector.divide = function(a, b) {
	if (b instanceof Vector) return new Vector(a.x / b.x, a.y / b.y);
	else return new Vector(a.x / v, a.y / v);
};
Vector.equals = function(a, b) {
	return a.x == b.x && a.y == b.y;
};
Vector.dot = function(a, b) {
	return a.x * b.x + a.y * b.y;
};
Vector.cross = function(a, b) {
	return a.x * b.y - a.y * b.x;
};