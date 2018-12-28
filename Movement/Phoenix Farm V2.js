//Extra range to add to a monsters attack range, to give a little more wiggle room to the algorithm.
var rangeBuffer = 45;

//How far away we want to consider monsters for
var calcRadius = 250;

//What types of monsters we want to try to avoid
var avoidTypes = ["mole", "bigbird"];

if(character.range > parent.G.monsters["phoenix"].range)
{
	avoidTypes.push("phoenix");
}

//Tracking when we send movements to avoid flooding the socket and getting DC'd
var lastMove;

//Whether we want to draw the various calculations done visually
var drawDebug = true;

var farmMaps = ['cave', 'tunnel', 'main', 'halloween'];

var currentMapIndex = 0;
var currentSpawnIndex = 0;

var goalTest;

var stuckTimer;

setInterval(function()
{
	use_hp_or_mp();
	loot();
	if(drawDebug)
	{
		clear_drawings();
	}
	
	var goal = null;
	
	var targetSpawn;
	var targetMap = farmMaps[currentMapIndex];
	
	var spawns = findMonsterSpawns("phoenix");
	
	var spawnMap = spawns[targetMap];
	
	if(spawnMap != null)
	{
		targetSpawn = spawnMap[currentSpawnIndex];
	}
	
	if(character.map == targetMap && can_move_to(targetSpawn.center.x, targetSpawn.center.y))
	{
		if(smart.moving)
		{
			//stop();
		}
		goal = {x: targetSpawn.center.x, y: targetSpawn.center.y}
	}
	
	var found = false;
	var phoenix;
	for(id in parent.entities)
	{
		var entity = parent.entities[id];
		
		if(entity.mtype == "phoenix")
		{
			if(can_move_to(entity.real_x, entity.real_y))
			{
				goal = {x: character.real_x+(entity.real_x-character.real_x),
					y: character.real_y+(entity.real_y-character.real_y)};
			}
			found = true;
			phoenix = entity;
			break;
		}
	}
	
	if(goal == null && smart.moving)
	{
		var currentPath = smart.plot[0];
		
		if(currentPath != null && currentPath.map == character.map)
		{
			goal = smart.plot[0];
		}
	}
	
	//Try to avoid monsters, 
	var avoiding = avoidMobs(goal);
	
	if(goal != null && !can_move_to(goal.x, goal.y))
	{
		if(stuckTimer == null)
		{
			stuckTimer = new Date();
		}
		
		if(new Date() - stuckTimer > 5000)
		{
			game_log("Getting unstuck...");
			smart_move({x: goal.x, y: goal.y});
			stuckTimer = null;
		}
	}
	else
	{
		stuckTimer = null;
	}
	
	if(!found && goal == null)
	{
		if(!smart.moving)
		{
			smart_move({x: targetSpawn.center.x, y: targetSpawn.center.y, map: targetMap});
		}
	}
				
	if(!avoiding && goal != null)
	{
		if(can_move_to(goal.x, goal.y))
		{
			if(lastMove == null || new Date() - lastMove > 100)
			{
				move(goal.x, goal.y);
				lastMove = new Date();
			}
		}
		else
		{
			if(!smart.moving)
			{
				smart_move({x: goal.x, y: goal.y});
			}
		}
	}
	
	if(!found)
	{
		var distToSpawn = distanceToPoint(character.real_x, character.real_y, targetSpawn.center.x, targetSpawn.center.y);

		if(distToSpawn < 150 && targetMap == character.map)
		{
			console.log("Next!");
			nextSpawn(spawnMap);
		}
	}
	else
	{
		if(can_attack(phoenix))
		{
			attack(phoenix);
		}
	}
	
}, 25);
			
function nextSpawn(spawnMap)
{
	currentSpawnIndex++;
		
	if(currentSpawnIndex > spawnMap.length - 1)
	{
		currentSpawnIndex = 0;
		currentMapIndex++;
			
		if(currentMapIndex > farmMaps.length - 1)
		{
			currentMapIndex = 0;
		}
	}
}

function findMonsterSpawns(mtype) {
    var spawns = {};
    if(parent != null)
    {
        for (id in parent.G.maps) {
            var map = parent.G.maps[id];
            var monsters = map.monsters;
            var mapSpawns = spawns[id];

            if (mapSpawns == null) {
                mapSpawns = [];
                spawns[id] = mapSpawns;
            }


            for (id in monsters) {
                var monster = monsters[id];

                if (monster.type == mtype) {
                    if (monster.stype != "randomrespawn") {
                        if (monster.boundary != null) {
                            monster.center = findBoxCenter(monster.boundary[0],
                                                           monster.boundary[1],
                                                           monster.boundary[2],
                                                           monster.boundary[3]);
                        }
                        mapSpawns.push(monster);
                    }
                    else {
                        for (id in monster.boundaries) {
                            var boundary = monster.boundaries[id];
                            var mapName = boundary[0];
                            var boundaryMapSpawns = spawns[mapName];

                            if (boundaryMapSpawns == null) {
                                boundaryMapSpawns = [];
                                spawns[mapName] = boundaryMapSpawns;


                            }
                            var spawn = { count: monster.count, boundary: [boundary[1], boundary[2], boundary[3], boundary[4]], type: monster.type };

                            spawn.center = findBoxCenter(boundary[1],
                                                       boundary[2],
                                                       boundary[3],
                                                       boundary[4]);

                            boundaryMapSpawns.push(spawn);
                        }
                    }
                }
            }
        }
    }
    return spawns;
}

