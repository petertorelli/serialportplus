<template lang="pug">

div(:style='{ width: ctx.width_px + "px"}').fixed-font
  .ui-title {{ ctx.path }} {{ ctx.dropped ? '- dropped' : '' }}
  .ui-controls.d-flex.flex-row.justify-content-between
    .m-1.d-inline-block
      .input-group.d-inline-flex
        select.form-select.w-auto.form-select-sm(:disabled='ctx.disabled' v-model.number='ctx.baud')
          option(value=9600) 9600
          option(value=19200) 19200
          option(value=38400) 38400
          option(value=57600) 57600
          option(value=115200 selected) 115200
        select.form-select.w-auto.form-select-sm(:disabled='ctx.disabled' v-model.number='ctx.dataBits')
          option(selected) 8
          option 9
          option 10
        select.form-select.w-auto.form-select-sm(:disabled='ctx.disabled' v-model='ctx.parity')
          option(value='none' selected) N
          option(value='even') E
          option(Value='odd') O
        select.form-select.w-auto.form-select-sm(:disabled='ctx.disabled' v-model.number='ctx.stopBits')
          option(value=1 selected) 1
          option(value=2) 2
        select.form-select.w-auto.form-select-sm(:disabled='ctx.disabled' v-model='ctx.ending')
          option(value="" selected) None
          option(value="\r") CR
          option(value="\n") LF
          option(value="\r\n") CRLF
    button.m-1.btn.btn-sm.btn-outline-secondary(@click="togglePort(path)" :disabled='ctx.isBusy || ctx.dropped' :title="ctx.isOpen ? 'Disconnect' : 'Connect'")
      font-awesome-icon(:icon="ctx.isOpen ? fas.faPlugCircleXmark : fas.faPlug")
  .ui-output(ref='uiOutput' :style='{height: ctx.height_px + "px"}')
    .output-line(v-for="line in ctx.content") {{ line }}
  .ui-input.d-flex
    input.w-100(
      type="text"
      @keydown="keyDown(path, $event)"
      v-model="ctx.cmd"
      :placeholder="ctx.sendHex ? 'Enter Hex bytes' : 'Enter Command'")
    .hex-switcher.form-check.ms-2.d-flex.align-items-center.h-100(title="Switch from ASCII to hexdecimal")
      input.form-check-input(type='checkbox' v-model="ctx.sendHex")
    .p-2.d-flex.align-items-center.h-100(
        :data-windowid="path"
        title="resize"
        draggable='true')
      font-awesome-icon(:icon="fas.faCropSimple")
</template>

<script lang="ts" setup>

import { defineExpose, defineProps, nextTick, reactive, ref, watch } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { Buffer } from 'buffer';

class DisplayWindowContext {
  path: string|undefined;
  content: string[] = [];
  isOpen: boolean = false;
  isBusy: boolean = false;
  cmd: string|null = null;
  baud: number = 115200;
  dataBits: number = 8;
  parity: 'odd'|'even'|'none' = 'none';
  stopBits: number = 1;
  ending: '\n'|'\r'|'\r\n'|'' = '';
  sendHex: boolean = false;
  width_px: number = 700;
  height_px: number = 250;
  dragOffsetY: number = 0;
  dropped: boolean = false;
  disabled: boolean = false;
  constructor(path: string) {
    this.path = path;
  };
}

const props = defineProps(['path', 'message']);
const ctx = reactive(new DisplayWindowContext(props.path));
const uiOutput = ref(null);

watch(() => props.message, message => {
  console.log("message", message);
  if (message === 'dropped') {
    ctx.dropped = true;
  } else if (message === 'reinit') {
    ctx.dropped = false;
  }
});


// make disabled computed...

watch(() => ctx.isOpen, isOpen => {
  if (isOpen) {
    ctx.disabled = true;
  } else {
    ctx.disabled = false;
  }
});

watch(() => ctx.dropped, dropped => {
  if (dropped) {
    ctx.disabled = true;
  } else {
    ctx.disabled = false;
  }
})


