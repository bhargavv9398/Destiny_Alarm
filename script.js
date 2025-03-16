let destination = null;
let userMarker, destinationMarker, routeLine, map;
let watchID = null;
let lastPosition = null;
let lastTimestamp = null;
let speed = 0;

let alarm = new Audio("sounds/alarm.mp3");
alarm.volume = 1.0; // Ensure full volume
alarm.preload = "auto"; // Preload the audio for faster playback

document.addEventListener("DOMContentLoaded", function () {
    map = L.map('map').setView([0, 0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);
});

// Search for destination
document.getElementById("searchBtn").addEventListener("click", () => {
    const place = document.getElementById("destinationInput").value;

    if (!place) {
        alert("Please enter a destination.");
        return;
    }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const location = data[0];
                destination = { lat: parseFloat(location.lat), lon: parseFloat(location.lon) };
                document.getElementById("destination").innerText = `Lat: ${destination.lat.toFixed(4)}, Lon: ${destination.lon.toFixed(4)}`;
                document.getElementById("status").innerText = `Destination set: ${place}`;
                document.getElementById("startBtn").disabled = false;

                if (destinationMarker) map.removeLayer(destinationMarker);
                destinationMarker = L.marker([destination.lat, destination.lon]).addTo(map)
                    .bindPopup(`📍 Destination: ${place}`).openPopup();

                fadeOutPopup(destinationMarker);
                map.setView([destination.lat, destination.lon], 10);
            } else {
                alert("Destination not found. Try again.");
            }
        })
        .catch(error => console.error("Error fetching location:", error));
});

// Start tracking user location
document.getElementById("startBtn").addEventListener("click", () => {
    if (!destination) {
        alert("Please set a destination first.");
        return;
    }

    // Allow audio play on user interaction
    alarm.play().then(() => {
        alarm.pause(); // Pause immediately, just to allow permission
        alarm.currentTime = 0;
    }).catch(error => console.warn("Autoplay blocked, alarm will play later."));

    if ("geolocation" in navigator) {
        document.getElementById("status").innerText = "Tracking your location...";

        watchID = navigator.geolocation.watchPosition(updateLocation, 
            (error) => {
                document.getElementById("status").innerText = "Error: Unable to retrieve location.";
            },
            { enableHighAccuracy: true }
        );
    } else {
        document.getElementById("status").innerText = "Geolocation is not supported by your browser.";
    }
});

// Function to update location & calculate speed + ETA
function updateLocation(position) {
    let userLat = position.coords.latitude;
    let userLon = position.coords.longitude;
    let currentTime = position.timestamp;

    document.getElementById("userLocation").innerText = `Lat: ${userLat.toFixed(4)}, Lon: ${userLon.toFixed(4)}`;

    let distance = getDistance(userLat, userLon, destination.lat, destination.lon);
    document.getElementById("distance").innerText = `${distance.toFixed(2)} km`;

    if (lastPosition && lastTimestamp) {
        let displacement = getDistance(userLat, userLon, lastPosition.lat, lastPosition.lon);
        let timeDiff = (currentTime - lastTimestamp) / 1000; 
        if (timeDiff > 0) speed = (displacement / timeDiff) * 3600;
    }

    lastPosition = { lat: userLat, lon: userLon };
    lastTimestamp = currentTime;

    let estimatedTime = speed > 0 ? distance / speed : 0;
    let etaText = speed > 0 ? `${Math.ceil(estimatedTime * 60)} mins` : "Calculating...";

    document.getElementById("speed").innerText = speed.toFixed(2);
    document.getElementById("eta").innerText = etaText;
    document.getElementById("status").innerText = `🚗 Speed: ${speed.toFixed(2)} km/h | ETA: ${etaText}`;

    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([userLat, userLon]).addTo(map).bindPopup("📍 Your Location").openPopup();
    fadeOutPopup(userMarker);

    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline([[userLat, userLon], [destination.lat, destination.lon]], { color: 'blue', weight: 5, opacity: 0.7 }).addTo(map);

    let bounds = L.latLngBounds([[userLat, userLon], [destination.lat, destination.lon]]);
    map.fitBounds(bounds, { padding: [50, 50] });

    if (distance <= 2) {
        document.getElementById("status").innerText = `🎉 You have arrived at ${document.getElementById("destinationInput").value}! 🚀`;
        playAlarm();
        navigator.geolocation.clearWatch(watchID);
    }
}

// Function to play alarm
function playAlarm() {
    alarm.play().catch(error => {
        console.error("Error playing alarm:", error);
        alert("Alarm could not be played due to browser restrictions. Try clicking anywhere on the page.");
    });
}

// Refresh button functionality
document.getElementById("refreshBtn").addEventListener("click", () => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => updateLocation(position),
            (error) => {
                document.getElementById("status").innerText = "Error fetching location.";
            },
            { enableHighAccuracy: true, maximumAge: 0 }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
});

// Function to fade out popups after 2 seconds
function fadeOutPopup(marker) {
    setTimeout(() => {
        marker.closePopup();
    }, 2000);
}

// Function to calculate distance between two coordinates
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


//    BACKGROUND ANIMATION

// Some random colors
const colors = ["#3CC157", "#2AA7FF", "#1B1B1B", "#FCBC0F", "#F85F36"];

const numBalls = 50;
const balls = [];

for (let i = 0; i < numBalls; i++) {
  let ball = document.createElement("div");
  ball.classList.add("ball");
  ball.style.background = colors[Math.floor(Math.random() * colors.length)];
  ball.style.left = `${Math.floor(Math.random() * 100)}vw`;
  ball.style.top = `${Math.floor(Math.random() * 100)}vh`;
  ball.style.transform = `scale(${Math.random()})`;
  ball.style.width = `${Math.random()}em`;
  ball.style.height = ball.style.width;
  
  balls.push(ball);
  document.body.append(ball);
}

// Keyframes
balls.forEach((el, i, ra) => {
  let to = {
    x: Math.random() * (i % 2 === 0 ? -11 : 11),
    y: Math.random() * 12
  };

  let anim = el.animate(
    [
      { transform: "translate(0, 0)" },
      { transform: `translate(${to.x}rem, ${to.y}rem)` }
    ],
    {
      duration: (Math.random() + 1) * 2000, // random duration
      direction: "alternate",
      fill: "both",
      iterations: Infinity,
      easing: "ease-in-out"
    }
  );
});
