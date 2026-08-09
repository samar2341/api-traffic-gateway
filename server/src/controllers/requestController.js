const { processRequest } = require("../services/gatewayService");

function handleRequest(req, res, next) {
  try {
    const response = processRequest(req.body);
    res.json(response);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleRequest,
};