function findBoxCenter(x1, y1, x2, y2) {
    var midX = (x1 + x2) / 2;
    var midY = (y1 + y2) / 2;

    return { x: midX, y: midY };
}

function avoidMobs(goal)
{
	var noGoal = false;
	
	if(goal == null || goal.x == null || goal.y == null)
	{
		noGoal = true;
	}
	
	if(drawDebug && !noGoal)
	{
		draw_circle(goal.x, goal.y, 25, 1, 0xDFDC22);
	}
	
	var maxWeight;
	var maxWeightAngle;
	var movingTowards = false;
	
	var monstersInRadius = getMonstersInRadius();
	
	var avoidRanges = getAnglesToAvoid(monstersInRadius);
	var inAttackRange = isInAttackRange(monstersInRadius);
	if(!noGoal)
	{
		var desiredMoveAngle = angleToPoint(character, goal.x, goal.y);

		

		var movingTowards = angleIntersectsMonsters(avoidRanges, desiredMoveAngle);

		var distanceToDesired = distanceToPoint(character.real_x, character.real_y, goal.x, goal.y);

		var testMovePos = pointOnAngle(character, desiredMoveAngle, distanceToDesired);
	
		if(drawDebug)
		{
			draw_line(character.real_x, character.real_y, testMovePos.x, testMovePos.y, 1, 0xDFDC22);
		}
	}
	
	
	//If we can't just directly walk to the goal without being in danger, we have to try to avoid it
	if(inAttackRange || movingTowards || (!noGoal && !can_move_to(goal.x, goal.y)))
	{
		//Loop through the full 360 degrees (2PI Radians) around the character
		//We'll test each point and see which way is the safest to  go
		for(i = 0; i < Math.PI*2; i += Math.PI/360)
		{
			var weight = 0;

			var position = pointOnAngle(character, i, 75);
			
			//Exclude any directions we cannot move to (walls and whatnot)
			if(can_move_to(position.x, position.y))
			{
				
				//If a direction takes us away from a monster that we're too close to, apply some pressure to that direction to make it preferred
				var rangeWeight = 0;
				var inRange = false;
				for(id in monstersInRadius)
				{
					var entity = monstersInRadius[id];
					var monsterRange = parent.G.monsters[entity.mtype].range + rangeBuffer;

					if(entity.mtype == "phoenix")
					{
						monsterRange = character.range - 15;
					}
					
					var distToMonster = distanceToPoint(position.x, position.y, entity.real_x, entity.real_y);

					var charDistToMonster = distanceToPoint(character.real_x, character.real_y, entity.real_x, entity.real_y);

					if(charDistToMonster < monsterRange)
					{
						inRange = true;
					}

					if(charDistToMonster < monsterRange && distToMonster > charDistToMonster)
					{
						rangeWeight += distToMonster - charDistToMonster;
					}

				}

				if(inRange)
				{
					weight = rangeWeight;
				}
				
				//Determine if this direction would cause is to walk towards a monster's radius
				var intersectsRadius = angleIntersectsMonsters(avoidRanges, i);
				
				//Apply some selective pressure to this direction based on whether it takes us closer or further from our intended goal
				if(goal != null && goal.x != null && goal.y != null)
				{
					var tarDistToPoint = distanceToPoint(position.x, position.y, goal.x, goal.y);

					weight -= tarDistToPoint/10;
				}
				
				//Exclude any directions which would make us walk towards a monster's radius
				if(intersectsRadius === false)
				{
					//Update the current max weight direction if this one is better than the others we've tested
					if(maxWeight == null || weight > maxWeight)
					{
						maxWeight = weight;
						maxWeightAngle = i;
					}
				}
			}
		}
		
		//Move towards the direction which has been calculated to be the least dangerous
		var movePoint = pointOnAngle(character, maxWeightAngle, 20);

		if(lastMove == null || new Date() - lastMove > 100)
		{
			lastMove = new Date();
			move(movePoint.x, movePoint.y);
		}
		
		if(drawDebug)
		{
			draw_line(character.real_x, character.real_y, movePoint.x, movePoint.y, 2, 0xF20D0D);
		}
		
		return true;
	}
	else
	{
		return false;
	}
	
}

function isInAttackRange(monstersInRadius)
{
	for(id in monstersInRadius)
	{
		var monster = monstersInRadius[id];
		var monsterRange = parent.G.monsters[monster.mtype].range + rangeBuffer;
		
		if(monster.mtype == "phoenix")
		{
			monsterRange = character.range - 15;
		}
		
		var charDistToMonster = distanceToPoint(character.real_x, character.real_y, monster.real_x, monster.real_y);
		
		if(charDistToMonster < monsterRange)
		{
			return true;
		}
	}
	
	return false;
}

