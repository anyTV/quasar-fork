/* eslint-disable */
/**
 * THIS FILE IS GENERATED AUTOMATICALLY.
 * DO NOT EDIT.
 *
 * You are probably looking into adding hooks in your code. This should be done by means of
 * src-bex/js/content-hooks.js which has access to the browser instance and communication bridge
 **/

/* global chrome */

import Bridge from './bridge'
import { listenForWindowEvents } from './window-event-listener'
import runDevlandContentScript from '../../src-bex/__NAME__'

let port
let wall_fn
let bridge = new Bridge({
  // only used by bridge in constructor, only 1 fn is ever listened on
  listen (fn) {
    wall_fn = fn
  },
  send (data) {
    port.postMessage(data)
    window.postMessage({
      ...data,
      from: 'bex-content-script'
    }, '*')
  }
})

function connect() {
  port = chrome.runtime.connect({
    name: 'contentScript'
  })

  // auto reconnect on disconnect
  port.onDisconnect.addListener(connect)

  // setup wall fn listener
  port.onMessage.addListener(wall_fn)
}
connect()

// Inject our dom script for communications.
function injectScript (url) {
  const script = document.createElement('script')
  script.src = url
  script.onload = function () {
    this.remove()
  }
  ;(document.head || document.documentElement).appendChild(script)
}

if (document instanceof HTMLDocument) {
  injectScript(chrome.runtime.getURL('dom.js'))
}

// Listen for event from the web page
listenForWindowEvents(bridge, 'bex-dom')

runDevlandContentScript(bridge)
