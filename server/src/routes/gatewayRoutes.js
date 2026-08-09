const express = require("express");
const { handleRequest } = require("../controllers/requestController");
const { readStats } = require("../controllers/statsController");
const { readHistory } = require("../controllers/historyController");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ status: "API Traffic Gateway Backend Running" });
});

router.post("/api/request", handleRequest);
router.get("/api/stats", readStats);
router.get("/api/history", readHistory);

module.exports = router;
