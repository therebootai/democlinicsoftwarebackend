const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const MongoDbConnect = require("./connection");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const port = process.env.PORT;
MongoDbConnect();
const userRoutes = require("./routes/userRoute");
const patientRoutes = require("./routes/patientRoutes");
const formRoutes = require("./routes/formRoutes");
const directionRoutes = require("./routes/directionRoutes");

const tempDir = path.join(__dirname, "temp");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

app.use(cors());
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/temp/" }));
app.use(express.json());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/api/user", userRoutes);

app.use("/api/patients", patientRoutes);

app.use("/api/form", formRoutes);

app.use("/api/direction", directionRoutes);

app.get("/api/", async (req, res) => {
  return res.status(200).send("Hello World! from Clinic Management Backend");
});

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
