<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue';
import { Buffer } from 'buffer';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'

class DisplayWindowContext {
  static uuid: number = 0;
  myid: number = 0;
  path: string|undefined;
  content: string[] = [];
  isOpen: boolean = false;
  isBusy: boolean = false;
  cmd: string|null = null;
  baud: number = 115200;
  sendHex: boolean = false;
  width_px: number = 700;
  height_px: number = 250;
  dragOffsetY: number = 0;
  constructor(path: string) {
    this.path = path;
    DisplayWindowContext.uuid++;
    this.myid = DisplayWindowContext.uuid;
  };
}
// 1x1 transparent pixel.  If we use a 0x0 image, Firefox
// would ingore it and fallback to the default.
const emptyImage = new Image(1, 1);
emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';


document.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'none'; })
let portStatus = reactive(new Map<string, DisplayWindowContext>);


let dragStartY = 0;
let tStartY = 0;
let dragStartX = 0;
let tStartX = 0;

document.addEventListener("dragstart", (event: DragEvent) => {
  const path = event.target.dataset['windowid'];
  const t = portStatus.get(path);
  if (t) {
    dragStartY = event.clientY;
    tStartY = t.height_px;
    dragStartX = event.clientX;
    tStartX = t.width_px;
  }
  // prevent the weird "macOS globe", which means this may cause some lag
  if (emptyImage.complete) {
    event.dataTransfer.setDragImage(emptyImage, 0, 0);
  }
});

document.addEventListener("drag", (event: DragEvent) => {
  const path = event.target.dataset['windowid'];
  const t = portStatus.get(path);
  if (t) {
    if (event.clientX > 0) {
      let set = tStartX + (event.clientX - dragStartX);
      if (set > 480) {
        t.width_px = set;
      }
    }
    if (event.clientY > 0) {
      let set = tStartY + (event.clientY - dragStartY);
      if (set > 200) {
        t.height_px = set;
      }
    }
  }
});

/*
window.addEventListener("drag", (event: DragEvent) => {
  console.log(event);
  const path = event.target.dataset['windowid'];
  const t = portStatus.get(path);
  if (t) {
    console.log(event.clientX, event.clientY);
    if (event.clientX > 0) {
      t.width_px = event.clientX;
    }
    if (event.clientY > 0) {
      t.height_px = event.clientY;
    }
  }
})
  */

function send_value(percent: number, path: string) {
  console.log(percent, path);

  let pwm = percent / 10 * 1000;

  const data = Buffer.alloc(4);
  data[0] = 0x55;
  data[1] = 0x01;
  data[2] = pwm >> 8;
  data[3] = pwm & 0xff;

  console.log(data);
  window.serialport.writeToPort(path, data);
}

function reset(path: string) {
  const data = Buffer.alloc(4);
  data[0] = 0xaa;
  data[1] = 0;
  data[2] = 0
  data[3] = 0;
  window.serialport.writeToPort(path, data);
}

function scan() {
  window.serialport.list().then((paths: string[]) => {
    paths.forEach(path => {
      if (!portStatus.has(path)) {
        console.log(path);
        if (path.match(/usb/)) {
          portStatus.set(path, new DisplayWindowContext(path));
        }
      }
    })
  });
}

function eventHandler(path: string, event: string, data: Error|string|null) {
  let ctx = portStatus.get(path);
  if (ctx === undefined) {
    throw new Error("Port is not defined in portList");
  }
  if (event === "data") {
    ctx.content.push(data as string);
    scrollToBottomNext(path);
  } else if (event === "close") {
    ctx.isOpen = false;
    ctx.content.push("PORT CLOSED");
    scrollToBottomNext(path);
  } else if (event === "error") {
    const err = data as Error;
    ctx.content.push("ERROR: " + err.message);
    scrollToBottomNext(path);
  }
}

function togglePort(path: string) {
  let ctx = portStatus.get(path);
  if (ctx === undefined) {
    throw new Error("Port is not defined in portList");
  }
  ctx.isBusy = true;
  if (ctx.isOpen) {
    window.serialport.destroyPort(path).then(err => {
      if (err) {
        ctx.content.push("ERROR: " + err.message);
        scrollToBottomNext(path);
      } else {
        ctx.isOpen = false;
      }
      ctx.isBusy = false;
    });
  } else {
    window.serialport.createPort(path, ctx.baud, eventHandler).then(err => {
      if (err) {
        ctx.content.push("ERROR: " + err.message);
        scrollToBottomNext(path);
      } else {
        ctx.isOpen = true;
        ctx.content.push("PORT OPEN");
        scrollToBottomNext(path);
      }
      ctx.isBusy = false;
    });
  }
}

