import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import './style.css'
import './noir.css'
import 'primeicons/primeicons.css'
import i18n from './i18n'
import App from './App.vue'

import router from './router'
import store from './store'

const app = createApp(App)

const NoirPreset = definePreset(Aura, {
    components: {
        select: {
            padding: {
                y: '4px'
            }
        }
    }
});

app.use(PrimeVue, {
    theme: {
        preset: NoirPreset
    }
})

app.use(i18n)
app.use(router)
app.use(store)

app.mount('#app')
