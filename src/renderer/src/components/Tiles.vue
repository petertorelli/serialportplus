<script setup lang="ts">
import { reactive, nextTick } from 'vue';
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
  constructor(path: string) {
    this.path = path;
    DisplayWindowContext.uuid++;
    this.myid = DisplayWindowContext.uuid;
  };
}

let portStatus = reactive(new Map<string, DisplayWindowContext>);

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
});

</script>

<template lang="pug">
div
  button.m-2.btn.btn-sm.btn-primary(@click="scan" title="Re-scan serialports")
    font-awesome-icon(:icon="fas.faArrowRotateRight")
  .d-flex.flex-row.flex-wrap
    .m-2(v-for="[path, ctx] in portStatus")
      div(style='width: 26rem').fixed-font
        .ui-title {{ ctx.path }}
        .ui-controls.d-flex.flex-row.justify-content-between
          .m-1.d-inline-block
            .input-group.d-inline-flex
              select.form-select.w-auto.form-select-sm(:disabled='ctx.isOpen' v-model.number='ctx.baud')
                option(value=9600) 9600
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
        .ui-output(:id="'console-output_' + ctx.myid")
          div.output-line(
            v-for="line in ctx.content") {{ line }}
        .ui-input.d-flex
          input.w-100(
            type="text"
            @keydown="keyDown(path, $event)"
            v-model="ctx.cmd"
            :placeholder="ctx.sendHex ? 'Enter Hex bytes' : 'Enter Command'")
          .form-check.ms-2.d-flex.align-items-center.h-100
            input.form-check-input(:id="'console-input_hex_' + ctx.myid" type='checkbox' v-model="ctx.sendHex")
</template>

<style>
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
    height: 25em;
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