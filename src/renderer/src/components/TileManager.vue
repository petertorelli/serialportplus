<script setup lang="ts">
/**
 * This tile manager handles addition and removal of port tiles. One serial
 * port equals one tile. When a USB attach/detach event fires, the callback
 * reconciles the port list paths. If a port is added, a new tile is added.
 * If a port is lost/unplugged, a message is sent to that tile indicating the
 * port was dropped.
 * 
 * I had a rescan button, but it seems superfluous now.
 */
import { defineComponent } from 'vue';
import { reactive } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'
import PortTile from './PortTile.vue'

class PortData {
  message: string = "init";
}

let portStatus = reactive(new Map<string, PortData>);

function scan() {
  window.serialport.list().then((paths: Set<string>) => {
    paths.forEach(path => {
      console.log(path);
      // First check if we added any new ports...
      if (portStatus.has(path)) {
        const x = portStatus.get(path);
        if (x) {
          // didn't change ..
          if (x.message === 'init') {
            console.log("was already there");
          } else {
            console.log("was dropped and readded");
            x.message = 'reinit';
          }
        }
      } else {
        // added new port
        if (path.match(/usb/)) {
          portStatus.set(path, new PortData);
        }
      }
    });
    portStatus.forEach((value, key) => {
      if (paths.has(key)) {
        // didn't change
      } else {
        value.message = "dropped";
      }
    })
  });
}

function portlistChangeCallback() {
  console.log("Better check the ports...");
  scan();
}

window.serialport.portlistChangeEvent(portlistChangeCallback);

scan();

defineComponent({
  components: {
    PortTile
  }
});

defineExpose({
  FontAwesomeIcon,
  fas,
});

</script>

<template lang="pug">
div
  //-button.m-2.btn.btn-sm.btn-primary(@click="scan" title="Re-scan serialports")
    font-awesome-icon(:icon="fas.faArrowRotateRight")
  h1.text-danger.m-2(v-if="portStatus.size === 0") No serial ports detected.
  div(v-else)
    div(v-for="[path, data] in portStatus")
      PortTile.p-2(:path="path" :message="data.message")
</template>

<style>
</style>