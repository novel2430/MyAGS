import { App } from "astal/gtk3"
import style from "./style.scss"
import Bar from "./bar/widget/Bar"
import OSD from "./osd/osd/OSD"
import NotificationPopups from "./notify/notifications/NotificationPopups"

App.start({
    instanceName: "novel-ags",
    css: style,
    main() {
        // App.get_monitors().map(Bar)
        App.get_monitors().map(OSD)
        App.get_monitors().map(NotificationPopups)
    },
})
