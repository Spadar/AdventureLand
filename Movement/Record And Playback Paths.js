//HOW TO USE
////Recording a Path:
////1. Set 'recordPath' to 'true'
////2. Start CODE
////3. Walk desired Path in game.
////4. When you arrive back at your starting point (shown by drawn lines) a JSON representation of the path will be shown.
////5. use CTRL-A -> CTRL-C to copy the JSON Text.
////6. Paste JSON as the value assigned in the function initializeKitePath

////Following a Recorded Path
////1. Make sure you set a path in initializeKitePath as shown above.
////2. Set 'recordPath' to 'false'.
////3. set 'followPath' to 'true'.

////Notes:
////If set target equal to the monster you're attempting to kite, your character will only continue along the path if the target is within your attack range.

clear_drawings();
var target;//Target Monster
var recordPath = false;
var followPath = true;
var finishedRecording = false;

var kitePath = [];

if(!recordPath)
{
	initializeKitePath();
}

var targetIndex = findNearestPathPoint();
drawPath();

setInterval(function()
{
	if(!recordPath && followPath && kitePath.length > 0)
	{
		followKitePath();
	}
	else if(recordPath && !finishedRecording)
	{
		recordKitePath();
	}
}, 100);

function recordKitePath()
{
	var lastPoint;
	
	if(kitePath.length > 0)
	{
		lastPoint = kitePath[kitePath.length - 1];
	}
	
	if(lastPoint == null || distanceToPoint(lastPoint.x, lastPoint.y) > 25)
	{
		var newPoint = {x: character.real_x, y: character.real_y};
		
		if(lastPoint != null)
		{
			draw_line(lastPoint.x,lastPoint.y,newPoint.x,newPoint.y);
		}
		
		kitePath.push(newPoint);
	}
	
	if(kitePath.length > 2 && distanceToPoint(kitePath[0].x, kitePath[0].y) < 25)
	{
		if(!finishedRecording)
		{
			show_json(kitePath);
			finishedRecording = true;
		}
	}
}

function drawPath()
{
	for(var i = 0; i < kitePath.length; i++)
	{
		var point1 = kitePath[i];
		
		var point2;
		
		if(i == kitePath.length - 1)
		{
			point2 = kitePath[0];
		}
		else
		{
			point2 = kitePath[i+1];
		}
		
		draw_line(point1.x,point1.y,point2.x,point2.y);
	}
}

//Returns the index of the nearest point in our path.
function findNearestPathPoint()
{
	var closestPoint;
	var closestPointDist;
	var closestIndex;
	
	for(var i = 0; i < kitePath.length; i++)
	{
		var point = kitePath[i];
		var pointDist = distanceToPoint(point.x, point.y);
		if(closestPoint == null || pointDist < closestPointDist)
		{
			closestPoint = point;
			closestPointDist = pointDist;
			closestIndex = i;
		}
	}
	
	return closestIndex;
}

function distanceToPoint(x, y)
{
	return Math.sqrt(Math.pow(character.real_x - x, 2) + Math.pow(character.real_y - y, 2));
}


function followKitePath()
{
	var targetDistance;
	if(target != null)
	{
		targetDistance = distanceToPoint(target.real_x, target.real_y);
	}
			
	if ((target == null || target.target != character.name) || targetDistance < character.range)
	{
	
		var targetPoint = kitePath[targetIndex];

		if(distanceToPoint(targetPoint.x, targetPoint.y) < 10)
		{
			targetIndex = targetIndex + 1;
			if(targetIndex > kitePath.length - 1)
			{
				targetIndex = 0;
			}
			targetPoint = kitePath[targetIndex];
		}
		move(
			character.real_x+(targetPoint.x-character.real_x),
			character.real_y+(targetPoint.y-character.real_y)
		);
	}
	else
	{
		move(character.real_x,character.real_y);
	}
}

//Paste path JSON here
function initializeKitePath()
{
	kitePath = [];
}