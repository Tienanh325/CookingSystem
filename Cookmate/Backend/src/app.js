const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const apiRoutes = require("./routes");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Cookmate backend is running",
        health: "/api/health"
    });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
