import { App, Astal, Gdk, Gtk } from "astal/gtk3"
import { bind } from "astal"
import { timeout } from "astal/time"
import Variable from "astal/variable"
import Wp from "gi://AstalWp"

function OnScreenProgress({ visible }: { visible: Variable<boolean> }) {
    const speaker = Wp.get_default()!.get_default_speaker()
    const iconName = Variable("󰕾 ")
    const muteBinding = bind(speaker, "mute")
    const containerBoxWidth = 200
    const iconMinWidth = 20

    function updateIcon() {
      if(speaker.mute)
        iconName.set("󰖁 ")
      else
        iconName.set("󰕾 ")
    }
    let count = 0
    function show() {
        visible.set(true)
        count++
        timeout(2000, () => {
            count--
            if (count === 0) visible.set(false)
        })
    }

    function osdBarSetup(self: Widget.Box) {
      if(speaker) {
        self.hook(muteBinding, () => {
          self.toggleClassName("mute", speaker.mute)
        });
        self.toggleClassName("mute", speaker.mute)
      }
    }

    return (
        <revealer
            setup={(self) => {
                if (speaker) {
                    self.hook(speaker, "notify::volume", () => {
                      updateIcon()
                      show()
                    })
                    self.hook(muteBinding, () => {
                      updateIcon()
                      show()
                    })
                }
            }}
            revealChild={visible()}
            transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
        >
            <box className="OSD" css={`min-width: ${containerBoxWidth}px`}>
                <box className="OSDBar" 
                  setup={osdBarSetup}
                  css={bind(speaker, "volume").as(vol => {
                    const len = Math.floor(vol * (containerBoxWidth - 25 - iconMinWidth) / 1.5)
                    print(len)
                    return `padding-right: ${len}px;`
                  })}>
                  <label className="OSDIcon" css={`min-width: ${iconMinWidth}px`}>
                    {bind(iconName, "value")}
                  </label>
                </box>
            </box>
        </revealer>
    )
}

export default function OSD(monitor: Gdk.Monitor) {
    const visible = Variable(false)

    return (
        <window
            gdkmonitor={monitor}
            className="OSD"
            namespace="osd"
            application={App}
            layer={Astal.Layer.OVERLAY}
            keymode={Astal.Keymode.ON_DEMAND}
            anchor={Astal.WindowAnchor.BOTTOM}
        >
            <eventbox onClick={() => visible.set(false)}>
                <OnScreenProgress visible={visible} />
            </eventbox>
        </window>
    )
}
