//Item IDs can be found via the commented code below:
//show_json(parent.G.items);
//Object format is {name: "itemid", level: "upgrade level", price: max cost of item}
var itemsToBuy = [{name: "staff", level: 9, price: 5000000}, 
				  {name: "bow", level: 9, price: 5000000},
				  {name: "fireblade", level: 0, price: 150000}]

var lastBuy;
setInterval(function () {
	
	buyItems();
	
}, 10);

function itemBuyPrice(name, level)
{
	var price = 1;
	
	for(var i = 0; i < itemsToBuy.length; i++)
	{
		var def = itemsToBuy[i];
		
		if(def.name == name && def.level <= level)
		{
			price = def.price;
		}
	}
	
	return price;
}

function buyItems()
{
	for(id in parent.entities)
    {
        var current=parent.entities[id];
		
		if(current.ctype != null && current.ctype == "merchant" && current.name != character.name)
		{
			
			var slotPrefix = "trade";
			
			for(var i = 1; i <= 16; i++)
			{
				var tradeSlot = current.slots[slotPrefix + i];
				
				if(tradeSlot != null)
				{
					var price = itemBuyPrice(tradeSlot.name, tradeSlot.level);
					
					if(price != null && character.gold >= tradeSlot.price && tradeSlot.price <= price)
					{
						if(lastBuy == null || new Date() - lastBuy > 100)
						{
							game_log("Item Bought: " + tradeSlot.name);
							game_log("From: " + current.name);
							game_log("Price: " + tradeSlot.price);
							trade_buy(current, slotPrefix + i);
							
							lastBuy = new Date();
						}
					}
				}
			}
		}
	}
}
