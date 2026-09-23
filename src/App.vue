<script setup>

import {
  dateToGristDateTime,
  durationToMinutes,
  durationToParts,
  gristDateToDate,
  gristRefId,
  shuffle,
  timeToString,
  transpose,
} from './utils';
import { computed, onMounted, ref } from "vue";
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'
import Sheet from "./components/Sheet.vue";
import { useVueToPrint } from "vue-to-print";
import rangeParser from "parse-numeric-range";

grist.ready({ requiredAccess: 'full' });

console.log('script setup');

const groups = ref([]);
const rooms = ref([]);
const missingColumns = ref([]);

const requiredColumns = [
  'fullname',
  'Matiere_Nom',
  'Nom',
  'Groupe',
  'Room',
  'Date',
  'Duree',
];

const columnLabels = {
  fullname: 'fullname',
  Matiere_Nom: 'Matiere_Nom',
  Nom: 'Nom',
  Groupe: 'Groupe',
  Room: 'Room',
  Date: 'Date',
  Duree: 'Duree (minutes)',
};

const selectedStudents = ref([]);
const shuffledStudents = ref([]);
let filteredStudents = [];
const selectedExam = ref(null);
const selectedRoom = ref(null);

const startDate = ref(null);

const duration = ref(null);

const sheet = ref();

const examName = computed(() => {
  if (!selectedExam.value) return '';
  return [selectedExam.value.Matiere_Nom, selectedExam.value.Nom].filter(Boolean).join(' - ');
});
const startTime = computed(() => startDate.value
  ? timeToString(startDate.value.getHours(), startDate.value.getMinutes())
  : '');

onMounted(async () => {
  console.log('mounted');

  try {
    const [fetchedGroups, fetchedRooms] = await Promise.all([
      grist.docApi.fetchTable('Groups'),
      grist.docApi.fetchTable('Rooms'),
    ]);
    groups.value = transpose(fetchedGroups);
    rooms.value = transpose(fetchedRooms);
    if (selectedExam.value) {
      loadExamState(selectedExam.value);
    }
    onRoomChange();
  } catch (error) {
    console.error('Unable to load groups and rooms', error);
  }
});

const loadExamState = (record) => {
  if (!record) {
    missingColumns.value = [];
    selectedExam.value = null;
    return false;
  }

  missingColumns.value = requiredColumns.filter(
    (column) => !Object.prototype.hasOwnProperty.call(record, column)
  );

  selectedExam.value = record;
  if (missingColumns.value.length) {
    selectedRoomId.value = null;
    selectedGroupId.value = null;
    selectedRoom.value = null;
    selectedStudents.value = [];
    shuffledStudents.value = [];
    startDate.value = null;
    duration.value = null;
    return false;
  }

  selectedRoomId.value = resolveReferenceId(record.Room, rooms.value, 'fullname');
  selectedGroupId.value = resolveReferenceId(record.Groupe, groups.value, 'code');
  onRoomChange();
  startDate.value = gristDateToDate(record.Date);
  duration.value = durationToParts(record.Duree);
  return true;
};

const selectedGroupId = ref(null);
const selectedRoomId = ref(null);
const studentsRangeInput = ref("");

const resolveReferenceId = (value, records, displayField) => {
  const id = gristRefId(value);
  if (id) return id;
  if (value === null || value === undefined || value === '') return null;
  return records.find((record) => record[displayField] === value)?.id || null;
};

const onRoomChange = () => {
  selectedRoom.value = rooms.value.find((room) => room.id === selectedRoomId.value) || null;
};

const onGroupChange = () => {
  const selectedGroup = selectedGroupId.value;
  if (!Number.isInteger(selectedGroup)) {
    selectedStudents.value = [];
    shuffledStudents.value = [];
    return;
  }
  console.log('Selected group', selectedGroup);
  // Get the Students from the selected group
  grist.docApi.fetchTable('Students').then((students) => {
    // console.log(students);
    students = transpose(students);
    selectedStudents.value = students.filter((student) =>
      Array.isArray(student.groups) && student.groups.includes(selectedGroup));
    // sort by last name
    selectedStudents.value.sort((a, b) => a.lastname.localeCompare(b.lastname));
    // add a selected property to each student
    selectedStudents.value.forEach((student) => {
      student.selected = true;
      student.seat = '';
      student.fixed = false;
    });
    // console.log(selectedStudents.value);

    shuffleStudents();
  }).catch((error) => console.error('Unable to load students', error));
};

grist.onRecord((record) => {
  if (loadExamState(record)) onGroupChange();
}, { expandRefs: false });

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
    documentTitle: `Feuille de placement - ${examName.value} - ${startDate.value?.toISOString().split('T')[0] || 'sans-date'} - ${startTime.value}`,
  });
  handlePrint();
};

const updateExam = () => {
  if (!selectedExam.value?.id) {
    console.warn('Cannot update because no exam is selected');
    return;
  }

  // Keep missing values missing when writing back to Grist.
  grist.docApi.applyUserActions([
    ['UpdateRecord', 'Exams', selectedExam.value.id, {
      'Groupe': selectedGroupId.value,
      'Room': selectedRoom.value?.id ?? null,
      'Date': dateToGristDateTime(startDate.value),
      'Duree': durationToMinutes(duration.value),
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
  selectedExam.value = null;
  selectedRoom.value = null;
  selectedGroupId.value = null;
  selectedRoomId.value = null;
  startDate.value = null;
  duration.value = null;
  missingColumns.value = [];
};

</script>

<template>
  <div>
    <div v-if="missingColumns.length" class="configuration-error" role="alert">
      <strong>Widget configuration incomplete</strong>
      <div>Make these columns visible in the linked Exams table:</div>
      <ul>
        <li v-for="column in missingColumns" :key="column">{{ columnLabels[column] || column }}</li>
      </ul>
    </div>
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
        <option disabled :value="null">Select a room</option>
        <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.fullname }}</option>
      </select>
      <br>
      <!-- Select element from the groups, call onGroupChange when the selection changes -->
      <label for="group">Group:</label>
      <select v-model="selectedGroupId" @change="onGroupChange" name="group">
        <option disabled :value="null">Select a group</option>
        <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.code }}</option>
      </select>
      <br>
      <label for="exam">Exam:</label>
      {{ selectedExam?.fullname || '' }}
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

.configuration-error {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #c62828;
  border-radius: 4px;
  color: #8e0000;
  background: #ffebee;
}

.configuration-error ul {
  margin: 8px 0 0;
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
