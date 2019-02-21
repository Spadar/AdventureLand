var itemListDef = [{name: "ornamentstaff", slot: 1, price: 800000, quantity: 1, level: 0}];

function tryListItem(saleItem)
{
	if(character.stand)
	{
		var slotName = "trade" + saleItem.slot;
		var slot = character.slots[slotName];

		var itemIndex = -1;

		for(var id in character.items)
		{
			var item = character.items[id];
			if(item != null)
			{
				if(item.name == saleItem.name && (saleItem.level == null || saleItem.level == item.level))
				{
					itemIndex = id;
					break;
				}
			}
		}

		if(itemIndex != -1)
		{
			var listItem = false;

			if(slot != null && slot.name == saleItem.name)
			{
				var quantity = 1;

				if(slot.q != null)
				{
					quantity = slot.q;
				}

				if(quantity != saleItem.quantity || slot.price != saleItem.price)
				{
					parent.socket.emit("unequip", {
						slot: slotName
					});
					listItem = true;
				}
			}
			else
			{
				parent.socket.emit("unequip", {
						slot: slotName
				});
				listItem = true;
			}

			if(listItem)
			{
				parent.trade('trade' + saleItem.slot, itemIndex, saleItem.price, saleItem.quantity);
			}
		}
	}
}

setInterval(function(){
	for(id in itemListDef)
	{
		item = itemListDef[id];
		
		tryListItem(item);
	}
}, 1000);
