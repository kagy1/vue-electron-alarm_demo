
import { defineComponent } from "vue"
import { Location, Setting } from "@element-plus/icons-vue";
import style from "./styel.module.scss"
import { useRoute, useRouter } from "vue-router";
import { ElIcon, ElMenu, ElMenuItem, ElSubMenu } from "element-plus";

export default defineComponent({

    setup(props, { emit, expose, slots }) {
        const router = useRouter();
        function toPage(route: any) {
            router.push({
                name: route.name
            })
        }
        return () => (
            <ElMenu active-text-color="white" background-color="white" text-color="blue" router >
                {router.options.routes.map((route, index) => {
                    //通过在 .map() 的回调函数中使用 return 语句，你可以将每个 route 对象转换为对应的 JSX 元素
                    //并将转换后的元素作为新数组的元素返回。这样，.map() 方法最终会返回一个由 JSX 元素组成的数组。
                    return (
                        <ElMenuItem index={route.path} v-slots={{
                            title: () => (
                                <div>
                                    <ElIcon><Setting /></ElIcon>
                                    <span>{route.meta?.title as string}</span>
                                </div>)
                        }}
                            onClick={() => { toPage(route) }}>
                        </ElMenuItem >
                    );
                })}
            </ElMenu >
        )
    }
})