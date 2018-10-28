function new_render_party() {
    var b = "";
    for (var a in parent.party) {
        var c = parent.party[a];
        b += " <div class='gamebutton' style='padding: 6px 8px 6px 8px; font-size: 24px; line-height: 18px' onclick='party_click(\"" + a + "\")'>";
        b += parent.sprite(c.skin, {
            cx: c.cx || [],
            rip: c.rip
        });
        if (c.rip) {
            b += "<div style='color:gray; margin-top: 1px'>RIP</div>"
        } else {
            b += "<div style='margin-top: 1px'>" + a.substr(0, 3).toUpperCase() + "</div>"
        }
		b += "<div style='margin-top: 1px'>" + (c.share*100).toFixed(0) + "%</div>"
        b += "</div>"
    }
    parent.$("#newparty").html(b);
    if (!parent.party_list.length) {
        parent.$("#newparty").hide()
    } else {
        parent.$("#newparty").show()
    }
}
parent.render_party = new_render_party;

setInterval(function(){
	new_render_party();
}, 1000);