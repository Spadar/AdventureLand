//The mtype of the event mob we want to kill.
var event_mob_names = ["snowman", "mrpumpkin", "mrgreen"];

//What monsters do we want to farm in between snowman spawns?
var farm_types = ["osnake", "snake"];

//Where do we want to go in between snowman spawns?
var home_location = {x: -471, y: -692, map: "halloween"};


//The following variables are assigned while the script is running. 

//The map the event mob spawned on
var events = [{name: "snowman", map: "halloween", x: -512, y: 515}];

//Holds the event mob entity if we find it.
var target;

setInterval(function()
{
	var curEvent = events[0];
	//Don't die!
	use_hp_or_mp();
	
	//Pick up our loot!
	loot();
	
	//Try to find the event mob
	if(curEvent != null)
	{
		target = get_nearest_monster({type: curEvent.name});
	}
	else
	{
		target = null;
	}
	
	//Did we find it?
	if(target != null && (curEvent != null && target.mtype === curEvent.name))
	{
		//Wait for someone to attack first disable this if you're able to tank it. 
		if(target.target != null)
		{
			move_or_attack(target);
		}
	}
	else
	{
		//normal farming logic here
		if(curEvent == null)
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
					console.log(target);
					move_or_attack(target)
				}
			}
		}
		else
		{
			if(character.map == curEvent.map)
			{
				var distToEvent = simple_distance({x: character.real_x, y: character.real_y}, {x: curEvent.x, y: curEvent.y});
				if(distToEvent < 10)
				{
					events.splice(0,1);
				}
			}
			
			if(!smart.moving)
			{
				smart_move({x: curEvent.x, y: curEvent.y, map: curEvent.map});
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

//Listen for event monster spawn, begin search when it does.
function on_game_event(event)
{
	if(event_mob_names.includes(event.name))
	{
		events.push(event);
	}
}
