const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const MongoDbConnect = require("./connection");
const fileUpload = require("express-fileupload");
require("dotenv").config();
const port = process.env.PORT;
MongoDbConnect();

const patientRoutes = require("./routes/patientRoutes");

app.use(cors());

app.use(express.json());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/api/patients", patientRoutes);

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
