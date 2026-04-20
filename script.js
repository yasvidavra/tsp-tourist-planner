// ==========================================
// 1. MAP INITIALIZATION (Leaflet.js)
// ==========================================
// Center map on India by default, zoom level 4
let map = L.map('map').setView([20.5937, 78.9629], 4); 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let routeLayer = L.layerGroup().addTo(map);

// ==========================================
// 2. UI & BUTTON LISTENERS
// ==========================================

// "+ Add City" Button Logic
document.getElementById('add-loc-btn').addEventListener('click', () => {
    const container = document.getElementById('location-inputs');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'loc-input';
    input.placeholder = 'Enter City Name';
    container.appendChild(input);
});

// "Calculate Route" Button Logic
document.getElementById('solve-btn').addEventListener('click', async () => {
    // Grab all city inputs that aren't empty
    const inputs = Array.from(document.querySelectorAll('.loc-input'))
        .map(input => input.value.trim())
        .filter(val => val !== '');

    // Check for duplicate cities (ignoring uppercase/lowercase differences)
    const uniqueCities = new Set(inputs.map(city => city.toLowerCase()));
    if (uniqueCities.size !== inputs.length) {
        alert("Duplicate cities found! Please ensure all destinations are unique.");
        return; // Stop the calculation
    }

    if (inputs.length < 3) {
        alert("Please enter at least 3 valid cities to calculate a route!");
        return;
    }

    // Show loading text, hide old results
    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');

    try {
        const locations = [];
        
        // Step 1: Geocode cities to get Latitude/Longitude via OpenStreetMap API
        for (const city of inputs) {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
            const data = await res.json();
            
            if (data.length === 0) throw new Error(`Could not find coordinates for: ${city}`);
            
            locations.push({ 
                name: data[0].name || city, 
                lat: parseFloat(data[0].lat), 
                lon: parseFloat(data[0].lon) 
            });
        }

        const n = locations.length;
        const matrix = Array(n).fill(null).map(() => Array(n).fill(Infinity));

        // Step 2: Calculate actual real-world distances (Haversine formula)
        for(let i = 0; i < n; i++) {
            for(let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = Infinity;
                } else {
                    const R = 6371; // Earth's radius in km
                    const dLat = (locations[j].lat - locations[i].lat) * Math.PI / 180;
                    const dLon = (locations[j].lon - locations[i].lon) * Math.PI / 180;
                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                              Math.cos(locations[i].lat * Math.PI / 180) * Math.cos(locations[j].lat * Math.PI / 180) *
                              Math.sin(dLon/2) * Math.sin(dLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    matrix[i][j] = R * c; // Distance in km
                }
            }
        }

        // Step 3: Run your Branch & Bound algorithm
        const result = solveTSP(matrix);

        // Step 4: Update the webpage UI with results
        document.getElementById('total-dist').innerText = result.cost;
        document.getElementById('route-path').innerText = result.path.map(idx => locations[idx].name).join(' ➔ ');

        // Step 5: Draw the route on the Leaflet Map
        routeLayer.clearLayers();
        const latlngs = result.path.map(idx => [locations[idx].lat, locations[idx].lon]);
        
        // Add markers (ignoring the very last point since it's the start point repeating)
        latlngs.forEach((coord, i) => {
            if(i < latlngs.length - 1) { 
               L.marker(coord).bindPopup(`<b>Stop ${i+1}:</b> ${locations[result.path[i]].name}`).addTo(routeLayer);
            }
        });

        // Draw the line and zoom map to fit it
        const polyline = L.polyline(latlngs, {color: '#2563eb', weight: 4}).addTo(routeLayer);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

        // Step 6: Generate the Distance Matrix Table
        let tableHTML = '<table><tr><th>City</th>' + locations.map(l => `<th>${l.name.split(',')[0]}</th>`).join('') + '</tr>';
        for(let i = 0; i < n; i++) {
            tableHTML += `<tr><th>${locations[i].name.split(',')[0]}</th>`;
            for(let j = 0; j < n; j++) {
                tableHTML += `<td>${matrix[i][j] === Infinity ? '-' : matrix[i][j].toFixed(0)}</td>`;
            }
            tableHTML += '</tr>';
        }
        tableHTML += '</table>';
        document.getElementById('matrix-container').innerHTML = tableHTML;

        // Reveal the results section
        document.getElementById('results-section').classList.remove('hidden');
        
        // Tell Leaflet to recalculate its size now that the div is no longer hidden
        setTimeout(() => { map.invalidateSize(); }, 100);

    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        // Hide loader when done
        document.getElementById('loader').classList.add('hidden');
    }
});


// ==========================================
// 3. YOUR TSP ENGINE (Branch & Bound)
// ==========================================
function solveTSP(matrix) {
    const n = matrix.length;
    let minCost = Infinity;
    let bestPath = [];

    function firstMin(i) {
        let min = Infinity;
        for (let k = 0; k < n; k++) {
            if (i !== k && matrix[i][k] < min) {
                min = matrix[i][k];
            }
        }
        return min;
    }

    function secondMin(i) {
        let first = Infinity, second = Infinity;
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            if (matrix[i][j] <= first) {
                second = first;
                first = matrix[i][j];
            } else if (matrix[i][j] < second) {
                second = matrix[i][j];
            }
        }
        return second;
    }

    function tspRec(currBound, currWeight, level, currPath, visited) {
        if (level === n) {
            if (matrix[currPath[level - 1]][currPath[0]] !== Infinity) {
                const currRes = currWeight + matrix[currPath[level - 1]][currPath[0]];
                if (currRes < minCost) {
                    currPath[n] = currPath[0]; 
                    bestPath = [...currPath]; 
                    minCost = currRes;
                }
            }
            return;
        }

        for (let i = 0; i < n; i++) {
            if (matrix[currPath[level - 1]][i] !== Infinity && !visited[i]) {
                let temp = currBound;
                currWeight += matrix[currPath[level - 1]][i];

                if (level === 1) {
                    currBound -= ((firstMin(currPath[level - 1]) + firstMin(i)) / 2);
                } else {
                    currBound -= ((secondMin(currPath[level - 1]) + firstMin(i)) / 2);
                }

                if (currBound + currWeight < minCost) {
                    currPath[level] = i;
                    visited[i] = true;
                    tspRec(currBound, currWeight, level + 1, currPath, visited);
                    visited[i] = false; 
                }

                currWeight -= matrix[currPath[level - 1]][i];
                currBound = temp;
            }
        }
    }

    let currBound = 0;
    let currPath = new Array(n + 1);
    let visited = new Array(n).fill(false);

    for (let i = 0; i < n; i++) {
        currBound += (firstMin(i) + secondMin(i));
    }
    currBound = Math.ceil(currBound / 2);
    visited[0] = true;
    currPath[0] = 0;

    tspRec(currBound, 0, 1, currPath, visited);

    return {
        cost: minCost === Infinity ? "0.00" : minCost.toFixed(2), 
        path: bestPath
    };
}
