var upgradeaxlevel = 6; 
var upwhitelist = ["gloves1", "coat1", "helmet1", "pants1", "shoes1", 'poker', 'partyhat'];

var compwhitelist = ['tristone', 'ftrinket'];
var compoundmaxLevel = 3;

var itemSellList = ["pants", "coat", "helmet", "gloves", 'shoes'];

setInterval(function() {
	if(character.items[0] != null)
	{
		exchange(0);
	}
}, 1000);

setInterval(function() {

	if(character.map == "main")
	{
		var upgrader = parent.G.maps["main"].npcs.filter(npc => npc.id == "newupgrade")[0];
		
		if(distance(upgrader.position[0], upgrader.position[1], character.real_x, character.real_y) < 250)
		{
			upgrade(upgradeaxlevel);
			compound_items();
		}
	}

}, 200); // Loops every 1/4 seconds.

setInterval(function(){
	sellItems();
}, 500);

function sellItems() {
	var merchants = parent.G.maps[character.map].npcs.filter(npc => parent.G.npcs[npc.id].role == "merchant" && distance(npc.position[0], npc.position[1], character.real_x, character.real_y) < 250);
	
	if(merchants.length > 0)
	{
		for (var i = 0; i <= 41; i++) {
			var curSlot = character.items[i];

			if (curSlot != null && itemSellList.indexOf(curSlot.name) >= 0 && curSlot.level == 0) {
				sell(i, curSlot.q);
				break;
			}
		}
	}
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
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

function upgrade(level) {
  for (let i = 0; i < character.items.length; i++) {
    let c = character.items[i];
    if (c && upwhitelist.includes(c.name) && c.level < level) {
      let grades = get_grade(c);
      let scrollname;
      if (c.level < grades[0])
        scrollname = 'scroll0';
      else if (c.level < grades[1])
        scrollname = 'scroll1';
      else
        scrollname = 'scroll2';

      let [scroll_slot, scroll] = find_item(i => i.name == scrollname);
      if (!scroll) {
        parent.buy(scrollname);
        return;
      }

      parent.socket.emit('upgrade', {
        item_num: i,
        scroll_num: scroll_slot,
        offering_num: null,
        clevel: c.level
      });
      return;
    }
  }
}

function compound_items() {
  let to_compound = character.items.reduce((collection, item, index) => {
    if (item && item.level < compoundmaxLevel && compwhitelist.includes(item.name)) {
      let key = item.name + item.level;
      !collection.has(key) ? collection.set(key, [item.level, item_grade(item), index]) : collection.get(key).push(index);
    }
    return collection;
  }, new Map());

  for (var c of to_compound.values()) {
    let scroll_name = "cscroll" + c[1];

    for (let i = 2; i + 2 < c.length; i += 3) {
      let [scroll, _] = find_item(i => i.name == scroll_name);
      if (scroll == -1) {
        parent.buy(scroll_name);
        return;
      }
		
		game_log(scroll_name);
		game_log(c[i]);
		game_log(c[i+1]);
		game_log(c[i+2]);
      parent.socket.emit('compound', {
        items: [c[i], c[i + 1], c[i + 2]],
        scroll_num: scroll,
        offering_num: null,
        clevel: c[0]
      });
	  return;
    }
  }
}

function get_grade(item) {
  return parent.G.items[item.name].grades;
}

// Returns the item slot and the item given the slot to start from and a filter.
function find_item(filter) {
  for (let i = 0; i < character.items.length; i++) {
    let item = character.items[i];

    if (item && filter(item))
      return [i, character.items[i]];
  }

  return [-1, null];
}