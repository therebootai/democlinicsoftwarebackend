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

const addPaymentRoutes = require("./routes/addpaymentsRoutes");
const oralFindingRoutes = require("./routes/oralFindingRoutes");
const dentalProcedureRoutes = require("./routes/dentalProcedureRoutes");
const patientMedicalHistoryRoutes = require("./routes/patientMedicalHistoryRoutes");
const chiefComplainRoutes = require("./routes/chiefComplainRoutes");
const onExaminationRoutes = require("./routes/onExaminationRoutes");
const investigationRoutes = require("./routes/investigationRoutes");
const radioagraphyRoutes = require("./routes/radioagraphyRoutes");
const advicesRoutes = require("./routes/advicesRoutes");
const medicationRoutes = require("./routes/medicationRoutes");
const clinicRoutes = require("./routes/clinicRouter");
const stockRouter = require("./routes/stockRouter");

app.use(cors());
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/temp/" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/api/user", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/addpayment", addPaymentRoutes);

app.use("/api/form", formRoutes);

app.use("/api/direction", directionRoutes);
app.use("/api/oralfinding", oralFindingRoutes);

app.use("/api/dentalprocedure", dentalProcedureRoutes);
app.use("/api/patientmedicalhistory", patientMedicalHistoryRoutes);
app.use("/api/chiefcomplain", chiefComplainRoutes);
app.use("/api/onexamination", onExaminationRoutes);
app.use("/api/investigation", investigationRoutes);
app.use("/api/radiography", radioagraphyRoutes);
app.use("/api/advices", advicesRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/clinic", clinicRoutes);
app.use("/api/stocks", stockRouter);

app.get("/api/", async (req, res) => {
  return res.status(200).send("Hello World! from Clinic Management Backend");
});

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
