import { createApp } from 'vue'
import vueHtmlToPaper from './vue-html-to-paper';
import './style.css'
import App from './App.vue'

createApp(App)
    // .use(vueHtmlToPaper)
    .mount('#app');
