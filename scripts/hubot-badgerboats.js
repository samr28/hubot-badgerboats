// Description:
//  Make Slack great again
//
//
// Commands:
//  hubot <message> - Send <message> to the group

// ================================================================================================
// Module dependencies
// ================================================================================================
const utils = require('./utils');
const moment   = require('moment');

const REDIS_BRAIN_KEY = "badgerboats";
const REDIS_BRAIN_ADMINS_KEY = "badgerboatsAdmins";
// Notified on bot start. Can be users or channels (make sure to use @|#)
const NOTIFY_GROUPS = ['@sam'];
const ADMIN_USER_NAME = process.env.HUBOT_ADMIN_USER_NAME || 'sam';
const ADMIN_USER_ID = process.env.HUBOT_ADMIN_USER_ID || '1';

let startTime = new Date();

// ================================================================================================
// Module exports
// ================================================================================================
module.exports = function (robot) {
  let version = require('../package.json').version;

  robot.respond(/(.+)/i, function (msg) {
    handleMsg(robot, msg);
  });
  robot.brain.on('connected', initBrain);

  // Notify users
  NOTIFY_GROUPS.forEach(function (user) {
    robot.messageRoom(user, `Bot v${version} started @ ${startTime}`);
  });
  console.log(`Bot v${version} started @ ${startTime}`);

  /**
   * Start the robot brain if it has not already been started
   *
   * @param  {Object} robot  Hubot object
   */
  function initBrain() {
    console.log(`LOADED DATA: ${robot.brain.get(REDIS_BRAIN_KEY)}`);
    console.log(`ADMINS DATA: ${robot.brain.get(REDIS_BRAIN_ADMINS_KEY)}`);
    // TODO use a for loop here
    let brainData = robot.brain.get(REDIS_BRAIN_KEY);
    if (!brainData || !brainData.users || !brainData.admins
      || !Array.isArray(brainData.users) || !Array.isArray(brainData.admins)) {
      console.log('NO PREV DATA');
      robot.brain.set(REDIS_BRAIN_KEY, {
        users : [ADMIN_USER_NAME],
        admins : [ADMIN_USER_NAME]
      });
    }
  }
}

/**
 * Handle incoming messages
 *
 * @param  {Object} robot Hubot object
 * @param  {Object} msg   Incoming message
 */
function handleMsg(robot, msg) {
  let message = msg.match[1];
  utils.logMsgData(msg, `HANDLE MESSAGE: ${message}`);
  let user = msg.message.user;
  let admins = getAdmins(robot);
  if (message.indexOf('!') === 0) {
    if (isCommand(message, 'list')) {
      return msg.send(`*Users*: ${getMsgUsers(robot).join(', ')}` +
      `\n*Admins*: ${getAdmins(robot).join(', ')}`);
    } else if (isCommand(message, 'up')) {
      return msg.send(`I was started ${moment(startTime).fromNow()}`);
    } else if (isCommand(message, 'help')) {
      let helpInfo =  `!list - list all users` +
                      `\n!up - get bot uptime` +
                      `\n!help - display this help`;
      if (admins.indexOf(user.name) !== -1) {
        helpInfo += `\n!add <user> - add a user to the list` +
                    `\n!remove <user> - remove a user from the list` +
                    `\n!admin <user> - make a user an admin` +
                    `\n!unadmin <user> - revoke admin permissions from a user`
      }
      msg.send(helpInfo);
    } else if (admins.indexOf(user.name) !== -1) {
      // Admin commands
      if (isCommand(message, 'add')) {
        let addUser = message.slice(5);
        addMsgUser(robot, msg, addUser);
      } else if (isCommand(message, 'remove')) {
        let removeUser = message.slice(8);
        removeMsgUser(robot, msg, removeUser);
      } else if (isCommand(message, 'admin')) {
        let adminUser = message.slice(7);
        addAdmin(robot, adminUser);
      } else if (isCommand(messsage, 'unadmin')) {
        let adminUser = message.slice(9);
        removeAdmin(robot, msg, adminUser);
      } else {
        msg.send(`Unrecognied command "${message}". Type "!help" to get a list of commands`);
      }
    } else {
      msg.send(`Unrecognied command "${message}". Type "!help" to get a list of commands`);
    }
  } else {
    sendMessage(robot, msg, message);
  }
}

/**
 * Check if a command was sent
 * @param  {String} message Incoming message
 * @param  {String} command Name of command to check for
 * @return {Boolean}        If the message contais the command
 */
