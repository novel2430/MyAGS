import { App } from "astal/gtk3"
import { Variable, GLib, bind, exec, execAsync } from "astal"
import { Astal, Gtk, Gdk } from "astal/gtk3"
import River from "gi://AstalRiver"
import Mpris from "gi://AstalMpris"
import Battery from "gi://AstalBattery"
import Wp from "gi://AstalWp"
import Network from "gi://AstalNetwork"
import Tray from "gi://AstalTray"


type Props = {
  monitor: Gdk.Monitor
}

function TrayItem(props: { item: typeof Tray.TrayItem }) {
  const { item } = props
  const interval = 5000
  const visibleFlag = Variable<boolean>(true).poll(interval, () => {
    if(item.id)
      return true
    else
      return false
  })
  return (
    <menubutton
        visible={bind(visibleFlag, "value")}
        tooltipMarkup={bind(item, "tooltipMarkup")}
        usePopover={false}
        actionGroup={bind(item, "actionGroup").as(ag => ["dbusmenu", ag])}
        menuModel={bind(item, "menuModel")}>
        <icon gicon={bind(item, "gicon")} />
    </menubutton>
  )
}

function SysTray() {
    const tray = Tray.get_default()

    return <box className="SysTray">
        {
          bind(tray, "items").as(items => {
            const filterItems = items.filter(item => item.id !== null && item.menuModel !== null);
            return filterItems.map(item => <TrayItem item={item}/>)
          })
        }
    </box>
}

function SystemUsage() {
    const cpu_cmd = `bash -c "cat /proc/stat | grep 'cpu '"`
    const ram_cmd = `bash -c "cat /proc/meminfo | grep 'Mem'"`
    const cpu_temp_dir_1 = "/sys/class/thermal/thermal_zone0/temp"
    const cpu_temp_dir_2 = "/sys/class/hwmon/hwmon1/temp1_input"
    const interval = 2000
    const cpuUsage = Variable<string>("0%").poll(interval, () => {
        try {
            const data = exec(cpu_cmd).toString();
            const values = data.split(" ").filter(v => v).slice(1, 8).map(Number);
            const idle = values[3];
            const total = values.reduce((a, b) => a + b, 0);

            if (!SystemUsage.lastIdle || !SystemUsage.lastTotal) {
                SystemUsage.lastIdle = idle;
                SystemUsage.lastTotal = total;
                return "0%";
            }

            const idleDiff = idle - SystemUsage.lastIdle;
            const totalDiff = total - SystemUsage.lastTotal;
            SystemUsage.lastIdle = idle;
            SystemUsage.lastTotal = total;

            const usage = 100 * (1 - idleDiff / totalDiff);
            return `${usage.toFixed(0)}%`;
        } catch (e) {
            return "N/A";
        }
    });

    const ramUsage = Variable<string>("0%").poll(interval, () => {
        try {
            const data = exec(ram_cmd).toString();
            const lines = data.split("\n").map(line => line.split(/\s+/));

            const memTotal = Number(lines.find(l => l[0] === "MemTotal:")?.[1] || 1);
            const memAvailable = Number(lines.find(l => l[0] === "MemAvailable:")?.[1] || 0);

            const usedPercent = 100 * (1 - memAvailable / memTotal);
            return `${usedPercent.toFixed(0)}%`;
        } catch (e) {
            return "N/A";
        }
    });

    const tempUsage = Variable<string>("0%").poll(interval, () => {
        try {
            if(!SystemUsage.cpuTempCmd) {
              SystemUsage.cpuTempCmd = `bash -c "cat ${cpu_temp_dir_1}"`
              if(GLib.file_test(cpu_temp_dir_1, GLib.FileTest.EXISTS) == false) {
                SystemUsage.cpuTempCmd = `bash -c "cat ${cpu_temp_dir_2}"`
              }
            }
            const data = exec(SystemUsage.cpuTempCmd).toString();
            const tempCelsius = (parseInt(data) / 1000).toFixed(0);
            return `${tempCelsius}`;
        } catch (e) {
            return "N/A";
        }
    });

    return <box className="SystemUsage">
        <label className="Cpu" label={bind(cpuUsage, "value").as(cpu => ` ${cpu}`)} />
        <label className="Ram" label={bind(ramUsage, "value").as(ram => ` ${ram}`)} />
        <label className="Temp" label={bind(tempUsage, "value").as(temp => ` ${temp}`)} />
    </box>;
}

