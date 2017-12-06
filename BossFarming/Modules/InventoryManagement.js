game_log("---Inv Management Start---");

if(parent.ModulesLoaded == null)
{
	parent.ModulesLoaded = [];
}

parent.ModulesLoaded.push("InventoryManagement");

var itemSellList = ["strearring", "vitearring", "stramulet", "gphelmet"];
var potion_types = ["hpot0", "mpot0", "hpot1", "mpot1"];

var min_potions = 5000; //The number of potions at which to do a resupply run.
var purchase_amount = 2000;//How many potions to buy at once.

var transferTarget = "YOUR MERCHANT HERE";
var maxGold = 20000000000000;

var eggs = ["gemfragment", "gem0", "gem1", "armorbox", "weaponbox", "gift0", "gift1", "leather", "seashell", 'candy0v2', "candy1v2", "greenbomb"];

var itemTransferTarget = "YOUR MERCHANT HERE";

var transferMaxUpgraded = true;

setInterval(function(){
	if(parent != null && parent.socket != null)
	{
		var player = parent.entities[itemTransferTarget];

		if(player != null)
		{
			for(var i = 0; i < 41; i++)
			{
				var item = character.items[i];


				if(item != null && eggs.includes(item.name))
				{
					send_item(player.id, i, item.q);
					break;
				}
				else if(item != null && transferMaxUpgraded)
				{
					var upgradeIndex = upwhitelist.indexOf(item.name);
					var combineIndex = compwhitelist.indexOf(item.name);

					if(upgradeIndex != -1 || combineIndex != -1)
					{
						var maxLevel = 10;

						if(upgradeIndex != -1)
						{
							maxLevel = upgradeaxlevel;
						}
						else if(combineIndex != -1)
						{
							maxLevel = compoundmaxLevel;
						}

						if(item.level == maxLevel)
						{
							send_item(player.id, i, item.q);
						}
					}
				}
			}
		}
	}
}, 1000);

setInterval(function(){
	if(parent != null && parent.socket != null)
	{
		sellItems();
		buyPotions();
	}
	
	//GoldTransfer
	if(parent != null && parent.socket != null)
	{
		var targetEntity = parent.entities[transferTarget];

		if(targetEntity != null)
		{
			if(character.gold > maxGold && distance(character.real_x, character.real_y, targetEntity.real_x, targetEntity.real_y) < 400)
			{
				game_log("Sending Excess Gold to " + transferTarget);

				var goldToTransfer = character.gold - maxGold;

				send_gold(transferTarget, goldToTransfer);
			}
		}
	}
}, 500);

function needPotions()
{
	for(type_id in potion_types)
	{
		var type = potion_types[type_id];
		
		var potions = num_items(type);
		
		if(potions < min_potions)
		{
			return true;
		}
	}
	
	return false;
}

function buyPotions()
{
		if(empty_slots() > 0)
		{
			for(type_id in potion_types)
			{
				var type = potion_types[type_id];

				var item_def = parent.G.items[type];

				if(item_def != null)
				{
					var cost = item_def.g * purchase_amount;

					if(character.gold >= cost)
					{
						var num_potions = num_items(type);
						
						//game_log(type + "," + num_potions + "," + min_potions);
						
						if(num_potions < min_potions)
						{
							game_log("Buying " + type + " " + purchase_amount);
							parent.socket.emit("buy", {
								name: type,
								quantity: purchase_amount
							});
						}
					}
					else
					{
						game_log("Not Enough Gold!");
					}
				}
			}
		}
		else
		{
			game_log("Inventory Full!");
		}
}

function sellItems() {
		for (var i = 0; i <= 41; i++) {
			var curSlot = character.items[i];

			if (curSlot != null && itemSellList.indexOf(curSlot.name) >= 0 && curSlot.level == 0) {
				sell(i, curSlot.q);
				break;
			}
		}
}

function num_items(name)
{
	var item_count = character.items.filter(item => item != null && item.name == name).reduce(function(a,b){ return a + (b["q"] || 1);
	}, 0);
	
	return item_count;
}

function empty_slots()
{
	var empty = character.items.filter(item => item == null).length;
	
	return empty;
}