function isCommand(message, command) {
  return message.indexOf('!' + command) === 0;
}

/**
 * Send a message to all of the users
 * @param  {Object} robot   Hubot object
 * @param  {Object} msg     Incoming messag
 * @param  {String} message Message to send
 */
function sendMessage(robot, msg, message) {
  utils.logMsgData(msg, `SEND MESSAGE: ${message}`);
  let msgUsers = getMsgUsers(robot);
  let author = msg.message.user.name;
  msgUsers.forEach(function (sendUser) {
    if (sendUser !== author) {
      utils.logMsgData(msg, `SEND MESSAGE TO "${sendUser}", MSG: "${author}: ${message}"`)
      robot.messageRoom(`@${sendUser}`, `*${author}*: ${message}`);
    }
  });
}

/**
 * Get the array of message users from Redis brain
 * @param  {Object} robot Hubot object
 * @return {Array}        User array
 */
function getMsgUsers(robot) {
  let brainData = robot.brain.get(REDIS_BRAIN_KEY);
  if (!Array.isArray(brainData.users)) {
    return new Error(`Invalid data recieved from redis brain! Expected array but recieved ${typeof(brainData.users)}`);
  }
  if (brainData.users.length === 0) {
    return new Error('No users in brain!');
  }
  return brainData.users;
}

/**
 * Get the data from Redis brain
 * @param  {Object} robot Hubot Object
 * @return {Object}       Brain data
 */
function getBrainData(robot) {
  return robot.brain.get(REDIS_BRAIN_KEY);
}

/**
 * Add a user to the message list in Redis brainData
 * @param {Object}  robot Hubot Object
 * @param  {Object} msg   Incoming messag
 * @param {String}  user  Username
 */
function addMsgUser(robot, msg, user) {
  let brainData = getBrainData(robot);
  let users = brainData.users;
  if (users.indexOf(user) === -1) {
    msg.send(`Adding user: "${user}"`);
    users.push(user);
    robot.brain.set(REDIS_BRAIN_KEY, brainData);
    let message = `_${user} had joined the party :party-parrot:_`;
    sendMessage(robot, msg, message);
    robot.messageRoom(`@${user}`, `You've been added to badgerboats, welcome here!`);
  } else {
    msg.send(`"${user}" is already on the list`);
  }
}

/**
 * Remove a user from the message list in Redis brain
 * @param  {Object} robot Hubot object
 * @param  {String} user  Username
 */
function removeMsgUser(robot, msg, user) {
  let brainData = getBrainData(robot);
  let users = brainData.users;
  let index = users.indexOf(user);
  if (index === -1) {
    return msg.send(`"${user}" is not on the list!`);
  } else {
    users.splice(index, 1);
    robot.messageRoom(`@${user}`, `You've been removed from badgerboats, see ya l8tr m8!`);
    return msg.send(`Removed "${user}" from the list`);
  }
}

/**
 * Get the array of message admins from Redis brain
 * @param  {Object} robot Hubot object
 * @return {Array}        User array
 */
function getAdmins(robot) {
  let brainData = getBrainData(robot);
  if (!Array.isArray(brainData.admins)) {
    return new Error(`Invalid data recieved from redis brain! Expected array but recieved ${typeof(brainData)}`);
  }
  if (brainData.admins.length === 0) {
    return new Error('No users in brain!');
  }
  return brainData.admins;
}

/**
 * Add a user to the list of adminUser
 * @param {Object} robot Hubot Object
 * @param {String} user  Username
 */
function addAdmin(robot, user) {
  let brainData = getBrainData(robot);
  let admins = brainData.admins;
  if (admins.indexOf(user) === -1) {
    admins.push(user);
    robot.brain.set(REDIS_BRAIN_KEY, brainData);
    robot.messageRoom(`@${user}`, `You are now an admin on badgerboats!
    Type !help in chat to get started`);
  } else {
    msg.send(`"${user}" is already an admin`);
  }
}

/**
 * Remove a user from the admin list in Redis brain
 * @param  {Object} robot Hubot object
 * @param  {String} user  Username
 */
function removeAdmin(robot, msg, user) {
  let brainData = getBrainData(robot);
  let admins = brainData.admins;
  let index = admins.indexOf(user);
  if (index === -1) {
    return msg.send(`"${user}" is not an admin!`);
  } else {
    admins.splice(index, 1);
    robot.messageRoom(`@${user}`, `You are no longer an admin`);
    return msg.send(`Removed "${user}" from the admin list`);
  }
}
