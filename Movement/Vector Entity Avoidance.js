//Usages
//move(x,y) has been overridden to operate via vectors, and will allow avoidance while moving
//smart_move has been overridden to allow avoidance to happen during the path following process

//CONFIGURATION

//Entity Avoidance Configuration
var debugDrawing = true;//Set this to false to stop drawing debug information.
var buffer = 40; //How far out from the minimum range do we want to start?
var charDistance = 30; //Minimum range for players
var avoidPlayers = true;//Do we want to avoid players at all?
var avoidMTypes = ["mole"];//What type of monsters do we want to avoid?

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