function scrollToBottomNext(path: string) {
  let ctx = portStatus.get(path);
  if (ctx === undefined) {
    throw new Error("Port is not defined in portList");
  }
  // Let drawing of reactive components finish before scrolling
  const el: (HTMLElement | null) = document.querySelector("#console-output_" + ctx.myid);
  nextTick(() => {
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

function keyDown (path: string, event: KeyboardEvent) {
  let ctx = portStatus.get(path);
  if (ctx === undefined) {
    throw new Error("Port is not defined in portList");
  }
  if (event.keyCode == 13 /* CR */) {
    console.log("SEND");
    if (ctx.cmd) {
      // Here's the console TRANSMIT function, it's a Vue emitter
      if (ctx.sendHex == true) {
        console.log('sending as hex');
        if (ctx.cmd.length & 1) {
          ctx.cmd = '0' + ctx.cmd;
        }
        const data = Buffer.from(ctx.cmd, 'hex');
        console.log(data);
        window.serialport.writeToPort(path, data);
      } else {
        console.log("sending", ctx.cmd);
        window.serialport.writeToPort(path, ctx.cmd);
      }
      ctx.cmd = null;
    }
    // Not every OS keeps the focus on CR in <input>
//    focusOnInputNext();
  }
}

scan();

defineExpose({
  scan,
  keyDown,
  togglePort,
  FontAwesomeIcon,
  fas,
  send_value,
  reset,
});

</script>

<template lang="pug">
div
  button.m-2.btn.btn-sm.btn-primary(@click="scan" title="Re-scan serialports")
    font-awesome-icon(:icon="fas.faArrowRotateRight")
  .d-flex.flex-row.flex-wrap
    .m-2(v-for="[path, ctx] in portStatus")
      //- These should be their own *.vue elements to avoid lists of data!!
      div(:style='{ width: ctx.width_px + "px"}' ref="'window_' + ctx.myid").fixed-font
        .ui-title {{ ctx.path }}
        .ui-controls.d-flex.flex-row.justify-content-between
          .m-1.d-inline-block
            .input-group.d-inline-flex
              select.form-select.w-auto.form-select-sm(:disabled='ctx.isOpen' v-model.number='ctx.baud')
                option(value=9600) 9600
                option(value=19200) 19200
                option(value=38400) 38400
                option(value=57600) 57600
                option(value=115200 selected) 115200
              select.form-select.w-auto.form-select-sm(:disabled='ctx.isOpen')
                option(selected) 8
                option 9
                option 10
              select.form-select.w-auto.form-select-sm(:disabled='ctx.isOpen')
                option(selected) N
                option Y
              select.form-select.w-auto.form-select-sm(:disabled='ctx.isOpen')
                option(selected) 1
                option 2
              select.form-select.w-auto.form-select-sm(:disabled='ctx.isOpen')
                option(selected) None
                option CR
                option LF
                option CRLF
          
          button.m-1.btn.btn-sm.btn-outline-secondary(@click="togglePort(path)" :disabled='ctx.isBusy' :title="ctx.isOpen ? 'Disconnect' : 'Connect'")
            font-awesome-icon(:icon="ctx.isOpen ? fas.faPlugCircleXmark : fas.faPlug")
        .ui-output(:id="'console-output_' + ctx.myid" :style='{height: ctx.height_px + "px"}')
          div.output-line(
            v-for="line in ctx.content") {{ line }}
        .ui-input.d-flex
          input.w-100(
            type="text"
            @keydown="keyDown(path, $event)"
            v-model="ctx.cmd"
            :placeholder="ctx.sendHex ? 'Enter Hex bytes' : 'Enter Command'")
          .hex-switcher.form-check.ms-2.d-flex.align-items-center.h-100(title="Switch from ASCII to hexdecimal")
            input.form-check-input(:id="'console-input_hex_' + ctx.myid" type='checkbox' v-model="ctx.sendHex")
          .p-2.d-flex.align-items-center.h-100(
              :data-windowid="path"
              title="resize"
              draggable='true')
            font-awesome-icon(:icon="fas.faCropSimple")
        div
          .m-2 Implementation controls
          .m-2
            button.me-2.btn.btn-primary.btn-sm(v-for='i in [...Array(11).keys()]' :data-percent="i/10"
              @click="send_value(i, path)") {{ i }}
          .m-2
            button.btn.btn-primary.btn-sm(@click="reset(path)") Reset
</template>

<style>
  html, body {
    height: 100%;
  }
  .fixed-font {
    font-family: Consolas, monospace;
  }

  .ui-title {
    border-radius: 5px 5px 0px 0px;
    border: 1px solid var(--bs-tertiary-color);
    text-align: center;
    background-color: #eee;
  }

  .ui-controls {
    border-left: 1px solid var(--bs-tertiary-color);
    border-right: 1px solid var(--bs-tertiary-color);
  }

  .ui-output  {
    /* This helps things like the 'help' command space-align text */
    white-space: pre;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    background-color: white;
    border: 1px solid var(--bs-tertiary-color);
    overflow-y: scroll;
    font-size: 9pt;
    border-radius: 0px 0px 0px 0px;
  }

  .ui-input {
    border-radius: 0px 0px 5px 5px;
    border: 1px solid var(--bs-tertiary-color);
    border-top: 0;
    /* Without this, the <INPUT> doesn't fill the div at height: 100%. */
    height: 2rem;
  }

  .ui-input .hex-switcher {
    border: 0px;
    border-right: 1px solid var(--bs-tertiary-color)
  }

  /* Override bootstrap's highlighting for the input */
  .ui-input input[type='text']:focus {
    background: rgba(0,123,255,.15);
    outline: none;
  }

  .ui-input input[type='text'] {
    padding-left: 0.75rem;
    width: 100%;
    height: 100%;
    border-radius: 0px 0px 0px 5px;
    border: 0px;
    border-right: 1px solid var(--bs-tertiary-color)
  }

  /* These two are necessary to vertically mid-align the checkboxes */
  .form-check {
    margin-bottom: 0;
  }
  .form-check-input {
    margin-top: 0;
  }

</style>