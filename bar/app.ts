import { App } from "astal/gtk3"
import style from "./style.scss"
import Bar from "./widget/Bar"

App.start({
    instanceName: "novel-ags-bar",
    css: style,
    main() {
        App.get_monitors().map(Bar)
    },
})
