# Introduction

I wrote a pretty complex Electron GUI for my last job at EEMBC in 2018. I used a bunch of frameworks, scaffolding, pacakges, and tools that have been updated so many times that the original doesn't even compile anymore. Curse of JavaScript frameworks. So I started again with the latest tools (almost 5 years later!). Tools I like to use are:

* Electron
* Vite (hotloading open serial ports is a bad idea)
* Vue
* TypeScript
* Pug
* Bootstrap and Fontawesome
* Serialport (reconbot is awesome)

This app lets you connect to as many serial devices are plugged into your machine, each in their own little panel. This is useful for me since I often have lots of gadgets I'm building plugged into a hub, and opening tons of pyserial-term or Putty windows is a pain in the ass. Instead we get this now:

<img width="1005" alt="image" src="https://github.com/user-attachments/assets/1c970896-edbb-418f-a439-b11e6d985ec6">

It's got some work left, like addung usb plug/unplug events to trigger rescan, and handling the port lifecycle in the preload, but it is good enough for now.

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
