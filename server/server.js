const express = require("express");
const cors = require("cors");
const gatewayRoutes = require("./src/routes/gatewayRoutes");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(gatewayRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 API Traffic Gateway running on http://localhost:${PORT}`);
});