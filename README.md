# Overview

This app lets you connect to as many serial devices are plugged into your machine, each in their own little panel. This is useful for me since I often have lots of gadgets I'm building plugged into a hub, and opening tons of pyserial-term or Putty windows is a pain in the ass. Instead we get this now:

<img width="1302" alt="image" src="https://github.com/user-attachments/assets/adcdb325-d2d5-4d08-9cec-ea065f708fe2">

Features:

* Autodetects new devices via the `usb` package (the `Rescan` button isn't really necessary but the Menu looked too empty).
* Unplugged devices appear as "dropped", and reconnect to the same window when replugged.
* Hide unused serial ports with visibility
* Change color and rename each window; resize the window
* Send ASCII with no line ending, LF, or CRLF; or send RAW hex octets

# Background

I wrote a pretty complex Electron GUI for my last job at EEMBC in 2018. I used a bunch of frameworks, scaffolding, pacakges, and tools that have been updated so many times that the original doesn't even compile anymore. Curse of JavaScript frameworks. So I started again with the latest tools (almost 5 years later!). Tools I like to use are:

* Electron
* Vite (hotloading open serial ports is a bad idea)
* Vue
* TypeScript
* Pug
* Bootstrap and Fontawesome
* Serialport (reconbot is awesome)

# Project Setup

## Install

```bash
$ npm install
```

## Development

```bash
$ npm run dev
```

## Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

# TODO

Still working out packaging stuff, like icons, what I want on the macOS menu, help, etc. Would also like to be able to reorder windows and change font sizes.
