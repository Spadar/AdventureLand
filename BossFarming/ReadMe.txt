This is my current, and likely last, iteration of my group code for AdventureLand. It was never written for other eyes in mind, so it lacks documentation, comments, and general sanity. It should run as is, but if you want to make changes to it, you're on your own. 

To run this code:
1. Save each script in Modules in-game with the name of the file.
2. Go through Targeting, InventoryManagement, and Comms, and update with your own character names.
3. Priest - Lead is intended to be run on a priest who is also the leader of the group.
	Ranger & Warrior are are intended to slave their actions to the leader, though either of these (or the leader) should be easily modified to fit just about any class.
	MerchantScout can run around and find targets, calling the group to the location, even across servers.
	
Modules and their general purposes:

1. Targeting - Maintain targeting priority, and manage PvP interactions
2. PathfindingLibrary - Base Pathfinding Code - Sourced from https://github.com/qiao/PathFinding.js
3. Pathfinding - Adaptation to pathfinding to suit adventureland, manages creating and caching of map graphs, and logic for finding and following paths.
4. InventoryManagement - Handles transfer of gold and items between characters.
5. Comms - Basic communication between characters. Also controls switching between servers.
6. Auto Upgrade - Well... Yeah.
7. DynamicKitePaths - Extension of my original kite path code to store multiple paths and look them up based on proximity and target type.
8. AutoParty - Automatically parties? Originally came from Deliagwath I believe. 

NOTE: Loaded code is cached in localStorage after being fetched from the server. If you want to make any changes to code, you will have to delete the cached code before changes will take effect.
If pathfinding breaks, try deleting the cached graphs in localStorage for each map.

Feel free to use any of this code as your own, modify it, burn it, whatever. 