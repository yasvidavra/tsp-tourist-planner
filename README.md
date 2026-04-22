# 🌍 Travelling Salesman Problem (TSP) Visualizer

## 📌 Overview

This project is a web-based implementation of the Travelling Salesman Problem (TSP) that allows users to input city names and compute the shortest possible route visiting all cities exactly once.

It uses real-world geographical data and displays the route on an interactive map.


## 🚀 Features

- 🌐 Enter multiple city names dynamically
- 📍 Automatic city validation using OpenStreetMap API
- 🗺️ Interactive map visualization
- 📏 Distance calculation using Haversine formula
- 🔁 Optimal route calculation using backtracking (TSP)
- 📊 Distance matrix display
- ⚡ Real-time route rendering


## 🛠️ Technologies Used

- HTML
- CSS
- JavaScript
- Leaflet.js (for maps)
- OpenStreetMap API (Nominatim)


## 📂 Project Structure

TSP/
│── index.html
│── style.css
│── script.js


## 🧠 How It Works

1. City Validation

- Uses OpenStreetMap API to verify valid cities

2. Distance Calculation

- Uses Haversine Formula to calculate distance between coordinates

3. TSP Algorithm

- Uses Backtracking (Brute Force) approach
- Finds minimum cost path


## 📊 Example Output

- Optimal Route: Ahmedabad ➔ Mumbai ➔ Delhi ➔ Ahmedabad
- Total Distance: 1500+ km (approx.)


## ⚠️ Limitations

- Works best with small number of cities (due to brute-force approach)
- Requires internet connection for API calls


## 👨‍💻 Author

- Yasvi Davra , Kushal Bhavsar , Prince Kalal
