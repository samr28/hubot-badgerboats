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

const REDIS_BRAIN_KEY = "badgerboats";
// Notified on bot start. Can be users or channels (make sure to use @|#)
const NOTIFY_GROUPS = ['@sam'];
const ADMIN_USER_NAME = process.env.HUBOT_ADMIN_USER_NAME | 'sam';
const ADMIN_USER_ID = process.env.HUBOT_ADMIN_USER_ID | 1;

// ================================================================================================
// Module exports
// ================================================================================================
module.exports = function (robot) {
  let version = require('../package.json').version;
  let startTime = new Date();

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
    if (message.indexOf('add') === 0) {
      isCommand = true;
      let addUser = message.slice(4);
      // Slice off "add" to just leave the user name
      msg.send(`Adding user: "${addUser}"`);
      addMsgUser(robot, addUser);
    } else if (message.indexOf('remove') === 0) {

    } else if (message.indexOf('list') === 0) {
      isCommand = true;
      let brainData = robot.brain.get(REDIS_BRAIN_KEY);
      msg.send(brainData);
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
    utils.logMsgData(msg, `SEND MESSAGE TO "${sendUser}", MSG: "${author}: ${message}"`)
    robot.messageRoom(`@${sendUser}`, `${author}: ${message}`);
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
}

/**
 * Remove a user from the message list in Redis brain
 * @param  {Object} robot Hubot object
 * @param  {String} user  Username
 */
function removeMsgUser(robot, user) {
  let brainData = getMsgUsers(robot);
  let index = brainData.indexOf(user);
  if (index === -1) {
    return msg.send(`"${user}" is not on the list!`);
  }
  brainData.splice(index, 1);
  return msg.send(`Removed "${user}" from the list`);
}
