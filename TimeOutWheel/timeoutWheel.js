let fieldData, apiToken, toValuesArray, message, channelId, jwtToken;
let theWheel, channelName, spinCommand, cooldown, spins, segments = [];

const random_hex_color_code = () => {
    let n = (Math.random() * 0xfffff * 1000000).toString(16);
    return '#' + n.slice(0, 6);
};

const checkPrivileges = (data, privileges) => {
    const {tags, userId, displayName} = data;
    const {mod, subscriber, badges} = tags;
    const required = privileges || fieldData.privileges;
    const manualyausers = fieldData.manualyausers;
    const isMod = parseInt(mod);
    const isSub = parseInt(subscriber);
    const isVip = (badges.indexOf("vip") !== -1);
    const isBroadcaster = (userId === tags['room-id']);

    const currentUser = displayName.toString();
    //console.log(currentUser);
    const manualyausersArray = JSON.stringify(manualyausers).split(/[,"]/).filter(w => !!w);
    const userisAssigned = manualyausersArray.some(word => currentUser.includes(word));

    if (isBroadcaster) return true;
    if (required === "justSubs" && isSub) return true;
    if (required === "mods" && isMod) return true;
    if (required === "vips" && (isMod || isVip)) return true;
    if (required === "subs" && (isMod || isVip || isSub)) return true;
    if (required === "mausers" && userisAssigned) return true;
    return required === "everybody";
};

const processText = (text, emotes) => {
    let processedText = text;
    const { ignoreEmotes, ignoreEmojis, stripResponses } = fieldData;
    if(stripResponses && processedText.startsWith('@')){
        const textParts = processedText.split(' ');
        textParts.shift();
        processedText = textParts.join(' ');
    }
    if(ignoreEmotes){
        const emoteRegex = createEmoteRegex(emotes.map(e => htmlEncode(e.name)))
        const textParts = processedText.split(emoteRegex);
        processedText = textParts.join('');
    }
    if(ignoreEmojis){
        processedText = processedText.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    }
    processedText = processedText.replace(/#/g, ' hash tag ');
    return processedText.trim();
};


async function sendMessage(token, channel, message) {
    const url = `https://api.streamelements.com/kappa/v2/bot/${channel}/say`;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    const body = JSON.stringify({
        'message': message
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (response.ok) {
            console.log('Message sent successfully!');
        } else {
            console.error(`Failed to send message: ${headers.authorization} ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

const spinWheel = (obj) => {
    const skippable = ["bot:counter", "event:test", "event:skip"]; //Array of events coming to widget that are not queued so they can come even queue is on hold

    if (skippable.indexOf(obj.detail.listener) !== -1) return;
    if (obj.detail.listener === "message") {
        let data = obj.detail.event.data;
        const {text, userId, displayName, emotes} = data;

        const processedText = processText(text, emotes);
        const usertoBan = processedText;

        const realCommands = spinCommand.split(',').filter(s => !!s).map(s => s.trim());
        const commandThatMatches = realCommands.find(command => text.toLowerCase().startsWith(command.toLowerCase()));
        if (!commandThatMatches || !checkPrivileges(data)) {
            return;
        }
        let userban = usertoBan.toLowerCase().replace(commandThatMatches.toLowerCase(), '').trim();
        console.log(userban);

        if (wheelSpinning) return;
        document.getElementById("container").style.visibility = "visible";
        setTimeout(startSpin, 1000);
        //startSpin();
        setTimeout(
            function () {
                wheelSpinning = false; // set wheel not spinning, you can add callback to SE API here, to add points to `user`
                //var winningSegment = theWheel.getIndicatedSegment(); //- use this as reference
                console.log(theWheel.getIndicatedSegment());
              	if(theWheel.getIndicatedSegment().text == "PERM"){
                  	message = "/ban " + userban;
                } else {
                	message = "/timeout " + userban + " " + theWheel.getIndicatedSegment().value;
                }
              	document.getElementById("timeoutwho").style.visibility = "visible";
              	document.getElementById("timeoutwho").innerHTML = userban + " leci na " + theWheel.getIndicatedSegment().text;
                console.log(message);
              	
                sendMessage(jwtToken,channelId,message);
              	setTimeout(function (){document.getElementById("container").style.visibility = "hidden";
                                      document.getElementById("timeoutwho").style.visibility = "hidden";}, 5000);
        
            }, cooldown * 1500 + 100);
    } else if (obj.detail.listener === fieldData.listener) {
        const data = obj.detail.event;
        if (data.amount < fieldData.minAmount) {
            SE_API.resumeQueue();
            return;
        }
        for (let i in segments) {
            if (data.message.toLowerCase().indexOf(segments[i].text.toLowerCase()) !== -1) {

                let chance = 1 / segments.length * (1 + (fieldData.keywordModifier + data.amount * fieldData.amountModifier) / 100)

                chance = Math.min(fieldData.maxChance / 100, chance);
                console.log(chance);
                if (Math.random() < chance) {
                    let stopAt = theWheel.getRandomForSegment(i + 1);
                    theWheel.animation.stopAngle = stopAt;
                }
                break;
            }
        }
        startSpin();
        setTimeout(
            function () {
                wheelSpinning = false; // set wheel not spinning, you can add callback to SE API here, to add points to `user`
                //var winningSegment = theWheel.getIndicatedSegment(); //- use this as reference
                console.log(theWheel.getIndicatedSegment());
                
            }, cooldown * 1500 + 100);

    } else {
        SE_API.resumeQueue();
    }

}

window.addEventListener('onEventReceived', function (obj) {
    if(!fieldData){
        return;
    }
    if (obj.detail.listener !== "message") {
        return;
    }
    try {
        spinWheel(obj);
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

    channelName = obj["detail"]["channel"]["username"];
    spinCommand = fieldData['spinCommand'];
    cooldown = fieldData['duration'];
    spins = fieldData['spins'];

    channelId = fieldData['channelId'];
    jwtToken = fieldData['jwtToken'].toString();
    
    let tmpsegments = fieldData.segments.replace(" ", "").split(",");
    let tmpcolors = fieldData.segmentColors.toLowerCase().replace(" ", "").split(",");
    let weights = fieldData.segmentWeights.replace(" ", "").split(",");
    toValuesArray = fieldData.segmentsValues.replace(" ", "").split(",");
    let sumWeights = 0;
    if (!weights.length) sumWeights = 360;
    for (let i in weights) {
        if (parseInt(weights[i])) {
            sumWeights += parseInt(weights[i]);
        }
    }
    if (fieldData.segments.split(",").length > weights.length) {
        sumWeights += 360 * (fieldData.segments.split(",").length - weights.length) / fieldData.segments.split(",").length;
    }


    for (let i in fieldData.segments.split(",")) {
        if (typeof tmpcolors[i] === "undefined") tmpcolors[i] = random_hex_color_code();
        if (tmpcolors[i].length < 2) tmpcolors[i] = random_hex_color_code();
        if (parseFloat(weights[i])) {
            segments.push({'text': tmpsegments[i], 'value': toValuesArray[i], 'fillStyle': tmpcolors[i], 'size': 360 * weights[i] / sumWeights});
        } else {
            segments.push({'text': tmpsegments[i], 'value': toValuesArray[i], 'fillStyle': tmpcolors[i]});
        }
    }
    console.log(segments);
    if (fieldData.displayImage) {
        theWheel = new Winwheel({
            'drawMode': 'image',
            'outerRadius': fieldData['wheelSize'] / 2,        // Set outer radius so wheel fits inside the background.
            'innerRadius': fieldData['innerRadius'],         // Make wheel hollow so segments don't go all way to center.
            'textFontSize': fieldData['textSize'],         // Set default font size for the segments.
            'textOrientation': 'vertical', // Make text vertial so goes down from the outside of wheel.
            'textAlignment': 'outer',    // Align text to outside of wheel.
            'numSegments': segments.length,         // Specify number of segments.
            'segments': segments,          // Define segments including colour and text.
            'pins':
                {
                    'number': fieldData['pins'],
                },
            'animation':           // Specify the animation to use.
                {
                    'type': 'spinToStop',
                    'duration': cooldown,     // Duration in seconds.
                    'spins': spins     // Default number of complete spins.
                    //'callbackFinished' : 'spinEnd()'
                }
        });
    } else {
        theWheel = new Winwheel({
            'outerRadius': fieldData['wheelSize'] / 2,        // Set outer radius so wheel fits inside the background.
            'innerRadius': fieldData['innerRadius'],         // Make wheel hollow so segments don't go all way to center.
            'textFontSize': fieldData['textSize'],         // Set default font size for the segments.
            'textOrientation': 'vertical', // Make text vertial so goes down from the outside of wheel.
            'textAlignment': 'outer',    // Align text to outside of wheel.
            'numSegments': segments.length,         // Specify number of segments.
            'segments': segments,          // Define segments including colour and text.
            'pins':
                {
                    'number': fieldData['pins'],
                },
            'animation':           // Specify the animation to use.
                {
                    'type': 'spinToStop',
                    'duration': cooldown,     // Duration in seconds.
                    'spins': spins     // Default number of complete spins.
                    //'callbackFinished' : 'spinEnd()'
                }
        });
    }
    let loadedImg = new Image();
    loadedImg.onload = function () {
        theWheel.wheelImage = loadedImg;    // Make wheelImage equal the loaded image object.
        theWheel.draw();                    // Also call draw function to render the wheel.
    };
    loadedImg.src = fieldData.wheelImage;
});

// Vars used by the code in this page to do power controls.
let wheelSpinning = false;

function startSpin() {
    if (wheelSpinning === false) {
        theWheel.rotationAngle = 0;
        theWheel.stopAnimation(false);
        theWheel.animation.spins = spins;
        theWheel.startAnimation();
        wheelSpinning = true;
    }
}