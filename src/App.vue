<script setup>

import { shuffle, timeToString, transpose } from './utils';
import { computed, onMounted, ref } from "vue";
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'
import Sheet from "./components/Sheet.vue";
import { useVueToPrint } from "vue-to-print";
import rangeParser from "parse-numeric-range";

grist.ready();

console.log('script setup');

const groups = ref([]);
const rooms = ref([]);

const selectedStudents = ref([]);
const shuffledStudents = ref([]);
let filteredStudents = [];
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

const selectedGroupId = ref("");
const selectedRoomId = ref("");
const studentsRangeInput = ref("");

const onRoomChange = () => selectedRoom.value = rooms.value.find((room) => room.id === parseInt(selectedRoomId.value));

const onGroupChange = () => {
  const selectedGroup = parseInt(selectedGroupId.value);
  console.log('Selected group', selectedGroup);
  // Get the Students from the selected group
  grist.docApi.fetchTable('Students').then((students) => {
    // console.log(students);
    students = transpose(students);
    selectedStudents.value = students.filter((student) => student.groups.includes(selectedGroup));
    // sort by last name
    selectedStudents.value.sort((a, b) => a.lastname.localeCompare(b.lastname));
    // add a selected property to each student
    selectedStudents.value.forEach((student) => {
      student.selected = true;
      student.seat = '';
      student.fixed = false;
    });
    // console.log(selectedStudents.value);

    shuffleStudents()
  });
};

const seatsRange = computed(() => {
  console.log('Computing seatsRange from input', studentsRangeInput.value);
  // Default range is 1 to number of selected students
  const defaultRange = Array.from({ length: selectedStudents.value.length }, (_, i) => i + 1);
  if (!studentsRangeInput.value) return defaultRange;
  const parsed = rangeParser(studentsRangeInput.value);
  // If the parsed range is smaller than the number of selected students, return the default range
  return parsed.length < selectedStudents.value.length ? defaultRange : parsed;
});

const recomputeSeats = () => {
  // Recompute the seat numbers
  shuffledStudents.value.forEach((student, index) => student.seat = seatsRange.value[index]);
  console.log('New order', shuffledStudents.value.map((student) => student.lastname));
}

const selectAllStudents = (newState) => {
  selectedStudents.value.forEach((student) => student.selected = newState);
  shuffleStudents();
};

const invertSelectedStudents = () => {
  selectedStudents.value.forEach((student) => student.selected = !student.selected);
  shuffleStudents();
};

const shuffleStudents = () => {
  console.log('==> Shuffling students');
  // Update the selected students list
  filteredStudents = selectedStudents.value.filter((student) => {
    if (!student.selected) {
      student.seat = '';
      return false;
    } else {
      return true;
    }
  });
  const fixed = filteredStudents.filter((student) => student.fixed);
  const shuffled = shuffle(filteredStudents.filter((student) => !student.fixed));
  // inject the fixed students back into the shuffled list at their fixed seat
  fixed.forEach((student) => shuffled.splice(student.seat - 1, 0, student));
  shuffledStudents.value = shuffled;
  recomputeSeats();
};

/*
 * Handle the splicing of the selected students when the seat is manually changed
 */
const changeSeat = (id, event) => {
  const newSeat = parseInt(event.target.value);
  if (!newSeat) return;
  console.log('changeSeat triggered for', id);
  const student = shuffledStudents.value.find((student) => student.id2 === id);
  student.fixed = true;
  const index = shuffledStudents.value.indexOf(student);

  // Move the student to the new seat
  shuffledStudents.value.splice(index, 1);
  shuffledStudents.value.splice(newSeat - 1, 0, student);

  recomputeSeats();
};

const updateSelected = (student, event) => {
  student.selected = event.target.checked;

  shuffleStudents();
};

const triggerHandlePrint = () => {
  const {handlePrint} = useVueToPrint({
    content: () => sheet.value,
    documentTitle: `Feuille de placement - ${examName.value} - ${startDate.value.toISOString().split('T')[0]} - ${startTime.value}`,
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
    'Note_Originale': null,
  }]);
  console.log(action);
  grist.docApi.applyUserActions(action);
}

const resetAll = () => {
  studentsRangeInput.value = "";
  selectedStudents.value = [];
  shuffledStudents.value = [];
  filteredStudents = [];
  selectedRoom.value = {};
  selectedGroupId.value = "";
  selectedRoomId.value = "";
  startDate.value = new Date();
  duration.value = { hours: 2, minutes: 0 };
};

</script>

<template>
  <div>
    <button @click="resetAll" style="margin-bottom: 16px;">Reset</button>
    <div>
      <label for="startDate">Start Date:</label>
      <VueDatePicker locale="fr" v-model="startDate" time-picker-inline minutes-grid-increment="15"/>
    </div>
    <div>
      <label for="startDate">Duration:</label>
      <VueDatePicker locale="fr" v-model="duration" time-picker/>
    </div>
    <div>
      <label for="room">Room:</label>
      <select v-model="selectedRoomId" @change="onRoomChange" name="room">
        <option disabled value="">Select a room</option>
        <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.fullname }}</option>
      </select>
      <br>
      <!-- Select element from the groups, call onGroupChange when the selection changes -->
      <label for="group">Group:</label>
      <select v-model="selectedGroupId" @change="onGroupChange" name="group">
        <option disabled value="">Select a group</option>
        <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.code }}</option>
      </select>
      <br>
      <label for="exam">Exam:</label>
      {{ selectedExam.fullname }}
      <br>
    </div>

    <hr style="margin: 20px;">

    <div>
      Seat range: <input type="text" v-model="studentsRangeInput" style="width: 200px;" @change="recomputeSeats" />
      <br>
      <em>(You can use a range like "1-10,12,14-16", default is "1-&lt;number of students&gt;")</em>
    </div>
    <div>
      <a @click="selectAllStudents(true)">Select All</a> /
      <a @click="selectAllStudents(false)">Deselect All</a> /
      <a @click="invertSelectedStudents()">Invert Selection</a>
    </div>

    <table>
      <thead>
      <tr>
        <th>Selected</th>
        <th>ID</th>
        <th>Last Name</th>
        <th>First Name</th>
        <th>Seat</th>
        <th>Fixed</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="student in selectedStudents" :key="student.id">
        <td class="center-cell"><input type="checkbox" :checked="student.selected" @click="updateSelected(student, $event)"/></td>
        <td>{{ student.id2 }}</td>
        <td style="text-align:left;">{{ student.lastname }}</td>
        <td style="text-align:left;">{{ student.firstname }}</td>
        <td><input type="number" style="width: 35px" @input="changeSeat(student.id2, $event)" :value="student.seat" /></td>
        <td class="center-cell"><input type="checkbox" v-model="student.fixed"/></td>
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
