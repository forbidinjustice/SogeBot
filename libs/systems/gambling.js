'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

const ERROR_NOT_ENOUGH_OPTIONS = '0'
const ERROR_ZERO_BET = '1'
const ERROR_NOT_ENOUGH_POINTS = '2'

/*
 * !gamble [amount] - gamble [amount] points with 50/50 chance
 * !seppuku         - timeout yourself
 */

function Gambling () {
  if (global.commons.isSystemEnabled(this) ** global.commons.isSystemEnabled('points')) {
    global.parser.register(this, '!gamble', this.gamble, constants.VIEWERS)
    global.parser.register(this, '!seppuku', this.seppuku, constants.VIEWERS)
    global.parser.register(this, '!roulette', this.roulette, constants.VIEWERS)
  }
}

Gambling.prototype.roulette = function (self, sender) {
  let isAlive = _.random(0, 1, false)
  let message = [
    global.translate('gambling.roulette.trigger'),
    isAlive ? global.translate('gambling.roulette.alive') : global.translate('gambling.roulette.dead')
  ]
  if (!isAlive) global.client.timeout(global.configuration.get().twitch.channel, sender.username, 10)
  global.commons.sendMessage(message.join(' '), sender)
}

Gambling.prototype.seppuku = function (self, sender) {
  global.commons.sendMessage(global.translate('gambling.seppuku'), sender)
  global.client.timeout(global.configuration.get().twitch.channel, sender.username, 10)
}

Gambling.prototype.gamble = function (self, sender, text) {
  try {
    let parsed = text.trim().match(/^([\d]+)$/)
    if (_.isNil(parsed)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)

    let points = parsed[1]
    if (points === 0) throw Error(ERROR_ZERO_BET)

    const user = global.users.get(sender.username)
    if (_.isNil(user.points) || user.points < points) throw Error(ERROR_NOT_ENOUGH_POINTS)

    global.users.set(sender.username, { points: user.points - points })
    if (_.random(0, 1)) {
      global.users.set(sender.username, { points: user.points + (points * 2) })
      global.commons.sendMessage(global.translate('gambling.gamble.win')
        .replace('(points)', global.users.get(sender.username).points)
        .replace('(pointsName)', global.systems.points.getPointsName(global.users.get(sender.username).points)), sender)
    } else {
      global.commons.sendMessage(global.translate('gambling.gamble.lose')
        .replace('(points)', global.users.get(sender.username).points)
        .replace('(pointsName)', global.systems.points.getPointsName(global.users.get(sender.username).points)), sender)
    }
  } catch (e) {
    switch (e.message) {
      case ERROR_ZERO_BET:
        global.commons.sendMessage(global.translate('gambling.gamble.zeroBet')
        .replace('(pointsName)', global.systems.points.getPointsName(0)), sender)
        break
      case ERROR_NOT_ENOUGH_OPTIONS:
        global.commons.sendMessage(global.translate('gambling.gamble.notEnoughOptions'), sender)
        break
      case ERROR_NOT_ENOUGH_POINTS:
        global.commons.sendMessage(global.translate('gambling.gamble.notEnoughPoints')
        .replace('(pointsName)', global.systems.points.getPointsName(100).toLowerCase()), sender)
        break
      default:
        global.commons.sendMessage(global.translate('core.error'), sender)
    }
  }
}

module.exports = new Gambling()
