if (window.twisterInitialized) {
    console.log("Wykryto próbę podwójnego załadowania! Blokuję.");
} else {
    window.twisterInitialized = true;

    let fieldData, channelId, jwtToken, spinCost, apiToken;
    let cooldown, spins, cooldownTime, theWheel;
    let wheelSpinning = false, isOnCooldown = false, isTwisterActive = false;
    
    let isPlaying = false;
    let queue = [];
    let currentAudio;

    const unlockAudio = () => {
        const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        silent.play().then(() => {
            console.log("TTS Engine Unlocked via Interaction");
            window.removeEventListener('mousedown', unlockAudio);
        }).catch(e => console.log("Czekam na kliknięcie w widget..."));
    };
    window.addEventListener('mousedown', unlockAudio);

    const endedListener = () => {
        currentAudio.removeEventListener('ended', endedListener);
        currentAudio = undefined;
        if(queue.length > 0){
            const nextMessage = queue.pop();
            sayMassagedMessage(nextMessage.fullMessage, nextMessage.messageVoice);
        } else {
            isPlaying = false;
        }
    };

    const sayMassagedMessage = (fullMessage, messageVoice) => {
        if(!fullMessage.trim() || !fieldData.useTTS){
            return;
        }
        isPlaying = true;
        const volume = fieldData.volume || 0.5;
        const voice = messageVoice ? messageVoice.replace('$', '') : fieldData.voice;

        const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(fullMessage.replace(/&/g, ' and '))}&key=${apiToken}`;
        
        currentAudio = new Audio(url);
        currentAudio.volume = volume;
        currentAudio.addEventListener('ended', endedListener);
        
        const playPromise = currentAudio.play();
        if(playPromise !== undefined){
            playPromise.catch(e => {
                console.error("TTS Playback Blocked. Click 'Interact' in OBS and click on the widget area.", e);
                isPlaying = false;
            });
        }
    };

    const sayMessageTTS = (message, messageVoice) => {
        if(fieldData.useQueue && isPlaying){
            queue.unshift({fullMessage: message, messageVoice});
            return;
        }
        sayMassagedMessage(message, messageVoice);
    };

    const generateSegments = () => {
        const colors = [
            { id: 'red', fill: '#FF4A4A', name: 'Czerwony' },
            { id: 'blue', fill: '#1E90FF', name: 'Niebieski' },
            { id: 'yellow', fill: '#FFD700', name: 'Żółty' },
            { id: 'green', fill: '#32CD32', name: 'Zielony' }
        ];
        const limbs = ['P. RĘKA', 'L. RĘKA', 'P. NOGA', 'L. NOGA'];
        
        let newSegments = [];
        
        let shuffledLimbs = [];
        for(let i=0; i<4; i++) {

            limbs.forEach(l => shuffledLimbs.push(l));
        }
        
        // Mieszamy kończyny
        for (let i = shuffledLimbs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledLimbs[i], shuffledLimbs[j]] = [shuffledLimbs[j], shuffledLimbs[i]];
        }

        for (let i = 0; i < 16; i++) {
            let color = colors[i % 4]; 
            let limb = shuffledLimbs[i];
            newSegments.push({
                text: limb,
                fillStyle: color.fill,
                textFillStyle: '#ffffff',
                resultText: `${limb.replace('P. ', 'Prawa ').replace('L. ', 'Lewa ')} na ${color.name}`
            });
        }
        return newSegments;
    };

    async function apiCall(endpoint, method = 'GET', body = null) {
        const cleanId = channelId.toString().replace(/[^a-z0-9]/gi, '').trim();
        const options = {
            method: method,
            headers: { 
                'Authorization': `Bearer ${jwtToken.trim()}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json; charset=utf-8'
            }
        };
        if (body) options.body = JSON.stringify(body);
        const finalEndpoint = endpoint.replace('{channel}', cleanId);
        return await fetch(`https://api.streamelements.com/kappa/v2/${finalEndpoint}`, options);
    }

    window.addEventListener('onWidgetLoad', function (obj) {
        if(!obj.detail.fieldData) return;
        fieldData = obj.detail.fieldData;
        apiToken = obj.detail.channel.apiToken;
        channelId = fieldData.channelId || obj.detail.channel.id;
        jwtToken = fieldData.jwtToken || "";

        spinCost = parseInt(fieldData.spinCost.toString().replace(/[^0-9]/g, '')) || 2500;
        cooldown = parseFloat(fieldData.duration) || 4;
        spins = parseInt(fieldData.spins) || 5;
        cooldownTime = parseInt(fieldData.cooldownTime) || 30;

        theWheel = new Winwheel({ 
            'canvasId': 'canvas', 'outerRadius': 235, 'innerRadius': 75, 'lineWidth': 6, 
            'strokeStyle': '#ffffff', 'textFontSize': 22, 'numSegments': 16, 
            'segments': generateSegments() 
        });
    });

    window.addEventListener('onEventReceived', async function (obj) {
        if (!obj.detail || obj.detail.listener !== "message") return;
        
        let data = obj.detail.event.data;
        let text = data.text.toLowerCase().trim();
        let displayName = data.displayName;
        let loginName = (data.nick || data.displayName).toLowerCase();
        let isMod = data.tags.mod === "1" || data.userId === data.tags['room-id'];

        if (text === fieldData.startCommand.toLowerCase()) {
            if (!isMod) return;
            isTwisterActive = true;
            await apiCall(`bot/{channel}/say`, 'POST', { message: `🌪️ TWISTER AKTYWNY - Koszt zakręcenia ${Math.abs(spinCost)} punktów!` });
            return;
        }

        if (text === fieldData.stopCommand.toLowerCase()) {
            if (!isMod) return;
            isTwisterActive = false;
            await apiCall(`bot/{channel}/say`, 'POST', { message: `🛑 TWISTER WYŁĄCZONY!` });
            return;
        }

        if (text === fieldData.spinCommand.toLowerCase()) {
            if (!isTwisterActive || wheelSpinning) return;

            if (isOnCooldown) {
                await apiCall(`bot/{channel}/say`, 'POST', { message: `❌ @${displayName}, poczekaj ziom jest cooldown!` });
                return;
            }
            
            wheelSpinning = true;
            let res = await apiCall(`points/{channel}/${loginName}`);
            
            if (!res.ok) { 
                wheelSpinning = false; 
                return; 
            }
            
            let userData = await res.json();
            if (userData.points < spinCost) {
                await apiCall(`bot/{channel}/say`, 'POST', { message: `❌ @${displayName}, brak punktów!` });
                wheelSpinning = false; 
                return; 
            }

            let deductRes = await apiCall(`points/{channel}/${loginName}/-${Math.abs(spinCost)}`, 'PUT');
            if (!deductRes.ok) {
                wheelSpinning = false; 
                return;
            }

            await apiCall(`bot/{channel}/say`, 'POST', { message: `💸 @${displayName} kręci!` });
            startTwisterSpin(displayName);
        }
    });

    function startTwisterSpin(username) {

        theWheel.rotationAngle = 0; theWheel.draw();
        TweenMax.to("#container", 1.2, { bottom: "50px", ease: "Back.easeOut" });
        TweenMax.set("#timeoutwho", { opacity: 0 });

        TweenMax.to(theWheel, cooldown, {
            rotationAngle: (360 * spins) + Math.floor(Math.random() * 360),
            ease: "Power3.easeOut",
            onUpdate: () => theWheel.draw(),
            onComplete: async () => {
                let seg = theWheel.getIndicatedSegment();
                document.getElementById("timeoutwho").innerHTML = `${seg.resultText}`;
                TweenMax.to("#timeoutwho", 0.5, { opacity: 1 });

                await apiCall(`bot/{channel}/say`, 'POST', { message: `🌪️ ${seg.resultText}!` });

                sayMessageTTS(seg.resultText, fieldData.voice);

                isOnCooldown = true;
                setTimeout(() => { 
                    TweenMax.to("#container", 1, { bottom: "-900px" }); 
                    wheelSpinning = false; 
                }, 8000);

                setTimeout(async () => {
                    isOnCooldown = false;
                    if (isTwisterActive) await apiCall(`bot/{channel}/say`, 'POST', { message: `✅ Następne zakręcenie dostępne!` });
                }, cooldownTime * 1000);
            }
        });
    }
}