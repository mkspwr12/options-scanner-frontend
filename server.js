const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const path = require('path')
const fs = require('fs')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 8080

// Diagnostic logging
const cwd = process.cwd()
const nextDir = path.join(cwd, '.next')
const buildIdPath = path.join(nextDir, 'BUILD_ID')

console.log(`Current working directory: ${cwd}`)
console.log(`.next directory path: ${nextDir}`)
console.log(`.next exists: ${fs.existsSync(nextDir)}`)
if (fs.existsSync(nextDir)) {
  console.log(`.next contents: ${fs.readdirSync(nextDir).join(', ')}`)
}
console.log(`BUILD_ID exists: ${fs.existsSync(buildIdPath)}`)

// List wwwroot contents if we're there
if (fs.existsSync('/home/site/wwwroot')) {
  console.log(`wwwroot contents: ${fs.readdirSync('/home/site/wwwroot').join(', ')}`)
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
  .catch(err => {
    console.error('Failed to prepare app:', err)
    process.exit(1)
  })
