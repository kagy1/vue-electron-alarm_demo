import { defineComponent } from 'vue'
import Layout from './components/Layout.vue'


export default defineComponent({
    setup(props, { slots, expose, emit, attrs }) {
        return () => (
            <Layout></Layout>
        )
    }
})