function angleIntersectsMonsters(avoidRanges, angle)
{
	for(id in avoidRanges)
	{
		var range = avoidRanges[id];

		var between = isBetween(range[1], range[0], angle);



		if(between)
		{
			return true;
		}
	}
	
	return false;
}

function getAnglesToAvoid(monstersInRadius)
{
	var avoidRanges = [];
	
	if(monstersInRadius.length > 0)
	{
		for(id in monstersInRadius)
		{
			var monster = monstersInRadius[id];

			var monsterRange = parent.G.monsters[monster.mtype].range + rangeBuffer;
			
			if(monster.mtype == "phoenix")
			{
				monsterRange = character.range - 15;
			}
			
			var tangents = findTangents({x: character.real_x, y: character.real_y}, {x: monster.real_x, y: monster.real_y, radius: monsterRange});
			
			//Tangents won't be found if we're within the radius
			if(!isNaN(tangents[0].x))
			{
				var angle1 = angleToPoint(character, tangents[0].x, tangents[0].y);
				var angle2 = angleToPoint(character, tangents[1].x, tangents[1].y);

				if(angle1 < angle2)
				{
					avoidRanges.push([angle1, angle2]);
				}
				else
				{
					avoidRanges.push([angle2, angle1]);
				}
				if(drawDebug)
				{
					draw_line(character.real_x, character.real_y, tangents[0].x, tangents[0].y, 1, 0x17F20D);
					draw_line(character.real_x, character.real_y, tangents[1].x, tangents[1].y, 1, 0x17F20D);
				}
			}
			
			if(drawDebug)
			{
				draw_circle(monster.real_x, monster.real_y, monsterRange, 1, 0x17F20D);
			}
		}
	}
	
	return avoidRanges;
}

function getMonstersInRadius()
{
	var monstersInRadius = [];
	
	for(id in parent.entities)
	{
		var entity = parent.entities[id];
		
		if(entity.type === "monster" && avoidTypes.includes(entity.mtype))
		{
			var distanceToEntity = distanceToPoint(entity.real_x, entity.real_y, character.real_x, character.real_y);
			
			var monsterRange = parent.G.monsters[entity.mtype].range;
			
			if(entity.mtype == "phoenix")
			{
				monsterRange = character.range - 15;
			}

			if(distanceToEntity < calcRadius)
			{
				monstersInRadius.push(entity);
			}
		}
	}
	
	return monstersInRadius;
}


function normalizeAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}  

//Source: https://stackoverflow.com/questions/11406189/determine-if-angle-lies-between-2-other-angles
function isBetween(angle1, angle2, target)
{
	if(angle1 <= angle2) {
		if(angle2 - angle1 <= Math.PI) {
			return angle1 <= target && target <= angle2;
		} else {
			return angle2 <= target || target <= angle1;
		}
	} else {
		if(angle1 - angle2 <= Math.PI) {
			return angle2 <= target && target <= angle1;
		} else {
			return angle1 <= target || target <= angle2;
		}
	}
}

//Source: https://stackoverflow.com/questions/1351746/find-a-tangent-point-on-circle
function findTangents(point, circle)
{
	var dx = circle.x - point.x;
	var dy = circle.y - point.y;
	var dd = Math.sqrt(dx * dx + dy * dy);
	var a = Math.asin(circle.radius/dd);
	var b = Math.atan2(dy, dx);
	
	var t = b - a;
	
	var ta = {x:circle.x + (circle.radius * Math.sin(t)), y: circle.y + (circle.radius * -Math.cos(t))};
	
	t = b + a;
	var tb = {x: circle.x + circle.radius * -Math.sin(t), y: circle.y + circle.radius * Math.cos(t)}
	
	
	
	return [ta, tb];
}

function offsetToPoint(x, y)
{
	var angle = angleToPoint(x, y) + Math.PI/2;
	
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

function angleToPoint(entity, x, y) {
    var deltaX = entity.real_x - x;
    var deltaY = entity.real_y - y;

    return Math.atan2(deltaY, deltaX) + Math.PI;
}

function characterAngle() {
    return (character.angle * Math.PI) / 180;
}

function distanceToPoint(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
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
			move(character.real_x+Math.random()*0.0002-0.0001,character.real_y+Math.random()*0.0002-0.0001);
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
		var next = smart.plot[0];
		if(smart.plot.length > 1)
		{
			next = smart.plot[1];
		}
		
		if(current.map == character.map)
		{
			
			var distCurrent = parent.simple_distance({x: character.real_x, y: character.real_y}, {x: current.x, y: current.y});
			
			var distNext = parent.simple_distance({x: character.real_x, y: character.real_y}, {x: next.x, y: next.y});
			if(distCurrent < 1 || (next.map == character.map && can_move_to(next.x, next.y) && !next.transport && distNext < 100))
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