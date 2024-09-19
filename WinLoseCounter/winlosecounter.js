let fieldData, apiToken, text;
let timerPauseCommands, timerStartCommands, timerStopCommands, timerResetCommands = [];

let seconds = 0;
let timerInterval;
let isRunning = false;

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

    const startCommand = timerStartCommands.split(',').filter(s => !!s).map(s => s.trim());
    const stopCommand = timerStopCommands.split(',').filter(s => !!s).map(s => s.trim());
    const resetCommand = timerResetCommands.split(',').filter(s => !!s).map(s => s.trim());

    const commandThatMatchesStart = startCommand.find(command => text.toLowerCase().startsWith(command.toLowerCase()));
    const commandThatMatchesStop = stopCommand.find(command => text.toLowerCase().startsWith(command.toLowerCase()));
    const commandThatMatchesReset = resetCommand.find(command => text.toLowerCase().startsWith(command.toLowerCase()));

    if (commandThatMatchesStart && checkPrivileges(data)) {
        startTimer();
    }
    if (commandThatMatchesStop && checkPrivileges(data)) {
        pauseTimer();
    }

    if (commandThatMatchesReset && checkPrivileges(data)) {
        resetTimer();
    }
};

window.addEventListener('onEventReceived', function (obj) {
    if(!fieldData){
        return;
    }
    try {
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

    timerStartCommands = fieldData['timerStartCommands'];
    timerStopCommands = fieldData['timerStopCommands'];
    timerPauseCommands = fieldData['timerPauseCommands'];
    timerResetCommands = fieldData['timerResetCommands'];
});