let fieldData, timezoneOffset;


const weatherIcons = {
    "01d": "☀️", "01n": "🌙",
    "02d": "⛅", "02n": "☁️",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️",
    "10d": "🌦️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️"
};

async function updateWeather() {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(fieldData.city)}&units=metric&appid=${fieldData.apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const temperature = data.main.temp;
        const iconCode = data.weather[0].icon;
        const location = data.name;
        timezoneOffset = data.timezone; // Pobieramy offset czasu w sekundach

        // Aktualizujemy temperaturę, ikonę i licznik dni
        document.getElementById("temperature").innerText = `${temperature.toFixed(1)} °C`;
        document.getElementById("icon").innerText = weatherIcons[iconCode] || "❓";
        updateDayCounter(location);
        
    } catch (error) {
        console.error("Błąd pobierania danych o pogodzie:", error);
    }
}

function updateClock() {
    const now = new Date();
    const options = { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false };
    document.getElementById("clock").innerText = new Intl.DateTimeFormat('pl-PL', options).format(now);
}


function updateDayCounter(location) {
    const datka = fieldData.data1;
    const [day, month, year] = datka.split('.');
    const startDate = new Date(year, month - 1, day);
    const today = new Date();
    const diffTime = today - startDate;
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    document.getElementById("day-counter").innerText = `Dzień #${dayNumber} - ${location}`;
}

updateClock();
updateWeather();

setInterval(updateWeather, 60000);
setInterval(updateClock, 1000);

window.addEventListener('onWidgetLoad', function (obj) {
    console.log(obj);
    if (!obj.detail.fieldData) {
        console.error("Brak fieldData");
        return;
    }
    fieldData = obj.detail.fieldData;
    console.log("fieldData: ", fieldData);
    updateWeather(); // Zaktualizuj pogodę, gdy fieldData będzie dostępne
    updateClock();
});
