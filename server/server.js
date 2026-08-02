const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

app.get("/", (req, res) => {
    res.json({
        message: "SentinelRL Backend Running"
    });
});

app.post("/api/request", (req, res) => {

    const { userId, endpoint } = req.body;

    res.json({
        status: "ALLOWED",
        userId,
        endpoint,
        timestamp: new Date().toISOString()
    });

});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});