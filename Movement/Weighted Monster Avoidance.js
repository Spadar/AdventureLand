//How much extra distance to add to a monsters range (for safety)
var rangeBuffer = 75;

//How far away each sampled point should be
var avoidMoveDist = 100;

//What monsters do we want to make an effort to avoid?
var avoidTypes = ["mole"];

setInterval(function()
{
	use_hp_or_mp();
	var avoiding = avoidMonsters();
	
	if(!avoiding)
	{
		//Do normal movement stuff
		move(0, -1050);
	}
}, 100);

//Move character away from monsters
function avoidMonsters()
{
	var avoiding = false;
	
	var maxWeight;
	var maxWeightAngle;
	
	var monstersInRange = [];
	
	for(id in parent.entities)
		{
			var entity = parent.entities[id];
			
			if(entity.type == "monster" && avoidTypes.includes(entity.mtype))
			{
				var range = parent.G.monsters[entity.mtype].range + rangeBuffer;
				
				var distToMonster = distanceToPoint(character.real_x, character.real_y, entity.real_x, entity.real_y);
				if(distToMonster < range)
				{
					monstersInRange.push(entity);
				}
			}
	}
	
	if(monstersInRange.length > 0)
	{
		//Sample points in a complete circle around us, move in the direction with the most room.
		for(i = 0; i < Math.PI*2; i += Math.PI/360)
		{
			var position = pointOnAngle(character, i, avoidMoveDist);
			
			if(can_move_to(position.x, position.y))
			{	
				var weight = 0;

				for(id in monstersInRange)
				{
					var entity = monstersInRange[id];

					var distToMonster = distanceToPoint(position.x, position.y, entity.real_x, entity.real_y);
					weight += distToMonster;
				}

				if(maxWeight == null || weight > maxWeight)
				{
					maxWeight = weight;
					maxWeightAngle = i;
				}
			}
		}

		var tarPoint = pointOnAngle(character, maxWeightAngle, 10);

		move(tarPoint.x, tarPoint.y);
		avoiding = true;
	}
	
	return avoiding;
}

//Calculate a point on an angle, a given distance away
function pointOnAngle(entity, angle, distance)
{
	var circX = entity.real_x + (distance * Math.cos(angle));
	var circY = entity.real_y + (distance * Math.sin(angle));
	
	return {x: circX, y: circY};
}

//Calculate the distance between two points
function distanceToPoint(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
