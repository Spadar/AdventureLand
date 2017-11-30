//Original Base for GUI Layout From: https://github.com/JourneyOver/Adventure_Land_Codes/blob/master/Code%20Snippits/GUI%20Additions/Estimated%20Time%20Until%20Level%20Up%20GUI.js

//Running window in milliseconds of how long to track hits for. Any hits outside of this window are removed.
var dpsInterval = 10000;
var damageLog = [];

setInterval(function() {
  updateMeter();
}, 100);

function init_dpsmeter(minref) {

  let $ = parent.$;
  let brc = $('#bottomrightcorner');

  brc.find('#dpsmeter').remove();

  let dpsmeter_container = $('<div id="dpsmeter"></div>').css({
    fontSize: '28px',
    color: 'white',
    textAlign: 'center',
    display: 'table',
    overflow: 'hidden',
    marginBottom: '-5px',
	width: "100%"
  });
	
  //vertical centering in css is fun
  let xptimer = $('<div id="dpsmetercontent"></div>')
    .css({
      display: 'table-cell',
      verticalAlign: 'middle'
    })
    .html("")
    .appendTo(dpsmeter_container);

  brc.children().first().after(dpsmeter_container);
}



function updateMeter()
{
	let $ = parent.$;
	
	var listString = '<table border=5 bgcolor="black" align="right" cellpadding="5"><tr align="center"><td colspan="2">Damage Meter</td></tr><tr align="center"><td>Name</td><td>DPS</td></tr>';
	
	if(parent.party_list != null && character.party != null)
	{
		for(id in parent.party_list)
		{
			var partyMember = parent.party_list[id];
			var dps = getDPS(partyMember);
			listString = listString + '<tr align="left"><td align="center">' + partyMember + '</td><td>' + dps + '</td></tr>';
		}
	}
	else
	{
		var dps = getDPS(character.name);
		listString = listString + '<tr align="left"><td align="center">' + character.name + '</td><td>' + dps + '</td></tr>';
	}
	
	if(parent.party_list != null && character.party != null)
	{
		var dps = getDPS();
		listString = listString + '<tr align="left"><td align="center">' + "Total" + '</td><td>' + dps + '</td></tr>';
	}
	
	$('#' + "dpsmetercontent").html(listString);
}


init_dpsmeter(5)

function getDPS(partyMember)
{
	var sumDamage = 0;
	var minTime;
	var maxTime;
	var entries = 0;
	
	for(id in damageLog)
	{
		logEntry = damageLog[id];
		if(new Date() - logEntry.time < dpsInterval)
		{
			if(partyMember == null || logEntry.attacker == partyMember)
			{
					if(minTime == null || logEntry.time < minTime)
					{
						minTime = logEntry.time;
					}
				
					if(maxTime == null || logEntry.time > maxTime)
					{
						maxTime = logEntry.time;
					}
				
					sumDamage += logEntry.damage;
				entries++;
			}
		}
		else
		{
			damageLog.splice(id, 1);
		}
	}
	
	if(entries <= 1)
	{
		return 0;
	}
	
	var elapsed = maxTime - minTime;
	
	var dps = parseFloat(Math.round((sumDamage/(elapsed/1000)) * 100) / 100).toFixed(2);
	
	return dps;
}

//Clean out an pre-existing listeners
if (parent.prev_handlersdpsmeter) {
    for (let [event, handler] of parent.prev_handlersdpsmeter) {
      parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlersdpsmeter = [];

//handler pattern shamelessly stolen from JourneyOver
function register_dpsmeterhandler(event, handler) 
{
    parent.prev_handlersdpsmeter.push([event, handler]);
    parent.socket.on(event, handler);
};

function dpsmeterHitHandler(event)
{
	if(parent != null)
	{
		var attacker = event.hid;
		var attacked = event.id;

		var attackerEntity = parent.entities[attacker];
		
		if(attacker == character.name)
		{
			attackerEntity = character;
		}
		
		if((attackerEntity.party != null || attacker == character.name) || attackerEntity.party == character.party)
		{
			if(event.damage != null)
			{
				var hitEvent = {};
				hitEvent.damage = event.damage;
				hitEvent.time = new Date();
				hitEvent.attacker = event.hid;
				
				damageLog.push(hitEvent);
			}
		}
	}
}


register_dpsmeterhandler("hit", dpsmeterHitHandler);
