import { App } from "astal/gtk3"
import style from "./style.scss"
import BarTest from "./widget/BarTest"

App.start({
    css: style,
    main() {
        App.get_monitors().map(BarTest)
    },
})
