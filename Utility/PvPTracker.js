game_log("---PvP Tracking Start---");

var curLog = [];
loadPvPTrackerLog();

function loadPvPTrackerLog()
{
	curLog = JSON.parse(localStorage.getItem("PvP_Log:" + character.name));
	
	if(curLog == null)
	{
		curLog = [];
	}
}

function savePvPTrackerLog()
{
	localStorage.setItem("PvP_Log:" + character.name, JSON.stringify(curLog));
}

//Clean out an pre-existing listeners
if (parent.prev_handlerspvptracker) {
    for (let [event, handler] of parent.prev_handlerspvptracker) {
      parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlerspvptracker = [];

//handler pattern shamelessly stolen from JourneyOver
function register_pvptrackerhandler(event, handler) 
{
    parent.prev_handlerspvptracker.push([event, handler]);
    parent.socket.on(event, handler);
};

function pvptrackerhitHandler(event)
{
    if(parent != null)
    {
    }
}

function pvptrackerhitHandler(event)
{
	if(parent != null)
	{
		if(attackedEntity.type == "character" && event.heal == null)
		{
			var logEntry = {};
			logEntry.Attacker = event.hid;
			logEntry.Defender = event.id;
			logEntry.Animation = event.anim;
			logEntry.Damage = event.damage;
			logEntry.Time = new Date();
				
			curLog.push(logEntry);
			savePvPTrackerLog();
		}
	}
}

register_pvptrackerhandler("death", pvptrackerhitHandler);
register_pvptrackerhandler("hit", pvptrackerhitHandler);
