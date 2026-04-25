let map, polyline, markers = [];
const INF = 999999999;

// 1. Initialize Map
function initMap() {
    // Using a clean 'Positron' light theme
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

// 2. UI Event Listeners
document.getElementById('add-loc-btn').onclick = () => {
    const input = document.createElement('input');
    input.className = 'loc-input';
    input.placeholder = 'Enter City Name';
    document.getElementById('location-inputs').appendChild(input);
};

document.getElementById('solve-btn').onclick = async () => {
    const rawInputs = Array.from(document.querySelectorAll('.loc-input'))
                           .map(i => i.value.trim())
                           .filter(v => v !== "");
    
    // --- VALIDATION: UNIQUE CITIES ---
   
    const uniqueCheck = new Set(rawInputs.map(name => name.toLowerCase()));
    
    if (uniqueCheck.size !== rawInputs.length) {
        alert("Error: Please enter unique city names.");
        return;
    }

    if (rawInputs.length < 3) {
        alert("Please enter at least 3 cities.");
        return;
    }

    document.getElementById('loader').classList.remove('hidden');

    try {
        // Step A: Geocode city names to Lat/Lng
        const locations = [];
        for (let city of rawInputs) {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                locations.push({ 
                    lat: parseFloat(data[0].lat), 
                    lng: parseFloat(data[0].lon), 
                    name: city 
                });
            } else {
                throw new Error(`City "${city}" not found.`);
            }
        }

        // Step B: Build Distance Matrix
        const n = locations.length;
        const matrix = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                // If i === j (e.g., Paris to Paris), distance is 0. Otherwise, calculate Haversine.
                matrix[i][j] = (i === j) ? 0 : haversineDistance(locations[i], locations[j]);
            }
        }

        // Step C: Solve TSP with Branch and Bound logic
        const startTime = performance.now();
        const result = solveTSP(matrix);
        const endTime = performance.now();

        // Step D: Reveal Results & Fix Map Visualization
        document.getElementById('results-section').classList.remove('hidden');
        
        setTimeout(() => {
            map.invalidateSize();
            drawRoute(locations, result.path);
        }, 200);

        renderOutput(rawInputs, matrix, result, (endTime - startTime).toFixed(2));

    } catch (err) {
        alert(err.message);
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
};

// --- ALGORITHMS ---

function haversineDistance(p1, p2) {
    const R = 6371; // Earth's radius in km
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + 
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function solveTSP(matrix) {
    const n = matrix.length;
    let minCost = INF;
    let bestPath = [];

    function search(curr, visited, cost, path) {
        // Base case: all cities visited
        if (path.length === n) {
            const totalCost = cost + matrix[curr][0]; // Return to start
            if (totalCost < minCost) {
                minCost = totalCost;
                bestPath = [...path, 0];
            }
            return;
        }

        for (let i = 0; i < n; i++) {
            // Standard TSP: Only visit cities not yet in the path
            if (!visited[i]) {
                const newCost = cost + matrix[curr][i];
                // Pruning: if current path is already worse than minCost, stop searching this branch
                if (newCost < minCost) {
                    visited[i] = true;
                    path.push(i);
                    search(i, visited, newCost, path);
                    path.pop();
                    visited[i] = false;
                }
            }
        }
    }

    const visited = new Array(n).fill(false);
    visited[0] = true;
    search(0, visited, 0, [0]);
    return { cost: minCost.toFixed(2), path: bestPath };
}

// --- DISPLAY LOGIC ---

function renderOutput(names, matrix, result, time) {
    let table = `<table><tr><th>From/To</th>${names.map(n => `<th>${n.slice(0,3)}</th>`).join('')}</tr>`;
    matrix.forEach((row, i) => {
        table += `<tr><th>${names[i]}</th>${row.map(d => `<td>${Math.round(d)}</td>`).join('')}</tr>`;
    });
    document.getElementById('matrix-container').innerHTML = table + `</table>`;

    document.getElementById('total-dist').innerText = result.cost;
    document.getElementById('route-path').innerText = result.path.map(i => names[i]).join(" ➔ ");
    document.getElementById('complexity-note').innerHTML = `
        <b>Algorithm:</b> Branch and Bound<br>
        <b>Execution Time:</b> ${time} ms<br>
        <b>Heuristic:</b> Haversine Great-Circle Distance
    `;
}

function drawRoute(locations, path) {
    if (polyline) map.removeLayer(polyline);
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const coords = path.map(i => [locations[i].lat, locations[i].lng]);
    
    polyline = L.polyline(coords, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
    }).addTo(map);
    
    locations.forEach((loc, idx) => {
        const m = L.marker([loc.lat, loc.lng]).addTo(map).bindPopup(`${idx+1}. ${loc.name}`);
        markers.push(m);
    });

    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
}

initMap();
