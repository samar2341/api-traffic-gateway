const { getHistory } = require("../services/gatewayService");

function readHistory(req, res) {
  res.json({ requests: getHistory() });
}

module.exports = {
  readHistory,
};
