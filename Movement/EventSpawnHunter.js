//The mtype of the event mob we want to kill.
var event_mob_name = "snowman";

//Foaly reports the snowmans location to everyone if he finds it, this lets us know we want to listen for it.
var scout_name = "Foaly";

//What monsters do we want to farm in between snowman spawns?
var farm_types = ["osnake", "snake"];

//Where do we want to go in between snowman spawns?
var home_location = {x: -471, y: -692, map: "halloween"};


//The following variables are assigned while the script is running. 

//The map the event mob spawned on
var event_map;

//The list of spawns on the map that we have to search
var event_spawns;

//The index in the event_spawns list that we're currently at
var event_spawns_index;

//Whether we're searching for the event mob or not.
var searching;

var responding;

//Holds the event mob entity if we find it.
var target;

setInterval(function()
{
	//Don't die!
	use_hp_or_mp();
	
	//Pick up our loot!
	loot();
	
	//Try to find the event mob
	target = get_nearest_monster({type: event_mob_name});
	
	//Did we find it?
	if(target != null && target.mtype === event_mob_name)
	{
		//If we just found it, stop searching!
		if(searching)
		{
			game_log("Found target.");
			stop();
			searching = false;
		}
		else
		{
			move_or_attack(target)
		}
	}
	else
	{
		//If we're not searching and we don't know where the snowman is, go somewhere safe and wait.
		if(!searching && !responding)
		{
			if((character.map != home_location.map || simple_distance({x: character.real_x, y: character.real_y}, {x: home_location.x, y: home_location.y}) > 300) 
				&& !smart.moving)
			{
				smart_move({x: home_location.x, y: home_location.y, map: home_location.map});
			}
			else
			{
				if(target == null)
				{
					for(type in farm_types)
					{
						var mtype = farm_types[type];

						var nearest = get_nearest_monster({type: mtype, path_check: true});

						if(nearest != null)
						{
							target = nearest;
							break;
						}
					}
				}
				
				if(target != null)
				{
					move_or_attack(target)
				}
			}
		}
	}
}, 250);

//Function for either attacking or moving to attack
function move_or_attack(target)
{
	if(!in_attack_range(target))
	{
		//No? Get over there!

		//Can we walk straight to it?
		if(can_move_to(target.real_x, target.real_y))
		{
			//Good!
			move(
				character.real_x+(target.real_x-character.real_x)/2,
				character.real_y+(target.real_y-character.real_y)/2
			);
		}
		else
		{
			//Find a way to it!
			if(!smart.moving)
			{
				smart_move({x: target.real_x, y: target.real_y, map: character.map});
			}
		}
	}
	else
	{
		//Are we able to fire off an attack?
		if(can_attack(target))
		{
			//Kill it!
			attack(target);
		}
	}
}

//Listen for the death of the event monster, stop searching afterwards.
function on_disappear(entity, data)
{
	if(entity.mtype === event_mob_name)
	{
		if(data.death)
		{
			game_log("Mission Accomplished, standing by.");
			clear_search();
		}
	}
}

//Resets the search objects.
function clear_search()
{
	event_map = null;
	event_spawns = null;
	searching = false;
	responding = false;
}

//Listen for event monster spawn, begin search when it does.
function on_game_event(event)
{
	if(event.name === event_mob_name)
	{
		game_log("Event Triggered");
		game_log("Beginning search on " + event.map + " for " + event.name);
		
		event_map = event.map;
		event_spawns = find_monster_spawns(event.map);
		event_spawns_index = -1;
		
		searching = true;
		
		next_spawn();
	}
}

//Move to the next spawn in the list of spawns we populated when the search began.
function next_spawn(status)
{
	if(status != false)
	{
		if(event_spawns.length - 1 > event_spawns_index)
		{
			event_spawns_index++;
			var x = event_spawns[event_spawns_index].center.x;
			var y = event_spawns[event_spawns_index].center.y;
			game_log("Checking " + event_spawns[event_spawns_index].type + " spawn at X: " + x + " Y: " + y);
			smart_move({x: x, y: y, map: event_map}, next_spawn);
		}
		else
		{
			game_log("All spawns searched, standing by");
			clear_search();
		}
	}
}

//Finds all spawns on a map.
function find_monster_spawns(map) 
{
	var map = parent.G.maps[map];
    var monsters = map.monsters;
    var map_spawns = []


    for (id in monsters) 
	{
		var monster = monsters[id];

		if (monster.stype != "randomrespawn") {
			if (monster.boundary != null) {
				monster.center = find_box_center(monster.boundary[0],
												 monster.boundary[1],
												 monster.boundary[2],
												 monster.boundary[3]);
			}
			map_spawns.push(monster);
		}
		else 
		{
			for (id in monster.boundaries) 
			{
				var boundary = monster.boundaries[id];
				
				var spawn = { count: monster.count, boundary: [boundary[1], boundary[2], boundary[3], boundary[4]], type: monster.type };

				spawn.center = find_box_center(boundary[1],
											   boundary[2],
											   boundary[3],
											   boundary[4]);

				map_spawns.push(spawn);
			}
		}
	}
			
    return map_spawns;
}

//Listen for scouted report on snowman
function on_cm(name, data)
{
	if(name == scout_name)
	{
		if(data.name == "assistance_request" && data.mtype == event_mob_name)
		{
			game_log(scout_name + " found the " + event_mob_name + " moving to reported location.");
			responding = true;
			stop();
			smart_move({x: data.x, y: data.y, map: data.map}, function(){responding = false;});
		}
	}
}

//Calculate the midpoint of a rectangle.
function find_box_center(x1, y1, x2, y2) {
    var mid_x = (x1 + x2) / 2;
    var mid_y = (y1 + y2) / 2;

    return { x: mid_x, y: mid_y };
}