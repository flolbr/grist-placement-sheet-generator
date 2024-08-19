<script setup>

import { defineProps } from "vue";
import { timeToString } from "../utils.js";

const {duration} = defineProps({
  students: Array,
  examName: String,
  room: Object,
  startDate: Date,
  startTime: String,
  duration: Object,
});


</script>

<template>
  <div id="page">
    <div class="container">
      <h2>Feuille de placement</h2>
      <h3>{{ examName }}</h3>

      <div>
        <table class="header-table">
          <tr>
            <td>Date</td>
            <td>{{ startDate.toLocaleDateString('fr-FR') }}</td>
          </tr>
          <tr>
            <td>Heure</td>
            <td>{{ startTime }}</td>
          </tr>
          <tr>
            <td>Durée</td>
            <td>{{ timeToString(duration.hours, duration.minutes) }}</td>
          </tr>
          <tr>
            <td>Salle</td>
            <td>{{ room.fullname }}</td>
          </tr>
        </table>
      </div>
      <br>
      <br>
      <br>
      <div>
        <table class="students-table">
          <thead>
          <tr>
            <th>Place</th>
            <th>ID</th>
            <th>Nom</th>
            <th>Prénom</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(student, place) in students" :key="student.id">
            <td class="center-cell">{{ place + 1 }}</td>
            <td class="center-cell">{{ student.id2 }}</td>
            <td style="text-align:left;">{{ student.lastname }}</td>
            <td style="text-align:left;">{{ student.firstname }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>

#page {
  margin: 0;
  padding: 0.5in;
  font-family: Arial, sans-serif;
  width: 21cm;
  height: 29.7cm;
  border: 1px solid #000;
}

.container {
  margin: 0 auto;
}

.header-table {
  td {
    padding: 0.2em 0.5em;
  }

  text-align: left;
  font-weight: bold;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid black;

  th, td {
    padding: 8px;
  }

  th {
    background-color: dodgerblue;
    color: white;
    text-align: center;
    border: 1px solid black;
  }

  td {
    border-left: 1px solid black;
    border-right: 1px solid black;
  }

  tr:nth-child(even) {
    background-color: #f9f9f9;
  }
}

</style>