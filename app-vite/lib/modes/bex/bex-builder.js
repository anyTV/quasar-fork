
const { join } = require('path')
const { createWriteStream, mkdirpSync } = require('fs-extra')
const archiver = require('archiver')

const AppBuilder = require('../../app-builder')
const appPaths = require('../../app-paths')
const { progress } = require('../../helpers/logger')
const config = require('./bex-config')
const { createManifest, copyBexAssets } = require('./utils')

const { name, version } = require(appPaths.resolve.app('package.json'))

const env = (process.env.BUILD_FOR
  ? process.env.BUILD_FOR
  : process.env.NODE_ENV) || 'staging';
class BexBuilder extends AppBuilder {
  async build () {
    const viteConfig = await config.vite(this.quasarConf)
    await this.buildWithVite('BEX UI', viteConfig)

    const { err } = createManifest(this.quasarConf)
    if (err !== void 0) { process.exit(1) }

    const backgroundConfig = await config.backgroundScript(this.quasarConf)
    await this.buildWithEsbuild('Background Script', backgroundConfig)

    for (const name of this.quasarConf.bex.contentScripts) {
      const contentConfig = await config.contentScript(this.quasarConf, name)
      await this.buildWithEsbuild('Content Script', contentConfig)
    }

    const domConfig = await config.domScript(this.quasarConf)
    await this.buildWithEsbuild('Dom Script', domConfig)

    copyBexAssets(this.quasarConf)

    const zipDir = this.quasarConf.build.zipDir ||  this.quasarConf.build.distDir

    mkdirpSync(zipDir)

    this.printSummary(this.quasarConf.build.distDir)
    this.#bundlePackage(this.quasarConf.build.distDir, zipDir)
  }

  #bundlePackage (srcFolder, outFolder) {
    const done = progress('Bundling in progress...')
    const file = join(outFolder, `${name}-v${version}-${env}.zip`)

    let output = createWriteStream(file)
    let archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    })

    archive.pipe(output)
    archive.directory(srcFolder, false)
    archive.finalize()

    done(`Bundle has been generated at: ${file}`)
  }
}

module.exports = BexBuilder
