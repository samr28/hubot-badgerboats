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
    let brainData = robot.brain.get(REDIS_BRAIN_KEY);
    if (!brainData || !Array.isArray(brainData)) {
      console.log('NO PREV DATA');
      robot.brain.set(REDIS_BRAIN_KEY, [ADMIN_USER_NAME]);
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
  let isCommand = false;
  if (user.id == ADMIN_USER_ID) {
    // Add is the first word (command)
    if (message.indexOf('!add') === 0) {
      isCommand = true;
      let addUser = message.slice(5);
      // Slice off "add" to just leave the user name
      msg.send(`Adding user: "${addUser}"`);
      addMsgUser(robot, addUser);
    } else if (message.indexOf('!remove') === 0) {
      let brainData = robot.brain.get(REDIS_BRAIN_KEY);
      isCommand = true;
      let removeUser = message.slice(8);
      // Slice off "remove" to just leave the user name
      removeMsgUser(robot, msg, removeUser);
    } else if (message.indexOf('!list') === 0) {
      isCommand = true;
      msg.send(`*User list*: ${getMsgUsers(robot).join(', ')}`);
    } else if (message.indexOf('!up') === 0) {
      isCommand = true;
      msg.send(`I was started ${moment(startTime).fromNow()}`);
    }
  }
  if (!isCommand) {
    sendMessage(robot, msg, message);
  }
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
 */
function getMsgUsers(robot) {
  let brainData = robot.brain.get(REDIS_BRAIN_KEY);
  if (!Array.isArray(brainData)) {
    return new Error(`Invalid data recieved from redis brain! Expected array but recieved ${typeof(brainData)}`);
  }
  if (brainData.length === 0) {
    return new Error('No users in brain!');
  }
  return brainData;
}

/**
 * Add a user to the message list in Redis brainData
 * @param {Object} robot Hubot Object
 * @param {String} user  Username
 */
function addMsgUser(robot, user) {
  let brainData = getMsgUsers(robot);
  brainData.push(user);
  robot.brain.set(REDIS_BRAIN_KEY, brainData);
  robot.messageRoom(`@${user}`, `You've been added to badgerboats, welcome here!`);
}

/**
 * Remove a user from the message list in Redis brain
 * @param  {Object} robot Hubot object
 * @param  {String} user  Username
 */
function removeMsgUser(robot, msg, user) {
  let brainData = getMsgUsers(robot);
  let index = brainData.indexOf(user);
  msg.send(`${user} - ${brainData}`)
  if (index === -1) {
    return msg.send(`"${user}" is not on the list!`);
  }
  brainData.splice(index, 1);
  robot.messageRoom(`@${user}`, `You've been removed from badgerboats, see ya l8tr m8!`);
  return msg.send(`Removed "${user}" from the list`);

}