function BatteryItem(props: { bat: typeof Battery.AstalBatteryDevice }) {
    const { bat } = props;
    const chargingStateBinding = bind(bat, "charging");
    const percentageBinding = bind(bat, "percentage");

    function updateLevel() {
      let icon = "󰁹";
      let per = Math.floor(bat.percentage * 100);
      if( bat.charging == false) {
        if(per >= 90) icon = "󰁹";
        else if(per >= 80) icon = "󰂂";
        else if(per >= 70) icon = "󰂁";
        else if(per >= 60) icon = "󰂀";
        else if(per >= 50) icon = "󰁿";
        else if(per >= 40) icon = "󰁾";
        else if(per >= 30) icon = "󰁽";
        else if(per >= 20) icon = "󰁼";
        else if(per >= 10) icon = "󰁻";
        else if(per < 10) icon = "󰂃";
      }
      else {
        if(per >= 90) icon = "󰂅";
        else if(per >= 80) icon = "󰂋";
        else if(per >= 70) icon = "󰂊";
        else if(per >= 60) icon = "󰢞";
        else if(per >= 50) icon = "󰂉";
        else if(per >= 40) icon = "󰢝";
        else if(per >= 30) icon = "󰂈";
        else if(per >= 20) icon = "󰂇";
        else if(per >= 10) icon = "󰂆";
        else if(per < 10) icon = "󰢜";
      }
      return `${icon} ${per}%`;
    }

    function setup(self: Widget.Label) {
        self.hook(chargingStateBinding, () => {
          self.toggleClassName("charging", bat.charging)
          self.set_label(updateLevel())
        });
        self.hook(percentageBinding, () => {
          self.set_label(updateLevel())
        });

        if(chargingStateBinding.get()) self.toggleClassName("charging", true);
        self.set_label(updateLevel())
    }

    return <box className="Battery"
        visible={bind(bat, "isPresent")}>
        <label setup={setup} />
    </box>
}

function BatteryLevel() {
    const bat = Battery.get_default()

    return <BatteryItem bat={bat} />
}

function TagButton(props: { index: number, tags: number, output: typeof River.Output }) {
    const { index, tags, output } = props;
    const occupiedBinding = bind(output, "occupied_tags");
    const focusedBinding = bind(output, "focused_tags");
    const urgentBinding = bind(output, "urgent_tags");

    function setup(self: Widget.Button) {
        self.hook(occupiedBinding, () => self.toggleClassName("occupied", !!(occupiedBinding.get() & (1 << index))));
        self.hook(focusedBinding, () => self.toggleClassName("focused", !!(focusedBinding.get() & (1 << index))));
        self.hook(urgentBinding, () => self.toggleClassName("urgent", !!(urgentBinding.get() & (1 << index))));

        let occupied_tags = output.occupied_tags;
        let urgent_tags = output.urgent_tags;  
        let focused_tags = output.focused_tags;  
        if (index == 0) self.toggleClassName("start", true);
        if (index == (tags - 1) ) self.toggleClassName("end", true);
        if (occupied_tags & (1 << index)) self.toggleClassName("occupied", true);
        if (focused_tags & (1 << index)) self.toggleClassName("focused", true);
        if (urgent_tags & (1 << index)) self.toggleClassName("urgent", true);
    }

    return (
        <button setup={setup} onClicked={() => output.focused_tags = 1 << index}>
            {index + 1}
        </button>
    );
}


function RiverTags({ monitor }: Props) {
    const tags = 9
    var river = River.get_default()

    const manufacture_name = monitor.get_manufacturer()
    const model_name = monitor.get_model()
    const combine_name = `${manufacture_name} ${model_name}`
    const wlr_randr_cmd = `bash -c "wlr-randr | grep '${combine_name}' | awk '{print $1}'"`

    try {
      const cur_monitor_name = exec(wlr_randr_cmd).toString();
      const output = river.get_output(cur_monitor_name)

      return <box className="RiverTags">
          {[...Array(tags).keys()].map(index => (
              <TagButton key={index} index={index} tags={tags} output={output} />
          ))}
      </box>
    } catch (error) {
      console.error(`RiverTags ERROR: ${error}`);
    }

}

function Time({ format = " %Y-%m-%d %a %H:%M" }) {
    const time = Variable<string>("").poll(1000, () =>
        GLib.DateTime.new_now_local().format(format)!)

    return <label
        className="Time"
        onDestroy={() => time.drop()}
        label={time()}
    />
}

export default function Bar(monitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

    return <window
        className="TopBar"
        gdkmonitor={monitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={TOP | LEFT | RIGHT}>
        <centerbox>
            <box hexpand halign={Gtk.Align.START}>
                <RiverTags monitor={monitor}/>
                <BatteryLevel />
            </box>
            <box>
                <Time />
            </box>
            <box className="BoxEnd" hexpand halign={Gtk.Align.END} >
                <SystemUsage />
                <SysTray />
            </box>
        </centerbox>
    </window>
}

