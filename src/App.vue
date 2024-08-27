<script setup>

import { shuffle, timeToString, transpose } from './utils';
import { computed, onMounted, ref, watch } from "vue";
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'
import Sheet from "./components/Sheet.vue";
import { useVueToPrint } from "vue-to-print";

grist.ready();

console.log('script setup');

const groups = ref([]);
const exams = ref([]);
const rooms = ref([]);

const selectedStudents = ref([]);
const shuffledStudents = ref([]);
const selectedExam = ref({});
const selectedRoom = ref({});

const startDate = ref(new Date());

const duration = ref({
  hours: 2,
  minutes: 0,
});

const sheet = ref();

const examName = computed(() => `${selectedExam.value.Matiere_Nom} - ${selectedExam.value.Nom}`);
const startTime = computed(() => timeToString(startDate.value.getHours(), startDate.value.getMinutes()));

onMounted(() => {
  console.log('mounted');

  grist.docApi.fetchTable('Groups').then((fetchedGroups) => groups.value = transpose(fetchedGroups));
  grist.docApi.fetchTable('Rooms').then((fetchedRooms) => rooms.value = transpose(fetchedRooms));
});


grist.onRecord((record) => selectedExam.value = record);

const onRoomChange = (event) => selectedRoom.value = rooms.value.find((room) => room.id === parseInt(event.target.value));

const onGroupChange = (event) => {
  const selectedGroup = event.target.value;
  console.log(selectedGroup);

  // Get the Students from the selected group
  grist.docApi.fetchTable('Students').then((students) => {
    console.log(students);
    students = transpose(students);
    selectedStudents.value = students.filter((student) => selectedGroup in student.groups);
    // add a selected property to each student
    selectedStudents.value.forEach((student) => student.selected = true);
    console.log(selectedStudents.value);
  });
};

const selectAllStudents = (newState) => selectedStudents.value.forEach((student) => student.selected = newState);

const shuffleStudents = () => shuffledStudents.value = shuffle(selectedStudents.value.filter((student) => student.selected));

watch(selectedStudents, (_) => shuffleStudents(), {deep: true});

const triggerHandlePrint = () => {
  const {handlePrint} = useVueToPrint({
    content: () => sheet.value,
    documentTitle: `Feuille de placement - ${examName.value} - ${startDate.value.toLocaleDateString('fr-FR')} - ${startTime.value}`,
  });
  handlePrint();
};

const updateExam = () => {
  // Update the exam record with the room and date
  grist.docApi.applyUserActions([
      ['UpdateRecord', 'Exams', selectedExam.value.id, {
        'Room': selectedRoom.value.id,
        'Date': startDate.value,
        // 'Durée': timeToString(duration.hours, duration.minutes),
      }]
  ]);

  // Add a Note record for each student
  const action = shuffledStudents.value.map((student) => ['AddRecord', 'Grades', null, {
    'Exam': selectedExam.value.id,
    'Eleve': student.id,
    'Note': null,
  }]);
  console.log(action);
  grist.docApi.applyUserActions(action);
}

</script>

<template>
  <div>
    <div>
      <label for="startDate">Start Date:</label>
      <VueDatePicker v-model="startDate" time-picker-inline minutes-grid-increment="15"/>
    </div>
    <div>
      <label for="startDate">Duration:</label>
      <VueDatePicker v-model="duration" time-picker/>
    </div>
    <div>
      <label for="room">Room:</label>
      <select @change="onRoomChange" name="room">
        <option disabled value="" selected>Select a room</option>
        <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.fullname }}</option>
      </select>
      <br>
      <!-- Select element from the groups, call onGroupChange when the selection changes -->
      <label for="group">Group:</label>
      <select @change="onGroupChange" name="group">
        <option disabled value="" selected>Select a group</option>
        <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.code }}</option>
      </select>
      <br>
      <label for="exam">Exam:</label>
      {{ selectedExam.fullname }}
      <br>
    </div>

    <hr style="margin: 20px;">

    <div>
      <a @click="selectAllStudents(true)">Select All</a> /
      <a @click="selectAllStudents(false)">Deselect All</a>
    </div>

    <table>
      <thead>
      <tr>
        <th>Selected</th>
        <th>ID</th>
        <th>Last Name</th>
        <th>First Name</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="student in selectedStudents" :key="student.id">
        <td class="center-cell"><input type="checkbox" v-model="student.selected"/></td>
        <td>{{ student.id2 }}</td>
        <td style="text-align:left;">{{ student.lastname }}</td>
        <td style="text-align:left;">{{ student.firstname }}</td>
      </tr>
      </tbody>
    </table>

    <div style="margin: 10px;">
      <button @click.prevent="shuffleStudents">Shuffle</button>
    </div>

    <div ref="sheet">
      <Sheet :students="shuffledStudents" :examName="examName" :room="selectedRoom" :startDate="startDate"
             :startTime="startTime" :duration="duration"/>
    </div>

    <div style="margin: 10px;">
      <button @click="updateExam">Update !</button>
      <span style="margin: 5px;"></span>
      <button @click="triggerHandlePrint">Print !</button>
    </div>
  </div>
</template>

<style scoped>
@media only print {
  body {
    visibility: hidden;
  }

  #sheet {
    visibility: visible;
  }
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
}

th {
  background-color: #f2f2f2;
  text-align: center;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

input, a {
  cursor: pointer;
}

</style>
