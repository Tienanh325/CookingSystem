module.exports = (statusCode, message) => Object.assign(new Error(message), { statusCode });
