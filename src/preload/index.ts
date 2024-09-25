import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { SerialPort, ReadlineParser } from 'serialport';
import { usb } from 'usb';

let g_changeCallback: () => void | undefined;

usb.on('attach', () => {
  if (g_changeCallback) {
    g_changeCallback();
  }
});

usb.on('detach', () => {
  if (g_changeCallback) {
    g_changeCallback();
  }
});

let openPorts = new Map<string, SerialPort>;

const serialportAPI = {
  /* Only one callback is allowed. The owner of the callback is responsible
  for updating thier internal state using the `list()` function. */
  portlistChangeEvent: (cb: () => void | undefined) => {
    g_changeCallback = cb;
  },
  list: async () => {
    const ports = await SerialPort.list();
    const paths = new Set(ports.map((port) => port.path));
    return paths;
  },
  createPort: async (path: string, options: any, callback: any) => {
    if (openPorts.has(path)) {
      return;
    }
    options.path = path;
    let port = new SerialPort(options);
    const parser = new ReadlineParser();
    port.pipe(parser);
    parser.on('data', (data: string) => {
      callback("data", data);
    });
    port.on('error', err => {
      callback("error", err);
    });
    port.on('close', () => {
      openPorts.delete(path);
      callback("close");
    });
    // Using resolve instead of reject on purpose to track err w/o catch.
    return new Promise<Error|null>(resolve => {
      port.open(err => {
        if (!err) {
          openPorts.set(path, port);
        }
        resolve(err)
      })
    });
  },
  destroyPort: async (path: string) => {
    let port = openPorts.get(path);
    if (port) {
      return new Promise<Error|null>(resolve => {
        port.close(err => {
          if (!err) {
            openPorts.delete(path);
          }
          resolve(err)
        })
      });
    } else {
      return null;
    }
  },
  writeToPort: (path: string, data: Buffer|string) => {
    let port = openPorts.get(path);
    if (port) {
      port.write(data);
    }
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('serialport', serialportAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI;
  // @ts-ignore (define in d.ts)
  window.serialport = serialportAPI;
}
