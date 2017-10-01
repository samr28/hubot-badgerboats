// ================================================================================================
// Module dependencies
// ================================================================================================

// ================================================================================================
// Module exports
// ================================================================================================
module.exports = {
  checkError          : checkError,
  checkUserSlackAdmin : checkUserSlackAdmin,
  logMsgData          : logMsgData
};

function checkError(value) {
  return value instanceof Error;
}

function checkUserSlackAdmin(msg) {
  return true;
  let user = msg.message.user;
  return user.is_admin;
}

/**
 * Log message info and extraData
 *
 * @param {Object}  msg         Incoming message
 * @param {String}  extraData   Any extra data to log
 */
function logMsgData(msg, extraData) {
  let now = new Date();
  console.log(`[${now}] ${msg.message.user.name}: '${msg.message}' && ${extraData}`);
}
