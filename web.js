/**
 * KOI Smart System - Dashboard Logic (Updated for String pH)
 */

// --- 1. Konfigurasi MQTT ---
const broker = 'ws://broker.emqx.io:8083/mqtt'; 
const options = {
    clientId: 'web_koi_final_' + Math.random().toString(16).substring(2, 8),
};

const client = mqtt.connect(broker, options);

client.on('connect', () => {
    console.log("✅ Terhubung ke MQTT Broker");
    client.subscribe("aquarium/suhu"); 
    client.subscribe("monitoring/ph");
    client.subscribe("monitoring/turbidity");
});

// --- 2. Menangani Data Masuk ---
client.on('message', (topic, message) => {
    const payload = message.toString();
    
    // Update Suhu & Grafik (Tetap Angka)
    if (topic === "aquarium/suhu") {
        const val = parseFloat(payload);
        const el = document.getElementById('val-temp');
        if (el) el.innerText = val.toFixed(1) + "°C";
        
        const status = document.getElementById('status-temp');
        if (status) {
            status.innerText = "Online";
            status.style.color = "#4caf50";
        }
        updateChartData('temp', val);
    }

    // Update pH (Sekarang Teks: AMAN/BAHAYA)
    if (topic === "monitoring/ph") {
        const el = document.getElementById('val-ph'); // Elemen angka pH di web
        const statusPh = document.getElementById('status-ph'); // Elemen status bawah
        
        if (el) {
            el.innerText = payload; // Akan muncul "AMAN" atau "BAHAYA"
            // Ubah warna teks berdasarkan status
            el.style.color = (payload === "BAHAYA") ? "#f44336" : "#4caf50";
        }
        
        if (statusPh) {
            statusPh.innerText = (payload === "BAHAYA") ? "Perlu Cek Air" : "Kondisi Baik";
            statusPh.style.color = (payload === "BAHAYA") ? "#f44336" : "#4caf50";
        }

        // CATATAN: Grafik pH dinonaktifkan atau diisi angka dummy 
        // karena data String "AMAN" tidak bisa digambar di grafik line chart.
        // Jika ingin tetap ada grafik, kamu harus kirim angka dari ESP32 lagi.
    }

    // Update Kualitas Air (Turbidity)
    if (topic === "monitoring/turbidity") {
        const el = document.getElementById('val-quality');
        if (el) el.innerText = payload;
        
        const statusQual = document.getElementById('status-quality');
        if (statusQual) {
            statusQual.innerText = (payload === "Keruh") ? "Bahaya" : "Aman";
            statusQual.style.color = (payload === "Keruh") ? "#f44336" : "#4caf50";
        }
    }
});

// --- 3. Kontrol Manual (Feeding) ---
const feedingToggle = document.getElementById("feedingToggle");
if (feedingToggle) {
    feedingToggle.addEventListener("change", () => {
        const val = feedingToggle.checked ? "90" : "0";
        client.publish("aquarium/servo", val); 
        
        const statusText = document.getElementById("feedingStatus");
        if (statusText) statusText.innerText = feedingToggle.checked ? "ON" : "OFF";
    });
}

// --- 4. Konfigurasi Grafik (Hanya untuk Suhu) ---
const canvas = document.getElementById('koiChart');
let koiChart;

if (canvas) {
    const ctx = canvas.getContext('2d');
    koiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Suhu (°C)',
                    data: [],
                    borderColor: '#42a5f5',
                    backgroundColor: 'rgba(66,165,245,0.1)',
                    tension: 0.4
                }
                // Dataset pH dihapus karena data yang dikirim sekarang berupa Kata (String)
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { type: 'linear', display: true, title: { display: true, text: 'Derajat Celcius' } }
            }
        }
    });
}

function updateChartData(type, value) {
    if (!koiChart || type !== 'temp') return; // Hanya update jika tipe adalah suhu

    const now = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const labels = koiChart.data.labels;

    if (labels[labels.length - 1] !== now) {
        labels.push(now);
        koiChart.data.datasets[0].data.push(value);
    } else {
        koiChart.data.datasets[0].data[labels.length - 1] = value;
    }

    if (labels.length > 15) {
        labels.shift();
        koiChart.data.datasets[0].data.shift();
    }
    
    koiChart.update('none'); 
}
