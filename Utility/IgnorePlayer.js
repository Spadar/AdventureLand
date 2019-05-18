let ignore_list = ["Raphiel", "AriaHarper", "Firenus", "Boismon", "Daedulaus"];

let origPM = parent.socket._callbacks["$pm"][0];
parent.socket.off("pm");

parent.socket.on("pm", function(data){
	if(!ignore_list.includes(data.owner))
	{
	    parent.draw_trigger(function() {
			var entity = parent.get_entity(data.id);
			if (entity) {
				parent.d_text(data.message, entity, {
					size: parent.SZ.chat,
					color: "#BA6B88"
				});
				parent.sfx("chat", entity.real_x, entity.real_y)
			} else {
				parent.sfx("chat")
			}
			var cid = "pm" + (data.to || data.owner);
			parent.add_pmchat(data.to || data.owner, data.owner, data.message);
			if (parent.in_arr(cid, parent.docked)) {
				parent.add_chat(data.owner, data.message, "#CD7879")
			}
    	});
	}
});

let origChat = parent.socket._callbacks["$chat_log"][0];
parent.socket.off("chat_log");

parent.socket.on("chat_log", function(data){
	if(!ignore_list.includes(data.owner))
	{
        parent.draw_trigger(function() {
            var entity = parent.get_entity(data.id);
            if (data.id == "mainframe") {
                parent.d_text(data.message, {
                    real_x: 0,
                    real_y: -100,
                    height: 24
                }, {
                    size: parent.SZ.chat,
                    color: "#C7EFFF"
                });
                parent.sfx("chat", 0, -100)
            } else {
                if (entity) {
                    parent.d_text(data.message, entity, {
                        size: parent.SZ.chat
                    });
                    parent.sfx("chat", entity.real_x, entity.real_y)
                } else {
                    parent.sfx("chat")
                }
            }
            parent.add_chat(data.owner, data.message)
        })
	}
});

function on_destroy(){
	parent.socket.off("pm");
	parent.socket.on("pm", origPM);
	
	parent.socket.off("chat_log");
	parent.socket.on("chat_log", origChat);
}