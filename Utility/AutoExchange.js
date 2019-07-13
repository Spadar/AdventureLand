let itemsToExchange = ["seashell"];

let lastExchange = 0;
setInterval(function(){
	if(!character.q.exchange && new Date() - lastExchange > 1000)
	{
		for(let id in itemsToExchange)
		{
			let exchangeName = itemsToExchange[id];
			
			let itemDef = parent.G.items[exchangeName];
			
			let matches = findItemInInventory(exchangeName);
			
			let exchangeable = matches.find(function(e){return e.q >= itemDef.e});
			if(exchangeable)
			{
				exchange(exchangeable.slot);
				lastExchange = new Date();
			}
		}
	}
}, 100);

//returns all items in your inventory that match a particular item name.
function findItemInInventory(itemName)
{
	
	let items = [];
	
	for(var i = 0; i <= 41; i++)
	{
		let item = character.items[i];
		
		if(item != null)
		{
			item.slot = i;
			if(item.name == itemName)
			{
				
				items.push(item);
			}
		}
	}
	
	return items;
}