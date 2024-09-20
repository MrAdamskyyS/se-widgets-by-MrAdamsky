let fieldData, apiToken, text, datac, listener;
let wlCounterStartCommands, wlCounterStopCommands, winCounter, loseCounter = [];

const checkPrivileges = (data, privileges) => {
    const {tags, userId} = data;
    const {mod} = tags;
    const required = privileges || fieldData.privileges;
    const isMod = parseInt(mod);
    const isBroadcaster = (userId === tags['room-id']);
  
    if (isBroadcaster) return true;
    if (required === "mods" && isMod) return true;
};

function handleTimer(obj) {
    let data = obj.detail.event.data;
    const { text } = data;

    const startCommand = wlCounterStartCommands.split(',').filter(s => !!s).map(s => s.trim());
    const stopCommand = wlCounterStopCommands.split(',').filter(s => !!s).map(s => s.trim());

    const commandThatMatchesStart = startCommand.find(command => text.toLowerCase().startsWith(command.toLowerCase()));
    const commandThatMatchesStop = stopCommand.find(command => text.toLowerCase().startsWith(command.toLowerCase()));
    

    if (commandThatMatchesStart && checkPrivileges(data)) {
        showCounter();
    }
    if (commandThatMatchesStop && checkPrivileges(data)) {
        hideCounter();
    }
};

  	function setCounter(obj){
      const { text } = datac;

      if (listener === 'bot:counter' && datac.counter === winCounter){
          document.getElementById("wintext").innerHTML = datac.value;
        }
      if (listener === 'bot:counter' && datac.counter === loseCounter){
          document.getElementById("losetext").innerHTML = datac.value;
        }
	};

window.addEventListener('onEventReceived', function (obj) {
    if(!fieldData){
        return;
    }
  
  	datac = obj.detail.event;
    listener = obj.detail.listener;
  
    try {
      	console.log(winCounter);
        setCounter(obj);
        handleTimer(obj);
    } catch (e) {
        console.log(e);
    } 
});

window.addEventListener('onWidgetLoad', function (obj) {
    // apparently sometimes the widget reloads and this resets the value.
    if(!obj.detail.fieldData){
        return;
    }
    fieldData = obj.detail.fieldData;
    apiToken = obj.detail.channel.apiToken;

    wlCounterStartCommands = fieldData['wlCounterStartCommands'];
    wlCounterStopCommands = fieldData['wlCounterStopCommands'];
  	winCounter = fieldData['winCounter'];
  	loseCounter = fieldData['loseCounter'];
});

function showCounter(){
    document.getElementById("container").style.visibility = "visible";
};

function hideCounter(){
    document.getElementById("container").style.visibility = "hidden";
};