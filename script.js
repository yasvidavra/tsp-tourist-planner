let map, polyline, markers = [];
const INF = 999999999;

// 1. Initialize Map with a delay-safe check
function initMap() {
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

// 2. Add Dynamic Inputs
document.getElementById('add-loc-btn').onclick = () => {
    const input = document.createElement('input');
    input.className = 'loc-input';
    input.placeholder = 'Enter City Name (e.g., Ahmedabad)';
    document.getElementById('location-inputs').appendChild(input);
};

// 3. Main Solve Logic

document.getElementById('solve-btn').onclick = async () => {
    const cityInputs = Array.from(document.querySelectorAll('.loc-input'))
                            .map(i => i.value.trim())
                            .filter(v => v !== "");
    
    if (cityInputs.length < 3) {
        alert("Please enter at least 3 valid cities.");
        return;
    }

    const loader = document.getElementById('loader');
    loader.classList.remove('hidden');
    loader.innerText = "🔍 Verifying city names...";

    try {
        const locations = [];
        
        for (let city of cityInputs) {
            // We search with 'addressdetails=1' to see the exact type of place
            const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(city)}`;
            const res = await fetch(url);
            const data = await res.json();

            // --- STRICT VALIDATION LOGIC ---
            // We look for results that are specifically geographical areas
            const cityResult = data.find(item => {
                const type = item.addresstype || item.type;
                return ['city', 'town', 'village', 'municipality', 'county', 'state_district'].includes(type);
            });

            if (!cityResult) {
                throw new Error(`"${city}" is not a recognized city or town. Please enter a valid geographical name.`);
            }

            locations.push({ 
                lat: parseFloat(cityResult.lat), 
                lng: parseFloat(cityResult.lon), 
                name: cityResult.display_name.split(',')[0] 
            });
        }

        // Calculation logic follows...
        loader.innerText = "🔄 Computing optimal route...";
        const n = locations.length;
        const matrix = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                matrix[i][j] = (i === j) ? INF : haversineDistance(locations[i], locations[j]);
            }
        }

        const result = solveTSP(matrix);

        document.getElementById('results-section').classList.remove('hidden');
        setTimeout(() => {
            map.invalidateSize();
            drawRoute(locations, result.path);
        }, 300);

        renderOutput(locations.map(l => l.name), matrix, result);

    } catch (err) {
        alert("⚠️ Validation Error: " + err.message);
    } finally {
        loader.classList.add('hidden');
    }
};
















































// --- ALGORITHMS ---

function haversineDistance(p1, p2) {
    const R = 6371; 
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + 
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function solveTSP(matrix) {
    const n = matrix.length;
    let minCost = INF, bestPath = [];

    function search(curr, visited, cost, path) {
        if (path.length === n) {
            const total = cost + matrix[curr][0];
            if (total < minCost) { minCost = total; bestPath = [...path, 0]; }
            return;
        }
        for (let i = 0; i < n; i++) {
            if (!visited[i] && (cost + matrix[curr][i] < minCost)) {
                visited[i] = true;
                path.push(i);
                search(i, visited, cost + matrix[curr][i], path);
                path.pop();
                visited[i] = false;
            }
        }
    }

    const visited = new Array(n).fill(false);
    visited[0] = true;
    search(0, visited, 0, [0]);
    return { cost: minCost.toFixed(2), path: bestPath };
}

// --- RENDERING ---

function renderOutput(names, matrix, result, time) {
    let table = `<table><tr><th>From/To</th>${names.map(n => `<th>${n.slice(0,3)}</th>`).join('')}</tr>`;
    matrix.forEach((row, i) => {
        table += `<tr><th>${names[i]}</th>${row.map(d => `<td>${d === INF ? '∞' : Math.round(d)}</td>`).join('')}</tr>`;
    });
    document.getElementById('matrix-container').innerHTML = table + `</table>`;
    document.getElementById('total-dist').innerText = result.cost;
    document.getElementById('route-path').innerText = result.path.map(i => names[i]).join(" ➔ ");
}

function drawRoute(locations, path) {
    if (polyline) map.removeLayer(polyline);
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const coords = path.map(i => [locations[i].lat, locations[i].lng]);
    polyline = L.polyline(coords, {color: '#2563eb', weight: 5, opacity: 0.8}).addTo(map);
    
    locations.forEach(loc => {
        const m = L.marker([loc.lat, loc.lng]).addTo(map).bindPopup(loc.name);
        markers.push(m);
    });
    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
}

initMap();