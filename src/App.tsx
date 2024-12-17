import { defineComponent } from 'vue'

export default defineComponent({
    setup(props, { slots, expose, emit, attrs }) {
        return () => (
            <div>
                hello world
            </div>
        )
    }
})