let dragStartY = 0;
let tStartY = 0;
let dragStartX = 0;
let tStartX = 0;

/**
 * The purpose of this is to prevent the GUI from rendering an image of the
 * drag element when resizing.
 */
const emptyImage = new Image(1, 1);
emptyImage.src
  = 'data:image/gif;base64,R0lGODlhAQABAIAAAP'
  + '///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

document.addEventListener('dragstart', (event: DragEvent) => {
  const target = event.target as HTMLElement;
  const windowId = target.dataset['windowid'];
  if (typeof windowId === 'string') {
    dragStartY = event.clientY;
    tStartY = ctx.height_px;
    dragStartX = event.clientX;
    tStartX = ctx.width_px;
  }
  // prevent the weird "macOS globe", which means this may cause some lag
  if (event.dataTransfer && emptyImage.complete)  {
    event.dataTransfer.setDragImage(emptyImage, 0, 0);
  }
});

document.addEventListener("dragover", (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'none';
  }
});

document.addEventListener("drag", (event: DragEvent) => {
  const target = event.target as HTMLElement;
  const windowId = target.dataset['windowid'];

  if (typeof windowId === 'string') {
    if (event.clientX > 0) {
      let set = tStartX + (event.clientX - dragStartX);
      if (set > 480) {
        ctx.width_px = set;
      }
    }
    if (event.clientY > 0) {
      let set = tStartY + (event.clientY - dragStartY);
      if (set > 200) {
        ctx.height_px = set;
      }
    }
  }
});

function scrollToBottomNext() {
  const el = uiOutput.value as HTMLElement|null;
  nextTick(() => {
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

function eventHandler(event: string, data: Error|string|null) {
  if (event === "data") {
    ctx.content.push(data as string);
    scrollToBottomNext();
  } else if (event === "close") {
    ctx.isOpen = false;
    ctx.content.push("PORT CLOSED");
    scrollToBottomNext();
  } else if (event === "error") {
    const err = data as Error;
    ctx.content.push("ERROR: " + err.message);
    scrollToBottomNext();
  }
}


function togglePort(path: string) {
  ctx.isBusy = true;
  if (ctx.isOpen) {
    window.serialport.destroyPort(path).then(err => {
      if (err) {
        ctx.content.push("ERROR: " + err.message);
        scrollToBottomNext();
      } else {
        ctx.isOpen = false;
      }
      ctx.isBusy = false;
    });
  } else {
    let options = {
      parity: ctx.parity,
      stopBits: ctx.stopBits,
      dataBits: ctx.dataBits,
      autoOpen: false,
      baudRate: ctx.baud,
    };
    window.serialport.createPort(path, options, eventHandler).then(err => {
      if (err) {
        ctx.content.push("ERROR: " + err.message);
        scrollToBottomNext();
      } else {
        ctx.isOpen = true;
        ctx.content.push("PORT OPEN");
        scrollToBottomNext();
      }
      ctx.isBusy = false;
    });
  }
}

function echo(line: string) {
  ctx.content.push(line);
}

function keyDown (path: string, event: KeyboardEvent) {
  if (event.keyCode == 13 /* CR */) {
    if (ctx.cmd) {
      // Here's the console TRANSMIT function, it's a Vue emitter
      if (ctx.sendHex == true) {
        if (ctx.cmd.length & 1) {
          ctx.cmd = '0' + ctx.cmd;
        }
        const data = Buffer.from(ctx.cmd, 'hex');
        if (data.length === 0) {
          echo('ERROR: Invalid hex');
        } else {
          echo(data.toString('hex'));
          window.serialport.writeToPort(path, data);
        }
      } else {
        echo(ctx.cmd);
        window.serialport.writeToPort(path, ctx.cmd);
      }
      ctx.cmd = null;
    }
  }
}

defineExpose({
  FontAwesomeIcon,
  fas,
  togglePort,
  keyDown,
});

</script>

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