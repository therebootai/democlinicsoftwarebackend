const generateCustomId = require("../middlewares/generateCustomId");
const Patients = require("../models/patientModel");
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 300 });

// const generatepatientId = async () => {
//   const Patient = await Patients.find({}, { patientId: 1, _id: 0 }).sort({
//     patientId: 1,
//   });
//   const patientIds = Patient.map((Patient) =>
//     parseInt(Patient.patientId.replace("patientId", ""), 10)
//   );

//   let patientId = 1;
//   for (let i = 0; i < patientIds.length; i++) {
//     if (patientId < patientIds[i]) {
//       break;
//     }
//     patientId++;
//   }

//   return `patientId${String(patientId).padStart(4, "0")}`;
// };

exports.createPatients = async (req, res) => {
  try {
    const patientId = await generateCustomId(
      Patients,
      "patientId",
      "patientId"
    );

    const patientsData = { ...req.body, patientId };
    const newPatient = new Patients(patientsData);

    await newPatient.save();

    // Invalidate cache keys related to patients
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(201).json({
      message: "Patient Created Successfully",
      data: newPatient,
    });
  } catch (error) {
    console.error("Error creating Patient:", error);
    res.status(500).json({
      message: "Error creating Patient",
      error: error.message,
    });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const match = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      match.$or = [{ patientName: searchRegex }, { mobileNumber: searchRegex }];
    }

    let cacheKey = `page:${page}-limit:${limit}`;

    if (req.query.search) {
      cacheKey += `-search:${req.query.search}`;
    }

    const cachedPatients = cache.get(cacheKey);
    if (cachedPatients) {
      return res.status(200).json(cachedPatients);
    }

    const totalDocuments = await Patients.countDocuments(match);

    const pipeline = [{ $match: match }];
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const patients = await Patients.aggregate(pipeline);

    const totalPages = Math.ceil(totalDocuments / limit);

    const result = {
      page,
      totalPages,
      totalDocuments,
      data: patients,
    };

    cache.set(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching Patients:", error);
    res.status(500).json({
      message: "Error fetching Patients",
      error: error.message,
    });
  }
};
