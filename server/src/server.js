const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

/* ---------- Temporary Statistics ---------- */

let totalRequests = 0;
let allowedRequests = 0;
let blockedRequests = 0;

const activeUsers = new Set();

/* ------------------------------------------ */

app.get("/", (req, res) => {

    res.json({
        status: "SentinelRL Backend Running"
    });

});

app.post("/api/request", (req, res) => {

    const { userId, endpoint } = req.body;

    totalRequests++;
    allowedRequests++;

    activeUsers.add(userId);

    res.json({

        decision: "ALLOWED",

        userId,

        endpoint,

        timestamp: new Date().toLocaleTimeString()

    });

});

/* Statistics Endpoint */

app.get("/api/stats", (req, res) => {

    res.json({

        totalRequests,

        allowedRequests,

        blockedRequests,

        activeUsers: activeUsers.size

    });

});

app.listen(PORT, () => {

    console.log(`🚀 SentinelRL running on http://localhost:${PORT}`);

});