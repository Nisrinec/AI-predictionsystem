<template>
  <!-- SIDEBAR -->
  <aside class="sidebar" id="show-side-navigation1">
    <div class="sidebar-header">
      <h5>AI Monitoring</h5>
      <p>Industrial System</p>
    </div>
  </aside>

  <!-- MAIN -->
  <section id="wrapper" :class="{ fullwidth: isSidebarHidden }">

    <!-- NAVBAR -->
    <nav class="navbar">
      <h3>SCADA Dashboard</h3>
      <button @click="toggleSidebar">☰</button>
    </nav>

    <div class="p-4">

      <!-- MACHINE STATUS -->
      <section class="statistics">
        <div class="row">

          <div class="machine-card" :class="getStatusClass(data.motor_risk)">
            <h4>Motor</h4>
            <p>Status: {{ data.motor_status }}</p>
            <p>Risk: {{ data.motor_risk }}</p>
            <p>Prediction: {{ data.motor_future_risk }}</p>
          </div>

          <div class="machine-card" :class="getStatusClass(data.pump_risk)">
            <h4>Pump</h4>
            <p>Status: {{ data.pump_status }}</p>
            <p>Risk: {{ data.pump_risk }}</p>
            <p>Prediction: {{ data.pump_future_risk }}</p>
          </div>

          <div class="machine-card" :class="getStatusClass(data.coupling_risk)">
            <h4>Coupling</h4>
            <p>Status: {{ data.coupling_status }}</p>
            <p>Risk: {{ data.coupling_risk }}</p>
            <p>Prediction: {{ data.coupling_future_risk }}</p>
          </div>

        </div>
      </section>

      <!-- CHARTS -->
      <section class="charts">
        <canvas id="vibrationChart"></canvas>
        <canvas id="temperatureChart"></canvas>
      </section>

    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Chart from 'chart.js/auto'

const isSidebarHidden = ref(false)

const data = ref({
  motor_status: "Loading...",
  motor_risk: "",
  motor_future_risk: "",
  pump_status: "Loading...",
  pump_risk: "",
  pump_future_risk: "",
  coupling_status: "Loading...",
  coupling_risk: "",
  coupling_future_risk: ""
})

const toggleSidebar = () => {
  isSidebarHidden.value = !isSidebarHidden.value
}

const getStatusClass = (risk) => {
  if (!risk) return ''
  if (risk.includes('Low')) return 'status-low'
  if (risk.includes('Medium')) return 'status-medium'
  if (risk.includes('High')) return 'status-high'
  return ''
}

let vibrationChart
let temperatureChart

let vibrationData = []
let tempData = []
let labels = []

const fetchData = async () => {
  const res = await fetch('http://127.0.0.1:8000/predictions')
  const json = await res.json()
  data.value = json

  const time = new Date().toLocaleTimeString()

  vibrationData.push(Math.random() * 10)
  tempData.push(Math.random() * 100)
  labels.push(time)

  if (vibrationData.length > 10) {
    vibrationData.shift()
    tempData.shift()
    labels.shift()
  }

  updateCharts()
}

const createCharts = () => {
  vibrationChart = new Chart(document.getElementById('vibrationChart'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{ label: 'Vibration', data: vibrationData }]
    }
  })

  temperatureChart = new Chart(document.getElementById('temperatureChart'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{ label: 'Temperature', data: tempData }]
    }
  })
}

const updateCharts = () => {
  vibrationChart.data.labels = labels
  vibrationChart.data.datasets[0].data = vibrationData
  vibrationChart.update()

  temperatureChart.data.labels = labels
  temperatureChart.data.datasets[0].data = tempData
  temperatureChart.update()
}

onMounted(() => {
  createCharts()
  fetchData()
  setInterval(fetchData, 5000)
})
</script>

<style scoped>
@import './dashboard.css';
</style>