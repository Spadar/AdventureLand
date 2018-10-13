var lastcc = 0;
init_ccmeter();
function init_ccmeter() {
	let $ = parent.$;
	let statbars = $('#bottommid');

	statbars.find('#ccmeter').remove();

	let ccmeter = $('<div id="ccmeter"></div>').css({
		fontSize: '15px',
		color: 'white',
		textAlign: 'center',
		display: 'table',
		width: "50%",
		margin: "0 auto"
	});

	let ccmeter_content = $('<div id="ccmetercontent"></div>')
	.html("<div><div id='ccmeterfill'></div></div>")
	.css({
		display: 'table-cell',
		verticalAlign: 'middle',
		background: 'green',
		border: 'solid gray',
		borderWidth: '4px 4px 0px, 4px',
		height: '15px',
		color: '#FFD700',
		textAlign: 'center',
		width: "100%",
	})
	.appendTo(ccmeter);
	statbars.children().first().after(ccmeter);

	update_ccmeter();
}



function update_ccmeter()
{
	let $ = parent.$;
	var fillAmount = ((character.cc/180)*100).toFixed(0);
	
	$("#ccmeterfill").css({
		background: 'red',
		height: '15px',
		color: '#FFD700',
		textAlign: 'center',
		width: fillAmount + "%",
	});
}

//Clean out an pre-existing listeners
if (parent.prev_handlersccmeter) {
    for (let [event, handler] of parent.prev_handlersccmeter) {
      parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlersccmeter = [];

//handler pattern shamelessly stolen from JourneyOver
function register_ccmeterhandler(event, handler) 
{
    parent.prev_handlersccmeter.push([event, handler]);
    parent.socket.on(event, handler);
};

function ccmeter_playerhandler(event){
	if(event.cc != lastcc)
	{
		update_ccmeter();
		lastcc = event.cc;
	}
}

register_ccmeterhandler("player", ccmeter_playerhandler);