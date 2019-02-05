var minGold = 5000000;
var maxGold = 15000000;

var bankItems = {
	//ItemID: {bank: banktabID, level: min level, quantity: min quantity}
	firecrackers: {bank: "items7", level: -1, quantity: 1}
};

var lastStore;

function needToBank()
{
	if(character.gold > maxGold)
	{
		return true;
	}
	
	for(id in character.items)
	{
		var item = character.items[id];
			
		if(item != null)
		{
			var storeDef = bankItems[item.name]

			if(storeDef != null && (storeDef.level == -1 || item.level == storeDef.level) && (storeDef.quantity == -1 || item.q > storeDef.quantity))
			{
				return true;
			}
		}
	}
}

function storeGold()
{
	if(character.gold > minGold)
	{
		parent.socket.emit("bank", {
			operation: "deposit",
			amount: character.gold - minGold
		});
	}
}

function storeItems()
{
	if(character.map == "bank")
	{
		for(id in character.items)
		{
			var item = character.items[id];
			
			if(item != null)
			{
				var storeDef = bankItems[item.name]

				if(storeDef != null && (storeDef.level == -1 || item.level == storeDef.level))
				{
					parent.socket.emit("bank", {
										operation: "swap",
										inv: id,
										str: -1,
										pack: storeDef.bank
									});
					break;
				}
			}
		}
	}
}

function tryDepositStuff()
{
	if(character.map == "bank")
	{
		if(lastStore == null || new Date() - lastStore > 750)
		{
			
			storeItems();

			if(character.gold > minGold)
			{
				parent.socket.emit("bank", {
					operation: "deposit",
					amount: character.gold - minGold
				});
			}

			lastStore = new Date();
		}
	}
}

setInterval(function () {
	if(!needToBank())
	{
		//Normal Farming Stuff, must handle return logic here
	}
	else
	{
		if(!smart.moving)
		{
			smart_move({x: 0, y: 50, map: "bank"});
		}
			
		tryDepositStuff();
	}
}, 50);