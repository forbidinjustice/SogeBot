'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')
var log = global.log

const ERROR_DOESNT_EXISTS = '1'

/*
 * !alias                            - gets an info about alias usage
 * !alias add ![cmd] ![alias]        - add alias for specified command
 * !alias remove ![alias]            - remove specified alias
 * !alias toggle ![alias]            - enable/disable specified alias
 * !alias toggle-visibility ![alias] - enable/disable specified alias
 * !alias list                       - get alias list
 */

function Alias () {
  this.alias = []
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!alias add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!alias list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!alias remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!alias toggle-visibility', this.visible, constants.OWNER_ONLY)
    global.parser.register(this, '!alias toggle', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!alias', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!alias')

    global.parser.registerParser(this, 'alias', this.parse, constants.VIEWERS)

    global.watcher.watch(this, 'alias', this._save)
    this._update(this)

    this.webPanel()
  }
}

Alias.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'alias' }, function (err, item) {
    if (err) return log.error(err, { fnc: 'Alias.prototype._update' })
    if (_.isNull(item)) return

    self.alias = item.alias
  })
}

Alias.prototype._save = function (self) {
  var alias = {
    alias: self.alias
  }
  global.botDB.update({ _id: 'alias' }, { $set: alias }, { upsert: true })
}

Alias.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'aliases', id: 'alias'})
  global.panel.socketListening(this, 'alias.get', this.sendAliases)
  global.panel.socketListening(this, 'alias.delete', this.deleteAlias)
  global.panel.socketListening(this, 'alias.create', this.createAlias)
  global.panel.socketListening(this, 'alias.toggle', this.toggleAlias)
  global.panel.socketListening(this, 'alias.toggle.visibility', this.toggleVisibilityAlias)
}

Alias.prototype.sendAliases = function (self, socket) {
  socket.emit('alias', self.alias)
}

Alias.prototype.deleteAlias = function (self, socket, data) {
  self.remove(self, null, '!' + data)
  self.sendAliases(self, socket)
}

Alias.prototype.toggleAlias = function (self, socket, data) {
  self.toggle(self, null, '!' + data)
  self.sendAliases(self, socket)
}

Alias.prototype.toggleVisibilityAlias = function (self, socket, data) {
  self.visible(self, null, '!' + data)
  self.sendAliases(self, socket)
}

Alias.prototype.createAlias = function (self, socket, data) {
  self.add(self, null, '!' + data.command + ' !' + data.value)
  self.sendAliases(self, socket)
}

Alias.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !alias add !<command> !<alias> | !alias remove !<alias> | !alias list | !alias toggle !<alias> | !alias toggle-visibility !<alias>', sender)
}

Alias.prototype.add = function (self, sender, text) {
  try {
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+) !([\u0500-\u052F\u0400-\u04FF\w ]+)$/)
    let data = {
      alias: parsed[2],
      command: parsed[1],
      enabled: true,
      visible: true
    }
    let alias = _.find(self.alias, function (oAlias) { return oAlias.alias === data.alias })
    if (_.isUndefined(alias)) self.alias.push(data)
    global.commons.sendMessage(global.translate(_.isUndefined(alias) ? 'alias.success.add' : 'alias.failed.add'), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.list = function (self, sender, text) {
  var aliases = []
  console.log(aliases)
  _.each(self.alias, function (element) { if (element.visible) aliases.push('!' + element.alias) })
  var output = (aliases.length === 0 ? global.translate('alias.failed.list') : global.translate('alias.success.list') + ': ' + aliases.join(', '))
  global.commons.sendMessage(output, sender)
}

Alias.prototype.toggle = function (self, sender, text) {
  try {
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+)$/)[1]
    let alias = _.find(self.alias, function (o) { return o.alias === parsed })

    if (_.isUndefined(alias)) {
      global.commons.sendMessage(global.translate('alias.failed.toggle')
        .replace('(alias)', parsed), sender)
      return
    }

    alias.enabled = !alias.enabled
    global.commons.sendMessage(global.translate(alias.enabled ? 'alias.success.enabled' : 'alias.success.disabled')
      .replace('(alias)', alias.alias), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.visible = function (self, sender, text) {
  try {
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+)$/)[1]
    let alias = _.find(self.alias, function (o) { return o.alias === parsed })

    if (_.isUndefined(alias)) {
      global.commons.sendMessage(global.translate('alias.failed.visible')
        .replace('(alias)', parsed), sender)
      return
    }

    alias.visible = !alias.visible
    global.commons.sendMessage(global.translate(alias.visible ? 'alias.success.visible' : 'alias.success.invisible')
      .replace('(alias)', alias.alias), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.remove = function (self, sender, text) {
  try {
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+)$/)[1]
    if (_.isUndefined(_.find(self.alias, function (o) { return o.alias === parsed }))) throw Error(ERROR_DOESNT_EXISTS)
    self.alias = _.filter(self.alias, function (o) { return o.alias !== parsed })
    global.commons.sendMessage(global.translate('alias.success.remove'), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_DOESNT_EXISTS:
        global.commons.sendMessage(global.translate('alias.failed.remove'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
    }
  }
}

Alias.prototype.parse = function (self, id, sender, text) {
  try {
    var parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)$/)
    var cmd = parsed[1]

    let alias = _.find(self.alias, function (oAlias) { return oAlias.alias.toLowerCase() === cmd.toLowerCase() || '!' + oAlias.alias.toLowerCase() === parsed[0].toLowerCase() })
    if (!_.isUndefined(alias) && alias.enabled) {
      global.parser.parse(sender, text.replace('!' + cmd, '!' + alias.command))
      global.parser.lineParsed--
    }
    global.updateQueue(id, true)
  } catch (e) {
    global.updateQueue(id, true)
  }
}

module.exports = new Alias()
