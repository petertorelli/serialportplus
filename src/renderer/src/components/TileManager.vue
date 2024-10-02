<!-- Copyright (C) 2024 Peter Torelli <peter.j.torelli@gmail.com> -->

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
import { Dropdown } from 'bootstrap';

const invisibilityDict = reactive({});

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
        portStatus.set(path, new PortData);
        invisibilityDict[path] = false;
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
  scan();
}

window.serialport.portlistChangeEvent(portlistChangeCallback);

scan();

defineComponent({
  components: {
    PortTile
  }
});

function toggleVisibility(port: string) {
  invisibilityDict[port] = !invisibilityDict[port];
  const ps = portStatus.get(port);
  if (ps) {
    ps.message = invisibilityDict[port] ? "hide" : "show";
  }
}

function unhideAll() {
  for (let p in invisibilityDict) {
    invisibilityDict[p] = false;
    const ps = portStatus.get(p);
    if (ps) {
      ps.message = invisibilityDict[p] ? "hide" : "show";
    }
  }
}

defineExpose({
  FontAwesomeIcon,
  fas,
  Dropdown,
  toggleVisibility,
  unhideAll,
});

</script>

<template lang="pug">
table.border-bottom(style='background-color: #eee;' width="100%")
  row
    td
      .mx-2(style='font-size: 1.5rem;' valign=middle).m-2 SerialPort+
    td.pointer(valign='middle')
      .m-2(@click="scan()") Rescan
    td.pointer(valign='middle')
      .mx-2.dropdown-toggle(
        valign='middle'
        data-bs-toggle="dropdown"
      ) Visibility
      ul.dropdown-menu(ref="dropdownMenu")
        li(v-for="[path, data] in portStatus")
          a.dropdown-item(
            href='#'
            @click='toggleVisibility(path)'
            :class="{ 'text-body-tertiary' : invisibilityDict[path] === true}"
            ) {{ path }}
        li
          hr.dropdown.divider
        li
          a.dropdown-item(href="#" @click='unhideAll()') Unhide all

div
  //-button.m-2.btn.btn-sm.btn-primary(@click="scan" title="Re-scan serialports")
    font-awesome-icon(:icon="fas.faArrowRotateRight")
  b.text-danger.m-2(v-if="portStatus.size === 0") No serial ports detected.
  .d-flex.flex-wrap(v-else)
    div(v-for="[path, data] in portStatus")
      PortTile.p-2(:path="path" :message="data.message")
</template>

<style>
.pointer {
  cursor: pointer;
}
</style>