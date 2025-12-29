const map = L.map("map").setView([21.1702, 72.8311], 12); // Default to Surat/Gujarat area

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
}).addTo(map);

// Initialize Marker Cluster Group
const markers = L.markerClusterGroup();
map.addLayer(markers);

async function loadDoctors(query = "") {
    document.getElementById("loading").style.display = "block";
    try {
        // Basic geolocation support for sorting if available
        let params = `q=${encodeURIComponent(query)}`;

        // Attempt to get location - NOT blocking load
        // In a real app we might cache this or ask permission gracefully.
        // For now we just load basic search.

        const res = await fetch(`/api/search?${params}`);
        const doctors = await res.json();

        markers.clearLayers(); // Clear cluster group
        const cards = document.getElementById("cards");
        cards.innerHTML = "";

        if (doctors.length === 0) {
            cards.innerHTML = "<p style='padding:10px;'>No doctors found.</p>";
            return;
        }

        const bounds = L.latLngBounds();

        doctors.forEach(d => {
            // Create Card
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
        <h3>${d.name}</h3>
        <p>${d.specialty} • ${d.experience_years || 0} yrs</p>
        <p>${d.city}, ${d.area}</p>
        <a href="tel:${d.phone}" style="display:inline-block; margin-top:5px; padding:5px 10px; background:#eee; text-decoration:none; border-radius:4px;">Call</a>
      `;

            // Map Interaction on Card Click
            card.onclick = () => {
                if (d.latitude && d.longitude) {
                    map.setView([d.latitude, d.longitude], 15);
                }
            };
            cards.appendChild(card);

            // Create Marker if coordinates exist and add to Cluster
            if (d.latitude && d.longitude) {
                const marker = L.marker([d.latitude, d.longitude]);
                marker.bindPopup(`<b>${d.name}</b><br>${d.specialty}<br>${d.area}`);
                markers.addLayer(marker);
                bounds.extend([d.latitude, d.longitude]);
            }
        });

        // Fit bounds if we have markers
        if (markers.getLayers().length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

    } catch (e) {
        console.error("Error loading doctors:", e);
        document.getElementById("cards").innerHTML = "<p>Error loading data.</p>";
    } finally {
        document.getElementById("loading").style.display = "none";
    }
}

let timeout = null;
document.getElementById("search").addEventListener("input", e => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        loadDoctors(e.target.value);
    }, 300);
});

// Initial load
loadDoctors();
