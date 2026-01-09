import { createStore } from 'vuex'

const store = createStore({
    state() {
        return {
            user: null
        }
    },
    getters: {
        'auth/isAuthenticated': (state) => !!state.user
    }
})

export default store
