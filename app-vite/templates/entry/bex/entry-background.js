/* eslint-disable */
/**
 * THIS FILE IS GENERATED AUTOMATICALLY.
 * DO NOT EDIT.
 *
 * You are probably looking into adding hooks in your code. This should be done by means of
 * src-bex/js/background-hooks.js which have access to the browser instance and communication bridge
 * and all the active client connections.
 **/

/* global chrome */

import Bridge from './bridge'
import runDevlandBackgroundScript from '../../src-bex/background'

const connections = {}

const getConnectionId = (port) => {
  const tab = port.sender.tab

  let connectionId
  // Get the port name, connection ID
  if (port.name.indexOf(':') > -1) {
    const split = port.name.split(':')
    connectionId = split[1]
    port.name = split[0]
  }

  // If we have tab information, use that for the connection ID as FF doesn't support
  // chrome.tabs on the app side (which we would normally use to get the id).
  if (tab !== void 0) {
    connectionId = tab.id
  }

  return connectionId
}

const addConnection = (port) => {
  const connectionId = getConnectionId(port)
  let currentConnection = connections[connectionId]
  if (!currentConnection) {
    currentConnection = connections[connectionId] = {}
  }

  currentConnection[port.name] = {
    port,
    connectionId,
    connected: true,
    listening: false
  }

  return currentConnection[port.name]
}

// simple impl from https://stackoverflow.com/a/59787784
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0
}

const removeConnection = (connectionId, port) => {
  let currentConnection = connections[connectionId]
  if (!currentConnection) {
    // already removed
    return
  }
  // mark disconnected & remove port
  currentConnection[port.name].connected = false
  delete currentConnection[port.name]
  // cleanup connection if no more ports
  if (isEmpty(currentConnection)) {
    delete connections[connectionId]
  }
}


/**
 * Create a comms layer between the background script and the App / ContentScript
 * Note: This hooks into all connections as the background script should be able to send
 * messages to all apps / content scripts within its realm (the BEX)
 * @type {Bridge}
 */
const bridge = new Bridge({
  listen (fn) {
    for (let connectionId in connections) {
      const connection = connections[connectionId]
      if (connection.app && !connection.app.listening) {
        connection.app.listening = true
        connection.app.port.onMessage.addListener(fn)
      }

      if (connection.contentScript && !connection.contentScript.listening) {
        connection.contentScript.port.onMessage.addListener(fn)
        connection.contentScript.listening = true
      }
    }
  },
  send (data) {
    const targetConnectionId = data?.[0]?.payload?.data?.connectionId
    const send_data = (connection) => {
      connection.app && connection.app.connected && connection.app.port.postMessage(data)
      connection.contentScript && connection.contentScript.connected && connection.contentScript.port.postMessage(data)
    }

    // only send to specific connection if connectionId is specified
    if (targetConnectionId && connections[targetConnectionId]) {
      send_data(connections[targetConnectionId])
      return
    }
    for (let connectionId in connections) {
      send_data(connections[connectionId])
    }
  }
})

chrome.runtime.onConnect.addListener(port => {
  // Add this port to our pool of connections
  const thisConnection = addConnection(port)
  thisConnection.port.onDisconnect.addListener(() => {
    removeConnection(thisConnection.connectionId, port)
  })

  bridge.setup_message_handlers()

  // reconnect current port every 295 seconds - https://stackoverflow.com/a/66618269
  function forceReconnect(port) {
    if (port._timer) {
      clearTimeout(port._timer)
      delete port._timer
    }
    port.disconnect()
  }
  port._timer = setTimeout(forceReconnect, 250e3, port)
})

runDevlandBackgroundScript(bridge, connections)