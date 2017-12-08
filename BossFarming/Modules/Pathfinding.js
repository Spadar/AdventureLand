if(parent.ModulesLoaded == null)
{
	parent.ModulesLoaded = [];
}

parent.ModulesLoaded.push("Pathfinding");

load_code("PathfindingLibrary");

game_log("---Pathfinding Start---");

var cellSize = 12;
var playerBuffer = 45;
var monsterBuffer = 45;
var avoidTypes = ["mole"];
var avoidRage = ["mummy"];
var gridCache = {};
var pathAvoidMonsters;
var pathAvoidPlayers;
var pathAvoidRage;
var pathEndPoint;
var pathEndMap;
var pathToFollow;
var teleportPathMap;
var teleportPath;
var pathIndex = 1;
var lastMove;
var minTimeBetweenMovements = 100;
var teleporting = false;
var teleCount = 0;
var movementLoop;
var mapTeleports = {};

populateMapTeleports();
function populateMapTeleports()
{
	
    for(var mapName in parent.G.maps)
    {
        var teleports = {map: mapName, teleports: []};
        var map = parent.G.maps[mapName];
		
        for(var doorName in map.doors)
        {
            var door = map.doors[doorName];
            if(teleports.teleports.filter(tp => tp.to == door[4]) == 0 && mapName != door[4])
            {
                teleports.teleports.push({to: door[4]});
            }
			
        }
		
        var transporter = map.npcs.filter(npc => npc.id == "transporter");
		
        if(transporter.length > 0)
        {
            var places = Object.keys(parent.G.npcs.transporter.places);
            for(id in places)
            {
                var placeMap = places[id];
                if(teleports.teleports.filter(tp => tp.to == placeMap) == 0 && mapName != placeMap)
                {
                    teleports.teleports.push({to: placeMap});
                }
            }
        }
        mapTeleports[mapName] = teleports;
    }
}

function getTeleportPath(startPos, endMap)
{
    var openList = [];
	
    var closedList = [];
	
    var activeNode = mapTeleports[startPos.map];
	
    var loopLimit = 1000;
    var counter = 0;
	
    while(activeNode.map != endMap && counter < loopLimit)
    {
        for(var map in activeNode.teleports)
        {
            var teleport = activeNode.teleports[map];
			
            teleport.from = activeNode.map;
			
            if(!closedList.includes(teleport.to))
            {
                openList.push(teleport);
				
                if(teleport.to == endMap)
                {
                    return reduceOpenList(openList);
                }
            }
        }
		
        closedList.push(activeNode.map);
        var availableMaps = openList.filter(tp => !closedList.includes(tp.to));
        if(availableMaps.length > 0)
        {
            activeNode = mapTeleports[availableMaps[0].to];
        }
        else
        {
            return null;
        }
        counter++;
    }
	
    if(counter >= loopLimit)
    {
        game_log("Something is wrong with your map pathfinding, fix dat shit yo");
    }
}

function reduceOpenList(openList)
{
    var reducedList = [];
	
    var activeNode = openList[openList.length - 1];
	
    var loopLimit = 1000;
    var counter = 0;
	
    while(activeNode != null && counter < loopLimit)
    {
        reducedList.push(activeNode);
		
        var previousNode = openList.filter(n => n.to == activeNode.from && n.to != n.from);
		
        if(previousNode.length > 0)
        {
            activeNode = previousNode[0];
        }
        else
        {
            activeNode = null;
        }
        counter++;
    }
	
    if(counter >= loopLimit)
    {
        game_log("Something is wrong with your map pathfinding, fix dat shit yo");
    }
	
    return reducedList.reverse();
}

function findNearestTeleportToMap(mapName)
{
    var teleportLocation = {};
    var teleportDistance;
    var map = parent.G.maps[character.map];
		
    for(var doorName in map.doors)
    {
        var door = map.doors[doorName];
        if(door[4] == mapName)
        {
            var doorDist = distance(character.real_x, character.real_y, door[0], door[1]);
            if(teleportDistance == null || doorDist < teleportDistance)
            {
				
                teleportLocation = {x: door[0], y: door[1], s: door[5]};
            }
        }
    }
		
    var transporter = map.npcs.filter(npc => npc.id == "transporter");
		
    if(transporter.length > 0)
    {
        var npc = transporter[0];
        var places = Object.keys(parent.G.npcs.transporter.places);
        for(id in places)
        {
            var placeMap = places[id];
            if(placeMap == mapName)
            {
                var doorDist = distance(character.real_x, character.real_y, npc.position[0], npc.position[1]);
                if(teleportDistance == null || doorDist < teleportDistance)
                {
                    teleportLocation = {x: npc.position[0], y: npc.position[1], s: parent.G.npcs.transporter.places[placeMap]};
                }
            }
        }
    }
	
    return teleportLocation;
}

