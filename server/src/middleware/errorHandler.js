function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const message = err.message || "Unexpected gateway error.";
  res.status(400).json({ error: message });
}

module.exports = errorHandler;
