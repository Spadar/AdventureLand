if(parent.ModulesLoaded == null)
{
	parent.ModulesLoaded = [];
}

parent.ModulesLoaded.push("AutoUpgrade");

var en = true; //Enable Upgrading of items = true, Disable Upgrading of items = false
var upgradeaxlevel = 7; //Max level it will stop upgrading items at if enabled
var upwhitelist = ["quiver", "mcape", "firestaff", "fireblade", "sshield", "shield", "gloves1", "coat1", "helmet1", "pants1", "shoes1", "cape", "pmace", "t2bow", "spear", "basher", "bunnyears", "carrotsword", "pyjamas", "bataxe", "harbringer", "oozingterror", 'claw', 'phelmet']; //Add items that you want to be upgraded as they come to your inventory [always add ' ' around item and , after item]
// Upgrading [enhancing] [will only upgrade items that are in your inventory & in the whitelist] 

var cp = true; //Set to true in order to allow compounding of items
var compwhitelist = ['wbook0', 'lostearring', 'strearring', 'intearring', 'dexearring', 'hpbelt', 'ringsj', 'strring', 'intring', 'dexring', 'vitring', 'dexamulet', 'intamulet', 'stramulet', 'vitearring', 'dexbelt', 'intbelt', 'strbelt'];
var use_better_scrolls = false; //240,000 Gold Scroll = true [only will use for +2 and higher], 6,400 Gold Scroll = false [will only use base scroll no matter what]
var compoundmaxLevel = 3;

setInterval(function() {
	if(parent != null && parent.socket != null)
	{
				  if (en) {
					upgrade(upgradeaxlevel);
				  }
					if (cp) {
					compound_items();
				  }
	}

}, 500); // Loops every 1/4 seconds.

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