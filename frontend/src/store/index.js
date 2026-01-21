import { createStore } from 'vuex'
import game from '../components/game/store/game'

const store = createStore({
    state() {
        return {
            user: null
        }
    },
    getters: {
        'auth/isAuthenticated': (state) => !!state.user
    },
    modules: {
        game
    }
})

export default store