function fillOutsideMap(grid, map)
{
    var start = new Date();
    var visitedNodes = [];
    var unvisitedNodes = [];
	
    for(id in map.spawns)
    {
        var spawn = map.spawns[id];
        var cell = realToCell(spawn[0], spawn[1], map);
		
        var node = grid.getNodeAt(cell.x, cell.y);
		
        if(grid.isWalkableAt(node.x, node.y))
        {	
            unvisitedNodes.push(node);
        }
    }
	
    var currentNode = unvisitedNodes[0];
    while(currentNode != null)
    {
        var neighbors = grid.getNeighbors(currentNode, 4);
		
        //console.log("Visiting {" + currentNode.x + "," + currentNode.y + "} Neighbors: " + neighbors.length);
		
        for(id in neighbors)
        {
            var neighbor = neighbors[id];
			
            if(!visitedNodes.includes(neighbor))
            {
                if(!unvisitedNodes.includes(neighbor))
                {
                    unvisitedNodes.push(neighbor);
                }
            }
        }
		
        visitedNodes.push(currentNode);
        unvisitedNodes.splice(0,1);
        currentNode = unvisitedNodes[0];
    }
	
    for(var x = 0; x < grid.width; x++)
    {
        for(var y = 0; y < grid.height; y++)
        {
            var node = grid.getNodeAt(x,y);
			
            if(!visitedNodes.includes(node))
            {
                grid.setWalkableAt(node.x, node.y, false);
                //drawCell(node.x, node.y, map);
            }
        }
    }
	
    game_log(new Date() - start);
}

function stopPathfinding()
{
	pathToFollow = null;
    clearInterval(movementLoop);
    movementLoop = null;
}

function goToPoint(x, y, mapName, recalculatePath, avoidMobs, avoidPlayers, avoidRage) {
    
	
	if(avoidMobs == null)
    {
        avoidMobs = false;
    }

    if (character.map != mapName)
    {
        teleportPath = getTeleportPath({map: character.map}, mapName);
    }

    var endPos = { x: x, y: y };
	
	pathEndPoint = endPos;
	pathEndMap = mapName;
	pathAvoidMonsters = avoidMobs;
	pathAvoidPlayers = avoidPlayers;
	pathAvoidRage = avoidRage;
	
    if(movementLoop == null)
    {
        movementLoop = setInterval(function () {
            followPath(pathEndPoint, pathEndMap, pathAvoidMonsters, pathAvoidPlayers, pathAvoidRage);
        }, 100);
    }
}

