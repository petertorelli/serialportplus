import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { SerialPort, ReadlineParser } from 'serialport';

let openPorts = new Map<string, SerialPort>;

const serialportAPI = {
  list: async () => {
    const ports = await SerialPort.list();
    const paths = ports.map((port) => port.path);
    return paths;
  },
  createPort: async (path: string, baudRate: number, callback: any) => {
    if (openPorts.has(path)) {
      return;
    }
    let port = new SerialPort({path, baudRate, autoOpen: false});
    const parser = new ReadlineParser();
    port.pipe(parser);
    parser.on('data', (data: string) => {
      callback(path, "data", data);
    });
    port.on('error', err => {
      callback(path, "error", err);
    });
    port.on('close', () => {
      openPorts.delete(path);
      callback(path, "close");
    });
    return new Promise<Error|null>(resolve => {
      console.log("Open port in promose");
      port.open(err => {
        console.log("Open callback: ", err);
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
