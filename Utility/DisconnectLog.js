var disconnectHistory;
GetDisconnectHistory();
function GetDisconnectHistory(){
	disconnectHistory = JSON.parse(localStorage.getItem("Disconnect_Log:" + character.name));
	
	if(disconnectHistory == null)
	{
		disconnectHistory = [];
	}
}

function SaveDisconnect(){
	game_log("Saving Disconnect");
	var entry = {};
	entry.time = new Date();
	entry.reason = parent.window.disconnect_reason;
	disconnectHistory.push(entry);
	
	localStorage.setItem("Disconnect_Log:" + character.name, JSON.stringify(disconnectHistory));
}

parent.disconnect = disconnect_override;

function disconnect_override() {
	SaveDisconnect();
    var a = "DISCONNECTED";
    var b = "Disconnected";
    parent.game_loaded = false;
    if (parent.window.disconnect_reason == "limits") {
        a = "REJECTED";
        parent.add_log("Oops. You exceeded the limitations.", "#83BDCF");
        parent.add_log("You can have 3 characters and one merchant online at most.", "#CF888A")
    } else {
        if (parent.window.disconnect_reason) {
            parent.add_log("Disconnect Reason: " + window.disconnect_reason, "gray")
        }
    }
    if (character && (parent.auto_reload == "on" || parent.auto_reload == "auto" && (character.stand || parent.code_run || 1))) {
        parent.auto_reload = true;
        parent.code_to_load = null;
        if (parent.code_run && parent.actual_code) {
            parent.code_to_load = parent.codemirror_render.getValue()
        }
        b = "Reloading";
        parent.add_log("Auto Reload Active", parent.colors.serious_red);
        parent.reload_state = "start"
    } else {
        if (parent.character_to_load) {
            parent.add_log("Retrying in 7500ms", "gray");
            setTimeout(function() {
                parent.location.reload(true)
            }, 7500)
        }
    }

    if (character) {
        parent.$("title").html(b + " - " + character.name)
    }
    if (parent.socket) {
        parent.socket = null,
        parent.socket.disconnect()
    }    
	if (parent.no_html) {
		parent.set_status("Disconnected");
        parent.$("#name").css("color", "red")
        parent.$("iframe").remove();
        
    } else {
		parent.$("body").append("<div id='disconnectpanel' style='position: fixed; top: 0px; left: 0px; right: 0px; bottom: 0px; z-index: 999; background: rgba(0,0,0,0.85); text-align: center'><div onclick='refresh_page()' class='gamebutton clickable' style='margin-top: " + (parent.round(parent.height / 2) - 10) + "px'>" + a + "</div></div>")
    }
}