function findClosestSpawn(x, y, map) {
    var spawns = map.spawns;

    var closest;
    var dist;

    for (id in spawns) {
        var spawn = spawns[id];

        var spawnDist = distance(x, y, spawn[0], spawn[1]);

        if (closest == null || dist > spawnDist) {
            closest = id;
            dist = spawnDist;
        }
    }

    return closest;
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

function followPath(endPos, endMap, avoidMobs, avoidPlayers, avoidRage) {

		var curEndPos;
		var map;
		
		var nextMap;
		var nextSpawn;
		
		if(character.map == endMap)
		{
			curEndPos = endPos;
			map = parent.G.maps[endMap];
		}
		else
		{
			var teleport = teleportPath.filter(tp => tp.from == character.map)[0];
			if(teleport != null)
			{
			var teleportPos = findNearestTeleportToMap(teleport.to);
			nextMap = teleport.to;
			nextSpawn = teleportPos.s;
			
			map = parent.G.maps[character.map];
			curEndPos = { x: teleportPos.x, y: teleportPos.y};
			}
			else
			{
				game_log("No teleport...");
				return;
			}
		}
		
		var startPos = {x: character.real_x, y: character.real_y};

        var path = findPath(startPos, curEndPos, map, avoidMobs, avoidPlayers, true, true, avoidRage);
	
		localStorage.setItem("path_" + character.name, JSON.stringify({path: path, map: character.map}));
				
        if (path != null && path.length > 0) {
            pathToFollow = path;
            pathIndex = 1;
        }
	
    if (pathToFollow != null) {
        if (pathToFollow.length == 0) {
            pathToFollow = null;
            clearInterval(movementLoop);
            movementLoop = null;
			
            return;
        }
		

		
        var targetPoint = getCellCenter(pathToFollow[pathIndex][0], pathToFollow[pathIndex][1], get_map());

        if (distance(character.real_x, character.real_y, targetPoint.x, targetPoint.y) < 5) {
            pathIndex++;
            if (pathIndex < pathToFollow.length) {
                if(pathIndex != pathToFollow.length - 1)
                {
                    targetPoint = getCellCenter(pathToFollow[pathIndex][0], pathToFollow[pathIndex][1], get_map());
                }
                else
                {
                    targetPoint = endPos;
                }
				
            }
            else {
				pathToFollow = null;//Path has been followed;
                pathIndex = null;
				
                if (nextMap != null)
                {
                    parent.socket.emit('transport', { to: nextMap, s: nextSpawn});
                }

                if (character.map == endMap) {
                    clearInterval(movementLoop);
                    movementLoop = null;
                    return;
                }
            }

        }

        if (targetPoint != null) {
            if (lastMove == null || new Date() - lastMove > minTimeBetweenMovements) {
				if((character.going_x != targetPoint.x && character.going_y != targetPoint.y) || !character.moving)
				{
					move(
						character.real_x + (targetPoint.x - character.real_x),
						character.real_y + (targetPoint.y - character.real_y)
					);
					lastMove = new Date();
				}
            };
        }
    }
}

function findPath(startPos, endPos, map, avoidMonsters, avoidPlayers, allowBlocking, smoothPath, avoidRage) {
    if(startPos.x > map.data.min_x 
	   && startPos.x < map.data.max_x
	   && endPos.x > map.data.min_x
	   && endPos.x < map.data.max_x
	   && startPos.y > map.data.min_y
	   && startPos.y < map.data.max_y
	   && endPos.y > map.data.min_y
	   && endPos.y < map.data.max_y)
    {
        var pathfinder = new PF.AStarFinder(
		{
		    allowDiagonal: true,
		    dontCrossCorners: true
		});
        var grid = initializeGrid(map);
		
		if(avoidRage)
		{
			disableRageCells(grid, map);
		}
		
        if (avoidMonsters) {
            disableMonsterCells(grid, map);
        }

        if (avoidPlayers) {
            disablePlayerCells(grid, map);
        }
		
        var pathfindingStart = new Date();
        var origStartCell = realToCell(startPos.x, startPos.y, map);
        var startCell = findNearestTraverseableCell(realToCell(startPos.x, startPos.y, map), grid);
        var endCell = findNearestTraverseableCell(realToCell(endPos.x, endPos.y, map), grid);
        var path = pathfinder.findPath(startCell.x, startCell.y, endCell.x, endCell.y, grid);
		
		
		
        //If monsters or players block the path, try again.
        if (path.length == 0 && !allowBlocking) {
            var grid = initializeGrid(map);
            path = pathfinder.findPath(startCell.x, startCell.y, endCell.x, endCell.y, grid);
        }
        if (smoothPath && path != null && path.length > 0) {
            var smoothed = PF.Util.smoothenPath(grid, path);

            path = smoothed;
        }
		
        return path;
    }
    else
    {
        return null;
    }
}

function findNearestTraverseableCell(cell, grid) {
    if (grid.isWalkableAt(cell.x, cell.y)) {
        return cell;
    }

    var distance;
    var closest;
    for (var x = -100; x <= 100; x++) {
        for (var y = -100; y <= 100; y++) {
            var cellDist = Math.abs(x) + Math.abs(y);
            var walkable = grid.isWalkableAt(cell.x + x, cell.y + y);

            if (walkable && (closest == null || cellDist < distance)) {
                closest = { x: cell.x + x, y: cell.y + y };
                distance = cellDist;
            }
        }
    }
	
    if(closest == null)
    {
        closest = cell;
    }

    return closest;
}

function getMonsters() {
    var monsters = [];
    for (id in parent.entities) {
        var entity = parent.entities[id];

        if (entity.type == "monster") {
            monsters.push(entity);
        }
    }

    return monsters;
}

function getPlayers() {
    var monsters = [];
    for (id in parent.entities) {
        var entity = parent.entities[id];

        if (entity.type == "character") {
            monsters.push(entity);
        }
    }

    return monsters;
}

//Prevents Combined Damage
function disablePlayerCells(grid, map) {
    var players = getPlayers();

    for (id in players) {

        var player = players[id];
        var distToPlayer = distance(character.real_x, character.real_y, player.real_x, player.real_y);
        var playerRange = playerBuffer;
        if(distToPlayer <= playerRange * 1.25 || true)
        {
            var cellsInRange = findCellsInCircle(player.real_x, player.real_y, playerRange, map);
            for (id in cellsInRange) {
                var cell = cellsInRange[id];
                var mapCellWidth = Math.ceil((map.data.max_x - map.data.min_x) / cellSize);
                var mapCellHeight = Math.ceil((map.data.max_y - map.data.min_y) / cellSize);
                if(cell.x < mapCellWidth && cell.y < mapCellHeight && cell.x >= 0 && cell.y >= 0)
                {
                    grid.setWalkableAt(cell.x, cell.y, false);
                }
            }
        }
    }
}

function disableRageCells(grid, map)
{
	for(var spawnID in map.monsters)
	{
		var spawn = map.monsters[spawnID];
		
		if(avoidRage.includes(spawn.type))
		{
			var rage = spawn.rage;
			
			console.log(rage);
			
			if(rage != null)
			{
				var cellsInRange = findCellsInBox(rage[0], rage[1], rage[2], rage[3], map);
				
				for (id in cellsInRange) {
					var cell = cellsInRange[id];
					var mapCellWidth = Math.ceil((map.data.max_x - map.data.min_x) / cellSize);
					var mapCellHeight = Math.ceil((map.data.max_y - map.data.min_y) / cellSize);
					if(cell.x < mapCellWidth && cell.y < mapCellHeight && cell.x >= 0 && cell.y >= 0)
					{
						grid.setWalkableAt(cell.x, cell.y, false);
					}
				}
			}
		}
	}
}


function disableMonsterCells(grid, map) {
    var monsters = getMonsters();

    for (id in monsters) {
        var monster = monsters[id];
		
        if(avoidTypes.includes(monster.mtype))
        {
            var monsterRange = parent.G.monsters[monster.mtype].range + monsterBuffer;
            var cellsInRange = findCellsInCircle(monster.real_x, monster.real_y, monsterRange, map);


            for (id in cellsInRange) {
                var cell = cellsInRange[id];
                var mapCellWidth = Math.ceil((map.data.max_x - map.data.min_x) / cellSize);
                var mapCellHeight = Math.ceil((map.data.max_y - map.data.min_y) / cellSize);
                if(cell.x < mapCellWidth && cell.y < mapCellHeight && cell.x >= 0 && cell.y >= 0)
                {
                    grid.setWalkableAt(cell.x, cell.y, false);
                }
            }
        }
    }
}

function initializeGrid(map) {
    //var grid = localStorage.getItem("grid_" + map.name);
    var grid;
    grid = loadGrid(map);

    if (grid == null) {
        game_log("Generating graph for " + map.name);
        var map_data = map.data;
        var mapCellWidth = Math.ceil((map.data.max_x - map.data.min_x) / cellSize);
        var mapCellHeight = Math.ceil((map.data.max_y - map.data.min_y) / cellSize);

        var graph = [];
        var defaultValue = 0;
        for (var x = 0; x < mapCellWidth; x++) {
            var defRow = [];
            for (var y = 0; y < mapCellHeight; y++) {
                defRow.push(defaultValue);
            }
            graph.push(defRow);
        }

        var scale = 8;

        for (id in map_data.x_lines) {
            var line = map_data.x_lines[id];

            var x1 = line[0] - cellSize / scale;
            var y1 = line[1] - cellSize / scale;
            var x2 = line[0] + cellSize / scale;
            var y2 = line[2] + cellSize / scale;

            var boxCells = findCellsInBox(x1, y1, x2, y2, map);

            for (var id in boxCells) {
                var cell = boxCells[id];
                graph[cell.x][cell.y] = 1;
            }

        }

        for (id in map_data.y_lines) {
            var line = map_data.y_lines[id];

            var x1 = line[1] - cellSize / scale;
            var y1 = line[0] - cellSize / scale;
            var x2 = line[2] + cellSize / scale;
            var y2 = line[0] + cellSize / scale;

            var boxCells = findCellsInBox(x1, y1, x2, y2, map);

            for (var id in boxCells) {
                var cell = boxCells[id];
                graph[cell.x][cell.y] = 1;
            }

        }



        var grid = new PF.Grid(mapCellWidth, mapCellHeight);

        for (var x = 0; x < mapCellWidth; x++) {
            for (var y = 0; y < mapCellHeight; y++) {
                var walkable = true;

                if (graph[x][y] != 0) {
                    walkable = false;
                    //drawCell(x, y, map);
                }

                grid.setWalkableAt(x, y, walkable);
            }
        }
		
        fillOutsideMap(grid, map);
		
        //This may cause problems in the future. 
        var characterCell = realToCell(character.real_x, character.real_y, map);
        grid.setWalkableAt(characterCell.x, characterCell.y, true);
		
        for(id in map.spawns)
        {
            var spawn = map.spawns[id];
            var cell = realToCell(spawn[0], spawn[1], map);

            grid.setWalkableAt(cell.x, cell.y, true);
        }
		
        cacheGrid(grid, map);
    }
    return grid.clone();
}

function loadGrid(map)
{
    //Try to load from local memory
    var grid = gridCache[map.name];
	
    if(grid == null)
    {
        var start = new Date();
        var cacheGrid = JSON.parse(localStorage.getItem("grid_" + map.name));
        if(cacheGrid != null && cacheGrid.length > 0)
        {
            grid = new PF.Grid(cacheGrid[0].length, cacheGrid.length);

            for (var y = 0; y < cacheGrid.length; y++) {
                for (var x = 0; x < cacheGrid[0].length; x++) {
                    var walkable = cacheGrid[y][x];

                    grid.setWalkableAt(x, y, walkable);
                }
            }
        }
		
        console.log("Cached Grid Loaded In " + (new Date() - start) + " milliseconds");
        gridCache[map.name] = grid;
    }
	
    return grid;
}

function cacheGrid(grid, map)
{
	
    var cacheGrid = [];
    for (var y = 0; y < grid.height; y++) {
        cacheGrid[y] = [];
        for (var x = 0; x < grid.width; x++) {
            var node = grid.getNodeAt(x,y);
            cacheGrid[y].push(node.walkable);
			
            if(node.walkable)
            {
                //drawCell(x, y, map);
            }
        }
    }
	
    localStorage.setItem("grid_" + map.name, JSON.stringify(cacheGrid));
}

function drawNearbyCells(x,y,map,range)
{
    var grid = gridCache[map.name];
	
    var minX = map.data.min_x;
    var minY = map.data.min_y;

    var maxX = map.data.max_x;
    var maxY = map.data.max_y;

    var mapCellWidth = Math.ceil((maxX - minX) / cellSize);
    var mapCellHeight = Math.ceil((maxY - minY) / cellSize);
	
    if(grid != null)
    {
        var startCell = realToCell(x,y,map);
		
        var rangeCells = range/cellSize;
		
        var cellOffset = Math.round(rangeCells/2);
		
        for(x = cellOffset * -1; x < startCell.x + cellOffset; x++)
        {
            for(y = cellOffset * -1; y < startCell.x + cellOffset; y++)
            {
                var cellPos = {x: x + startCell.x, y: y + startCell.y};
                game_log(JSON.stringify(startCell));
                game_log(JSON.stringify(cellPos));
                if(cellPos.x >= 0 && cellPos.y >= 0 && cellPos.x < mapCellWidth && cellPos.y < mapCellHeight)
                {
					
                    var walkable = grid.isWalkableAt(cellPos.x,cellPos.y);
					
                    if(walkable == false)
                    {
                        drawCell(cellPos.x, cellPos.y, map);
                    }
					
                }
            }
        }
    }
}

function drawCell(x, y, map) {
    var center = getCellCenter(x, y, map);
    var minXDraw = center.x - cellSize / 2;
    var minYDraw = center.y - cellSize / 2;

    var maxXDraw = center.x + cellSize / 2;
    var maxYDraw = center.y + cellSize / 2;

    draw_line(minXDraw, minYDraw, maxXDraw, minYDraw, 2, 0xE71111);
    draw_line(minXDraw, minYDraw, minXDraw, maxYDraw, 2, 0xE71111);
    draw_line(maxXDraw, maxYDraw, maxXDraw, minYDraw, 2, 0xE71111);
    draw_line(maxXDraw, maxYDraw, minXDraw, maxYDraw, 2, 0xE71111);
}

function drawOtherPath(name)
{
	var pathObj = JSON.parse(localStorage.getItem("path_" + name));
	
	var path = null;
	var map = null;
	
	if(pathObj != null)
	{
		path = pathObj.path;
		map = pathObj.map;
	}
	
    if(path != null && character.map == map)
    {
        for (var i = 0; i < path.length; i++) {
            var cell = path[i];
            drawCell(cell[0], cell[1], get_map());
            if (i + 1 < path.length) {
					
                var center = getCellCenter(cell[0], cell[1], get_map());
                var nextCell = path[i + 1]
                var nextCenter = getCellCenter(nextCell[0], nextCell[1], get_map())
                draw_line(center.x, center.y, nextCenter.x, nextCenter.y, 2, 0xE71111);
					
            }
        }
    }
}

function drawPath()
{
    if(pathToFollow != null)
    {
        for (var i = 0; i < pathToFollow.length; i++) {
            var cell = pathToFollow[i];
            drawCell(cell[0], cell[1], get_map());
            if (i + 1 < pathToFollow.length) {
					
                var center = getCellCenter(cell[0], cell[1], get_map());
                var nextCell = pathToFollow[i + 1]
                var nextCenter = getCellCenter(nextCell[0], nextCell[1], get_map())
                draw_line(center.x, center.y, nextCenter.x, nextCenter.y, 2, 0xE71111);
					
            }
        }
    }
}

function getCellCenter(x, y, map) {
    var minX = map.data.min_x;
    var minY = map.data.min_y;

    var centerX = (x * cellSize) + cellSize / 2 + minX;
    var centerY = (y * cellSize) + cellSize / 2 + minY;

    return { x: centerX, y: centerY };
}

function realToCell(x, y, map) {
    var minX = map.data.min_x;
    var minY = map.data.min_y;

    var maxX = map.data.max_x;
    var maxY = map.data.max_y;

    var mapCellWidth = Math.ceil((maxX - minX) / cellSize);
    var mapCellHeight = Math.ceil((maxY - minY) / cellSize);

    var pCellX = Math.floor(((x - minX) / cellSize));
    var pCellY = Math.floor(((y - minY) / cellSize));

    return { x: pCellX, y: pCellY };
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function findCellsInCircle(x, y, radius, map) {
    var circCells = [];
    var rectMax = { x: x + radius, y: y + radius };
    var rectMin = { x: x - radius, y: y - radius };

    var cells = findCellsInBox(rectMin.x, rectMin.y, rectMax.x, rectMax.y, map);

    for (id in cells) {
        var cell = cells[id];

        var center = getCellCenter(cell.x, cell.y, map);

        if (distance(x, y, center.x, center.y) < radius) {
            circCells.push(cell);
        }
    }

    return circCells;
}

function findBoxCenter(x1, y1, x2, y2) {
    var midX = (x1 + x2) / 2;
    var midY = (y1 + y2) / 2;

    return { x: midX, y: midY };
}

function findCellsInBox(x1, y1, x2, y2, map) {
    var cells = [];

    var minCell = realToCell(x1, y1, map);
    var maxCell = realToCell(x2, y2, map);

    for (var x = minCell.x; x <= maxCell.x; x++) {
        for (var y = minCell.y; y <= maxCell.y; y++) {
            cells.push({ x: x, y: y });
        }
    }
    return cells;
}