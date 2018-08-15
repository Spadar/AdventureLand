var goldInterval = 1000*60*60;
var goldLog = [];

setInterval(function() {
  update_goldmeter();
}, 100);

function init_goldmeter() {
  let $ = parent.$;
  let brc = $('#bottomrightcorner');

  brc.find('#goldtimer').remove();

  let xpt_container = $('<div id="goldtimer"></div>').css({
    fontSize: '28px',
    color: 'white',
    textAlign: 'center',
    display: 'table',
    overflow: 'hidden',
    marginBottom: '-5px',
	width: "100%"
  });
	
  //vertical centering in css is fun
  let xptimer = $('<div id="goldtimercontent"></div>')
    .css({
      display: 'table-cell',
      verticalAlign: 'middle'
    })
    .html("")
    .appendTo(xpt_container);

  brc.children().first().after(xpt_container);
}

function updateGoldTimerList()
{
	let $ = parent.$;
	
	var gold = getGold();
	
	var goldString = "<div>" + gold + " Gold/Hr" + "</div>" 
	
	$('#' + "goldtimercontent").html(goldString).css({
    background: 'black',
    border: 'solid gray',
    borderWidth: '5px 5px',
    height: '34px',
    lineHeight: '34px',
    fontSize: '30px',
    color: '#FFD700',
    textAlign: 'center',
  });
}


function update_goldmeter() {
	updateGoldTimerList();
}


init_goldmeter()

function getGold()
{
	var sumGold = 0;
	var minTime;
	var maxTime;
	var entries = 0;
	
	for(id in goldLog)
	{
		logEntry = goldLog[id];
		if(new Date() - logEntry.time < goldInterval)
		{
			if(minTime == null || logEntry.time < minTime)
			{
				minTime = logEntry.time;
			}
				
			if(maxTime == null || logEntry.time > maxTime)
			{
				maxTime = logEntry.time;
			}
				
			sumGold += logEntry.gold;
			entries++;
		}
		else
		{
			goldLog.splice(id, 1);
		}
	}
	
	if(entries <= 1)
	{
		return 0;
	}
	
	var elapsed = maxTime - minTime;
	
	var goldPerSecond = parseFloat(Math.round((sumGold/(elapsed/1000)) * 100) / 100);
	
	return parseInt(goldPerSecond * 60 * 60).toLocaleString('en');
}

//Clean out an pre-existing listeners
if (parent.prev_handlersgoldmeter) {
    for (let [event, handler] of parent.prev_handlersgoldmeter) {
      parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlersgoldmeter = [];

//handler pattern shamelessly stolen from JourneyOver
function register_goldmeterhandler(event, handler) 
{
    parent.prev_handlersgoldmeter.push([event, handler]);
    parent.socket.on(event, handler);
};

function goldMeterGameResponseHandler(event)
{
	if(event.response == "gold_received")
	{
		var goldEvent = {};
		goldEvent.gold = event.gold;
		goldEvent.time = new Date();
		goldLog.push(goldEvent);
	}
}

function goldMeterGameLogHandler(event)
{
	if(event.color == "gold")
	{
		var gold = parseInt(event.message.replace(" gold", "").replace(",", ""));
		
		var goldEvent = {};
		goldEvent.gold = gold;
		goldEvent.time = new Date();
		goldLog.push(goldEvent);
	}
}


register_goldmeterhandler("game_log", goldMeterGameLogHandler);
register_goldmeterhandler("game_response", goldMeterGameResponseHandler);