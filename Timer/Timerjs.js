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

// Funkcja aktualizująca timer
function updateTimer() {
    seconds++;

    let days = Math.floor(seconds / (24 * 3600));
    let hours = Math.floor((seconds % (24 * 3600)) / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let secs = seconds % 60;

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    secs = secs < 10 ? "0" + secs : secs;

    if (days > 0) {
        days = days < 10 ? "0" + days : days;
        document.getElementById("timer").innerHTML = `${days}:${hours}:${minutes}:${secs}`;
    } else {
        document.getElementById("timer").innerHTML = `${hours}:${minutes}:${secs}`;
    }
}

// Funkcja startu timera
function startTimer() {
    if (!isRunning) {
        timerInterval = setInterval(updateTimer, 1000);
        isRunning = true;
    }
}

// Funkcja pauzy timera
function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
}

// Funkcja resetu timera (zachowuje aktualny stan, ale resetuje licznik)
function resetTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    document.getElementById("timer").innerHTML = "00:00:00";
    isRunning = false;
}