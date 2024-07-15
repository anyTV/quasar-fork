
const parseArgs = require('minimist')

const { log } = require('../helpers/logger')

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    h: 'help'
  },
  boolean: [ 'h' ]
})

if (argv.help) {
  console.log(`
  Description
    Cleans all build artifacts
  Usage
    $ quasar clean
  Options
    --help, -h     Displays this message
  `)
  process.exit(0)
}

const Artifacts = require('../artifacts')
Artifacts.cleanAll()

console.log()
log('Done cleaning build artifacts\n')
