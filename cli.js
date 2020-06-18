#!/usr/bin/env node

const Writable = require('stream').Writable
const LineStream = require('byline').LineStream
const util = require('util')
const chalk = new (require('chalk')).constructor({ enabled: true })

const COMPOSE_REGEXP = /^(.*\|\u001b\[0m )({.+})$/

const write = (chunk, enc, cb) => {
  try {
    // Parse a standard JSON chunk
    const msg = JSON.parse(chunk)
    const error = extractError(msg)
    process.stdout.write(format(msg, msg.severity, error))
    process.stdout.write('\n')
    cb(null)
  } catch (e) {
    // Try and extrack the chunk from a docker-compose log
    try {
      const matches = COMPOSE_REGEXP.exec(chunk)
      const msg = JSON.parse(matches[2])
      const error = extractError(msg)

      process.stdout.write(matches[1])
      process.stdout.write(format(msg, msg.severity, error))
      process.stdout.write('\n')
      cb(null)
    } catch (e) {
      process.stdout.write(chunk)
      process.stdout.write('\n')
      cb(null)
    }
  }
}

const format = (msg, severity, err) => {
  msg = util.inspect(msg, { depth: null }).replace(/'__ERROR_PLACEHOLDER__'/, err)
  switch (severity.toLowerCase()) {
    case 'error': return msg.split('\n').map(line => chalk.red(line)).join('\n')
    case 'warn': return msg.split('\n').map(line => chalk.yellow(line)).join('\n')
    case 'debug': return msg.split('\n').map(line => chalk.gray(line)).join('\n')
    default: return msg
  }
}

const extractError = (msg) => {
  const err = msg.err && msg.err.stack ? msg.err.stack : null
  if (!err) return null
  msg.err = '__ERROR_PLACEHOLDER__'
  return err
}

process.stdin
  .pipe(new LineStream())
  .pipe(new Writable({ write }))
