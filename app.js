const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const MongoDbConnect = require("./connection");
const fileUpload = require("express-fileupload");
require("dotenv").config();
const port = process.env.PORT;
MongoDbConnect();
const userRoutes = require("./routes/userRoute");
const patientRoutes = require("./routes/patientRoutes");
const formRoutes = require("./routes/formRoutes");

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

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
