//Where the map is drawn on the screen
var mapOrigin = {x: 175, y: 175};
//How large to make the minimap
var miniMapRadius = 100;
//The radius of the outer line around the minimap
var miniMapBorder = 5;

//What scale should the minimap be drawn to?
var scale = 1/7;

//variable for holding all minimap objects so that they can be tracked/destroyed
parent.miniMap = [];

//No need to draw the entire minimap every frame
//We'll count frames so that we can update the minimap every X frames
var drawCounter = 0;
var drawOnCount = 5;

//Called once per frame
function on_draw()
{
	drawCounter++;
	
	if(drawCounter >= drawOnCount)
	{
		drawCounter = 0;
		ClearMiniMap();
		
		if(parent.miniMap.length == 0)
		{
			e=new PIXI.Graphics();
			DrawMiniMap();
			DrawWalls();
			DrawEntities();
			DrawNPCs();
			DrawCharacter();
			parent.stage.addChild(e);
			parent.miniMap.push(e);
		}
	}
}

function on_destroy() // called just before the CODE is destroyed
{
	clear_drawings();
	clear_buttons();
	ClearMiniMap();
}

function ClearMiniMap()
{
	if(parent.miniMap.length > 0)
	{
		parent.miniMap.forEach(function(e){
			try{e.destroy({children:true})}catch(ex){}
		});
		parent.miniMap = [];
	}
}

//This will draw all walls on the map
function DrawWalls()
{
	var map_data = parent.G.maps[character.map].data;
    for (id in map_data.x_lines) {
        var line = map_data.x_lines[id];

        var x1 = line[0];
        var y1 = line[1];
        var x2 = line[0];
        var y2 = line[2];
		
		var localPoint1 = WorldToLocal(x1, y1, scale);
		var localPoint2 = WorldToLocal(x2, y2, scale);
		
		DrawWall(localPoint1, localPoint2);
    }

    for (id in map_data.y_lines) {
        var line = map_data.y_lines[id];

        var x1 = line[1];
        var y1 = line[0];
        var x2 = line[2];
        var y2 = line[0];
		
		var localPoint1 = WorldToLocal(x1, y1, scale);
		var localPoint2 = WorldToLocal(x2, y2, scale);
		
		DrawWall(localPoint1, localPoint2);
    }
}

//This will draw an individial wall, cutting it off where it touches the border of the mini-map
function DrawWall(point1, point2)
{
	var intersections = getIntersections([point1.x, point1.y], [point2.x, point2.y], [0,0,miniMapRadius - miniMapBorder/2]);
		
		var miniMapPoint1 = null;
		var miniMapPoint2 = null;
		
		if(miniMapDistance(point1.x, point1.y) < miniMapRadius - miniMapBorder/2)
		{
			miniMapPoint1 = point1;
		}
		
		if(miniMapDistance(point2.x, point2.y) < miniMapRadius - miniMapBorder/2)
		{
			miniMapPoint2 = point2;
		}
		
		if(intersections.points != false)
		{
			for(id in intersections.points)
			{
				var intersect = intersections.points[id];
				
				if(intersect.onLine)
				{
					var point = {x: intersect.coords[0], y: intersect.coords[1]};
					
					if(miniMapPoint1 == null)
					{
						miniMapPoint1 = point;
					}
					else if(miniMapPoint2 == null)
					{
						miniMapPoint2 = point;
					}
					
				}
			}
		}
		else
		{
			if(intersections.pointOnLine.onLine)
			{
				console.log(intersections);
			}
		}
		
		if(miniMapPoint1 != null && miniMapPoint2 != null)
		{
			DrawLine(miniMapPoint1, miniMapPoint2);
		}
}

//This draws the actual line that represents a wall
function DrawLine(point1, point2)
{
	var color=0x47474F;
	var size=1;
	e.lineStyle(size, color);
	e.moveTo(point1.x + mapOrigin.x,point1.y + mapOrigin.y);
	e.lineTo(point2.x + mapOrigin.x,point2.y + mapOrigin.y);
	e.endFill();
	e.zOrder = -99;
}

//Draws the background and outer rim of the mini map
function DrawMiniMap()
{
	var localPosition = WorldToLocal(mapOrigin.x, mapOrigin.y, 1);
	var color=0x47474F;
	var size= miniMapBorder;
	e.lineStyle(size, color);
	e.beginFill(0x40420);
	e.drawCircle(mapOrigin.x, mapOrigin.y, miniMapRadius);
	e.endFill();
	e.zOrder = -99;
}

//Draws your character at the center of the mini map
function DrawCharacter()
{
	var color=0xFFFFFF;
	var size=2;
	e.lineStyle(size, color);
	e.beginFill(color);
	e.drawCircle(mapOrigin.x, mapOrigin.y, 2);
	e.endFill();
	e.zOrder = -99;
}

//Draws all entities in parent.entities on the mini map
function DrawEntities()
{
	for(id in parent.entities)
	{
		var entity = parent.entities[id];
		
		var localPos = WorldToLocal(entity.real_x, entity.real_y, scale);
		
		if(miniMapDistance(localPos.x, localPos.y) < miniMapRadius - miniMapBorder)
		{
			var color=EntityColorMapping(entity);
			var fill = color;
			var size=2;
			var borderSize = 2;
			if(entity.mtype != null && (parent.G.monsters[entity.mtype].respawn == -1 || parent.G.monsters[entity.mtype].respawn > 60*2))
			{
				size = 5;
				fill = 0x40420;
			}
			
			
			e.lineStyle(borderSize, color);
			e.beginFill(fill);
			e.drawCircle(localPos.x + mapOrigin.x, localPos.y + mapOrigin.y, size);
			e.endFill();
			e.zOrder = -99;
		}
		
	}
}

