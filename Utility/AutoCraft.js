//The items we want to craft.
var craftList = ["wingedboots"];

setInterval(function()
			{
	tryCraft();
}, 500);

function tryCraft()
{
	//Iterate over everything we've configured to auto craft.
	for(var index in craftList)
	{
		//What's the name of the item we want to craft?
		var craftName = craftList[index];
		
		//Grab the crafting recipe.
		var craftDef = parent.G.craft[craftName];
		
		var cost = craftDef.cost;
		
		//Did we find a recipe?
		if(craftDef != null)
		{
			//Yeah? Do we have enough to pay for the recipe?
			if(cost < character.gold)
			{
				//Variable to track how many items we're missing from the recipe.
				var missing = 0;
				
				//Variable to hold the inventory slots of items that belong to the recipe.
				var craftSlots = [];
				
				//Variable to hold the item names of things we're missing from the recipe.
				var buyableMissing = [];
				
				//Iterate over every item in the recipe to check if we have it.
				for(var itemIndex in craftDef.items)
				{
					//Grab the item from the recipe, it'll say what and how many.
					var itemDef = craftDef.items[itemIndex];
					
					//What is the name of the item in the recipe?
					var itemName = itemDef[1];
					
					//How many of the item do we need.
					var itemQuantity = itemDef[0];
					
					//Grab information on the item we need.
					var item = parent.G.items[itemName];
					
					var level = null;
					
					//Is this item upgradeable?
					if(item.scroll == true)
					{
						//As of now we need level 0 items.
						//May need to change later.
						level = 0;
					}
					
					//Try to find the index of the item in our inventory
					var itemSearch = scanInventoryForItemIndex(itemName, level);
					
					//Do we have the item needed to craft?
					if(itemSearch == null)
					{
						//Mark that we're missing an item.
						missing++;
						
						//No? Then check to see if we can buy one.
						var basics = parent.G.npcs["basics"];
						
						if(basics.items.includes(itemName))
						{
							//Do we have enough to complete the crafting with the cost of the item included?
							cost += item.g;
							
							if(craftDef.cost < character.gold)
							{
								//Yeah? Mark it as something to buy.
								buyableMissing.push(itemName);
							}
							else
							{
								//Not enough gold to craft, clear the list of things to buy and stop.
								buyableMissing = [];
								break;
							}
						}
					}
					else
					{
						//Do we have the amount of the item that is required by the recipe?
						var invItem = character.items[itemSearch];
						
						if(invItem.q >= itemQuantity || itemQuantity == 1)
						{
							//Yeah? Then we'll mark it for use.
							craftSlots.push(itemSearch);
						}
						else
						{
							missing++;
						}
					}
				}
				
				//Are we missing anything?
				if(missing == 0)
				{
					//Craft it!
					var craftArray = [];
					
					for(id in craftSlots)
					{
						craftArray.push([id, craftSlots[id]]);
					}
					
					parent.socket.emit("craft", {
            			items: craftArray
					});
					break;
				}
				else
				{
					//Try to buy whatever we're missing.
					if(buyableMissing.length == missing)
					{
						for(var idBuy in buyableMissing)
						{
							//Buy an item we're missing, and break execution so that we can control how fast requests are sent to the server.
							var buyName = buyableMissing[idBuy];
							
							buy(buyName);
							break;
						}
					}
				}
			}
		}
	}
}

function scanInventoryForItemIndex(name, maxLevel)
{
	//Iterate over every slot in our inventory.
	for(var i = 0; i <= 41; i++)
	{
		var curSlot = character.items[i];
		
		//Does the item name match?
		if(curSlot != null && curSlot.name == name)
		{
			//Does the level match?
			if(maxLevel == null || curSlot.level <= maxLevel)
			{
				//Return the inventory slot #.
				return i
			}
		}
	}
}