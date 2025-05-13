import { defineComponent } from 'vue'

export default defineComponent({
    setup(props, { slots, expose, emit, attrs }) {
        return () => (
            <div style={{ backgroundColor: 'red', width: '100%', height:'10px'}}>
                   
            </div>
        )
    }
})