//Draws all entities in parent.entities on the mini map
function DrawNPCs()
{
	for(id in parent.G.maps[character.map].npcs)
	{
		var npc = parent.G.maps[character.map].npcs[id];
		
		if(npc && !npc.loop && !npc.manual && npc.position)
		{
		var position = npc.position;
		
		if(position[0].length != null)
		{
			position = position[0];
		}
		
		if(position[0] != 0 && position[1] != 0)
		{
			var localPos = WorldToLocal(position[0], position[1], scale);

			if(miniMapDistance(localPos.x, localPos.y) < miniMapRadius - miniMapBorder)
			{
				var color=0x2341DB;
				var size=2;
				e.lineStyle(size, color);
				e.beginFill(color);
				e.drawCircle(localPos.x + mapOrigin.x, localPos.y + mapOrigin.y, 2);
				e.endFill();
				e.zOrder = -99;
			}
		}
		}
		
	}
}

//Based one what kind of entity it is, change the color!
function EntityColorMapping(entity)
{
	switch(entity.type)
	{
		case 'character':
		{
			if(parent.party_list.includes(entity.id))
			{
				return 0x1BD545;
			}
			else if(entity.npc == null)
			{
				return 0xDCE20F;
			}
			else
			{
				return 0x2341DB;
			}
			break;
		}
		case 'monster':
		{
			return 0xEE190E;
			break;
		}
			
	}
}

//How far away is something from the center of the mini map?
function miniMapDistance(x, y)
{
	return Math.sqrt(Math.pow(x - 0, 2) + Math.pow(y - 0, 2));
}

//Convert world coordinates into local coordinates in respect to your character.
function WorldToLocal(x, y, scale)
{
	var relativeX = (character.real_x - x)*scale * -1;
	var relativeY = (character.real_y - y)*scale * -1;
	
	return {x: relativeX, y: relativeY};
}

//Javascript Circle-Line Intersect: https://bl.ocks.org/milkbread/11000965
// GEOMETRIC function to get the intersections
//A = Point1 [x,y]
//B = Point2 [x,y]
//C = Circle [x,y,radius]
function getIntersections(a, b, c) {
	// Calculate the euclidean distance between a & b
	eDistAtoB = Math.sqrt( Math.pow(b[0]-a[0], 2) + Math.pow(b[1]-a[1], 2) );

	// compute the direction vector d from a to b
	d = [ (b[0]-a[0])/eDistAtoB, (b[1]-a[1])/eDistAtoB ];

	// Now the line equation is x = dx*t + ax, y = dy*t + ay with 0 <= t <= 1.

	// compute the value t of the closest point to the circle center (cx, cy)
	t = (d[0] * (c[0]-a[0])) + (d[1] * (c[1]-a[1]));

	// compute the coordinates of the point e on line and closest to c
    var e = {coords:[], onLine:false};
	e.coords[0] = (t * d[0]) + a[0];
	e.coords[1] = (t * d[1]) + a[1];

	// Calculate the euclidean distance between c & e
	eDistCtoE = Math.sqrt( Math.pow(e.coords[0]-c[0], 2) + Math.pow(e.coords[1]-c[1], 2) );

	// test if the line intersects the circle
	if( eDistCtoE < c[2] ) {
		// compute distance from t to circle intersection point
	    dt = Math.sqrt( Math.pow(c[2], 2) - Math.pow(eDistCtoE, 2));

	    // compute first intersection point
	    var f = {coords:[], onLine:false};
	    f.coords[0] = ((t-dt) * d[0]) + a[0];
	    f.coords[1] = ((t-dt) * d[1]) + a[1];
	    // check if f lies on the line
	    f.onLine = is_on(a,b,f.coords);

	    // compute second intersection point
	    var g = {coords:[], onLine:false};
	    g.coords[0] = ((t+dt) * d[0]) + a[0];
	    g.coords[1] = ((t+dt) * d[1]) + a[1];
	    // check if g lies on the line
	    g.onLine = is_on(a,b,g.coords);

		return {points: {intersection1:f, intersection2:g}, pointOnLine: e};

	} else if (parseInt(eDistCtoE) === parseInt(c[2])) {
		// console.log("Only one intersection");
		return {points: false, pointOnLine: e};
	} else {
		// console.log("No intersection");
		return {points: false, pointOnLine: e};
	}
}

// BASIC GEOMETRIC functions
function is_on(a, b, c) {
	return intersect_distance(a,c) + intersect_distance(c,b) == intersect_distance(a,b);
}

function intersect_distance(a,b) {
    return Math.sqrt( Math.pow(a[0]-b[0], 2) + Math.pow(a[1]-b[1], 2) )
}

function getAngles(a, b, c) {
	// calculate the angle between ab and ac
	angleAB = Math.atan2( b[1] - a[1], b[0] - a[0] );
	angleAC = Math.atan2( c[1] - a[1], c[0] - a[0] );
	angleBC = Math.atan2( b[1] - c[1], b[0] - c[0] );
	angleA = Math.abs((angleAB - angleAC) * (180/Math.PI));
	angleB = Math.abs((angleAB - angleBC) * (180/Math.PI));
	return [angleA, angleB];
}


