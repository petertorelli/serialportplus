import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    serialport: {
      list: () => Promise<string[]>;
      createPort: (port: string, baudRate: number, callback: (path: string, event: string, data: string|Error|null) => void) => Promise<Error|null>;
      destroyPort: (port: string) => Promise<Error|null>;
      writeToPort: (path: string, data: Buffer|string) => void;
    }
  }
}
