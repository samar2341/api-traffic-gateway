const { getStats: getGatewayStats } = require("../services/gatewayService");

function readStats(req, res) {
  res.json(getGatewayStats());
}

module.exports = {
  readStats,
};
