const sendSuccess = (res, statusCode = 200, message = 'OK', data = null, meta = null) => {
  const body = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    body.data = data;
  }

  if (meta !== null && meta !== undefined) {
    body.meta = meta;
  }

  return res.status(statusCode).json(body);
};

const sendError = (res, statusCode = 500, message = 'Server error', details = null) => {
  const body = {
    success: false,
    message,
  };

  if (details !== null && details !== undefined) {
    body.details = details;
  }

  return res.status(statusCode).json(body);
};

module.exports = {
  sendSuccess,
  sendError,
};
