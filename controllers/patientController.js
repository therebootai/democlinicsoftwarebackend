const generateCustomId = require("../middlewares/generateCustomId");
const Prescriptions = require("../models/prescriptionModel");
const Patients = require("../models/patientModel");
const NodeCache = require("node-cache");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const generateNestedCustomId = require("../middlewares/ganerateNestedCustomId");
const cache = new NodeCache({ stdTTL: 300 });
const User = require("../models/User");
const fs = require("fs");
const path = require("path");
const fastcsv = require("fast-csv");

const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequenceValue: { type: Number, required: true },
});

const Counter = mongoose.model("Counter", counterSchema);

const getNextSequenceValue = async (sequenceName) => {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.sequenceValue;
};

const generatePatientId = async () => {
  let isUnique = false;
  let patientId = "";

  while (!isUnique) {
    // Get the next unique sequence value for the patient ID
    const sequenceValue = await getNextSequenceValue("patientId");
    patientId = `patientId${String(sequenceValue).padStart(4, "0")}`;

    // Check if the generated patientId already exists in the database
    const existingPatient = await Patients.findOne({ patientId });
    if (!existingPatient) {
      isUnique = true;
    }
  }

  return patientId;
};

const generateNestedDocumentId = async (Model, patientId) => {
  try {
    // Find the patient by patientId and get the patientDocuments array
    const patient = await Model.findOne(
      { patientId },
      { patientDocuments: 1, _id: 0 }
    );

    if (!patient || !patient.patientDocuments) {
      throw new Error("Patient or patient documents not found.");
    }

    // Extract existing document IDs from the patientDocuments array
    const ids = patient.patientDocuments
      .map((doc) => {
        const customId = doc.documentId;
        if (customId && customId.startsWith("DOC")) {
          // Extract the numeric part from the documentId (e.g., DOC0001 -> 1)
          const numericId = parseInt(customId.replace("DOC", ""), 10);
          if (!isNaN(numericId)) {
            return numericId;
          }
        }
        return null;
      })
      .filter((id) => id !== null); // Remove any null values

    // Sort the IDs to find the next available ID
    ids.sort((a, b) => a - b);

    // Generate the next available document ID
    let newId = 1;
    if (ids.length > 0) {
      // Increment the largest existing ID
      for (let i = 0; i < ids.length; i++) {
        if (newId < ids[i]) {
          break;
        }
        newId++;
      }
    }

    // Return the new document ID with the "DOC" prefix
    return `DOC${String(newId).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating document ID:", error);
    throw new Error("Error generating document ID");
  }
};

// create patient
exports.createPatients = async (req, res) => {
  try {
    const patientId = await generateCustomId(
      Patients,
      "patientId",
      "patientId"
    );

    const {
      prescriptions,
      medicalHistory = [],
      clinicId,
      ...patientData
    } = req.body;

    const prescriptionIds = [];
    if (prescriptions && prescriptions.length > 0) {
      for (let prescription of prescriptions) {
        const newPrescription = new Prescriptions(prescription);
        const savedPrescription = await newPrescription.save();
        prescriptionIds.push(savedPrescription._id);
      }
    }

    const processedMedicalHistory = medicalHistory.map((historyItem) => ({
      medicalHistoryName: historyItem.medicalHistoryName,
      duration: historyItem.duration || "",
      medicalHistoryMedicine: historyItem.medicines || [],
    }));

    const newPatient = new Patients({
      ...patientData,
      patientId,
      clinicId,
      prescriptions: prescriptionIds,
      medicalHistory: processedMedicalHistory,
    });

    await newPatient.save();

    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(201).json({
      message: "Patient Created Successfully",
      data: newPatient,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Patient already exists.",
      });
    }
    console.error("Error creating Patient:", error);
    res.status(500).json({
      message: "Error creating Patient",
      error: error.message,
    });
  }
};

// get all functionm
exports.getPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const match = {};
    let latestFollowupdateFilter = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      match.$or = [
        { patientId: searchRegex },
        { patientName: searchRegex },
        { mobileNumber: searchRegex },
      ];
    }

    if (req.query.startdate || req.query.enddate) {
      const startDate = req.query.startdate
        ? new Date(req.query.startdate)
        : null;
      const endDate = req.query.enddate ? new Date(req.query.enddate) : null;

      if (startDate && endDate) {
        endDate.setHours(23, 59, 59, 999);

        match.$or = [
          { createdAt: { $gte: startDate, $lte: endDate } },
          { latestFollowupdate: { $gte: startDate, $lte: endDate } },
        ];
        latestFollowupdateFilter = {
          latestFollowupdate: { $gte: startDate, $lte: endDate },
        };
      } else if (startDate) {
        const endOfDay = new Date(startDate);
        endOfDay.setHours(23, 59, 59, 999);

        match.$or = [
          { createdAt: { $gte: startDate, $lte: endOfDay } },
          { latestFollowupdate: { $gte: startDate, $lte: endOfDay } },
        ];
        latestFollowupdateFilter = {
          latestFollowupdate: { $gte: startDate, $lte: endOfDay },
        };
      }
    }

    if (req.query.doctorId) {
      match.chooseDoctor = req.query.doctorId;
    }

    if (req.query.clinicId) {
      match.clinicId = req.query.clinicId;
    }

    if (req.query.doctorId) {
      latestFollowupdateFilter.chooseDoctor = req.query.doctorId;
    }

    if (req.query.clinicId) {
      latestFollowupdateFilter.clinicId = req.query.clinicId;
    }

    let cacheKey = `page:${page}-limit:${limit}`;

    if (req.query.startdate) {
      cacheKey += `-startdate:${req.query.startdate}`;
    }
    if (req.query.enddate) {
      cacheKey += `-enddate:${req.query.enddate}`;
    }

    if (req.query.search) {
      cacheKey += `-search:${req.query.search}`;
    }

    if (req.query.doctorId) {
      cacheKey += `-doctorId:${req.query.doctorId}`;
    }

    if (req.query.clinicId) {
      cacheKey += `-clinicId:${req.query.clinicId}`;
    }

    const cachedPatients = cache.get(cacheKey);
    if (cachedPatients) {
      return res.status(200).json(cachedPatients);
    }

    const latestFollowupdateCount = await Patients.countDocuments(
      latestFollowupdateFilter
    );

    const sortOrder =
      req.query.appointmentdate &&
      req.query.appointmentdate.toLowerCase() === "false"
        ? 1
        : -1;

    const totalDocuments = await Patients.countDocuments(match);
    const patients = await Patients.find(match)
      .sort({ appointmentdate: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("prescriptions");

    // Fetch doctor details for each patient if chooseDoctor exists
    const patientsWithDoctorDetails = await Promise.all(
      patients.map(async (patient) => {
        const patientObj = patient.toObject();

        if (patientObj.chooseDoctor) {
          const doctor = await User.findOne({
            userId: patientObj.chooseDoctor,
          }).select("name phone email role designation doctorDegree");

          if (doctor) {
            patientObj.chooseDoctorDetails = {
              name: doctor.name,
              phone: doctor.phone,
              email: doctor.email,
              role: doctor.role,
              designation: doctor.designation,
              doctorDegree: doctor.doctorDegree,
            };
          }
        }
        return patientObj;
      })
    );
    const totalPrescriptions = patientsWithDoctorDetails.reduce(
      (total, patient) => {
        return (
          total + (patient.prescriptions ? patient.prescriptions.length : 0)
        );
      },
      0
    );

    const totalPages = Math.ceil(totalDocuments / limit);

    const result = {
      page,
      totalPages,
      totalDocuments,
      totalPrescriptions,
      latestFollowupdateCount,
      data: patientsWithDoctorDetails,
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

exports.getPatientByPatientId = async (req, res) => {
  const { patientId } = req.params;
  const { prescriptionId, tccardId } = req.query;

  try {
    // Fetch patient data and populate the prescriptions field
    const patient = await Patients.findOne({ patientId })
      .populate({
        path: "prescriptions",
        options: { sort: { createdAt: -1 } }, // Sort prescriptions by createdAt in descending order
      })
      .populate({
        path: "patientTcCard",
        options: { sort: { createdAt: -1 } }, // Sort patientTcCard by createdAt in descending order
      });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    let filteredPatient = patient.toObject();

    if (filteredPatient.chooseDoctor) {
      const doctor = await User.findOne({
        userId: filteredPatient.chooseDoctor,
      }).select("name phone email role designation doctorDegree");

      if (doctor) {
        // Add doctor details to the patient object
        filteredPatient.chooseDoctorDetails = {
          name: doctor.name,
          phone: doctor.phone,
          email: doctor.email,
          role: doctor.role,
          designation: doctor.designation,
          doctorDegree: doctor.doctorDegree,
        };
      }
    }

    if (tccardId) {
      filteredPatient.patientTcCard = filteredPatient.patientTcCard.filter(
        (tcCard) => tcCard.tcCardId === tccardId
      );

      // If no matching TC Card is found, return a 404 error
      if (filteredPatient.patientTcCard.length === 0) {
        return res.status(404).json({ message: "TC Card not found" });
      }
    }

    if (prescriptionId) {
      filteredPatient.prescriptions = filteredPatient.prescriptions.filter(
        (prescription) => prescription._id.toString() === prescriptionId
      );

      // Check if the specific prescription is found
      if (filteredPatient.prescriptions.length === 0) {
        return res.status(404).json({ message: "Prescription not found" });
      }
    }

    res.status(200).json(filteredPatient);
  } catch (error) {
    console.error("Error fetching patient data:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// patient data update
exports.updatePatients = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { checkedMedicalHistory = [], uncheckedMedicalHistoryNames = [] } =
      req.body;

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    // Find the patient document by patientId
    const patient = await Patients.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Remove unchecked items from existing medicalHistory
    patient.medicalHistory = patient.medicalHistory.filter((entry) => {
      const shouldKeep = !uncheckedMedicalHistoryNames.includes(
        entry.medicalHistoryName
      );

      return shouldKeep;
    });

    // Update or add checked items in medical history
    checkedMedicalHistory.forEach((newEntry) => {
      const existingEntry = patient.medicalHistory.find(
        (entry) => entry.medicalHistoryName === newEntry.medicalHistoryName
      );

      if (existingEntry) {
        // Update existing entry in medical history
        existingEntry.medicalHistoryMedicine = [
          ...new Set([
            ...existingEntry.medicalHistoryMedicine,
            ...newEntry.medicalHistoryMedicine,
          ]),
        ]; // Use Set to avoid duplicate medicines
        existingEntry.duration = newEntry.duration || existingEntry.duration;
      } else {
        // Add new entry if it doesn't exist
        patient.medicalHistory.push(newEntry);
      }
    });

    // Update other fields dynamically, excluding `paymentDetails` and `patientDocuments`
    for (const key in req.body) {
      if (
        key !== "medicalHistory" &&
        key !== "checkedMedicalHistory" &&
        key !== "uncheckedMedicalHistoryNames" &&
        key !== "paymentDetails" &&
        key !== "patientDocuments"
      ) {
        if (
          typeof req.body[key] === "object" &&
          !Array.isArray(req.body[key])
        ) {
          patient[key] = { ...patient[key], ...req.body[key] }; // Merge objects
        } else {
          patient[key] = req.body[key]; // Direct update for primitive values
        }
      }
    }

    // Optional cache invalidation (if necessary)
    try {
      const cacheKeysToInvalidate = cache
        .keys()
        .filter(
          (key) => key.includes("allPrescriptions") || key.includes("page:")
        );
      cacheKeysToInvalidate.forEach((key) => cache.del(key));
    } catch (cacheError) {
      console.warn("Cache invalidation failed:", cacheError);
    }

    // Save the updated patient data
    await patient.save();

    // Send success response
    res.status(200).json({
      message: "Patient's data updated successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Error updating Patient:", error);
    res.status(500).json({
      message: "Error updating Patient",
      error: error.message,
    });
  }
};

// add more array item , under prescription more item are create like if oralfinding have one array if want create two array then create once function
exports.patientPrescriptionUpdate = async (req, res) => {
  try {
    const { patientId, prescriptionId } = req.params;
    const updatedData = req.body;
    const prescriptionPdf = req.files ? req.files.prescriptionPdf : null;

    const patient = await Patients.findOne({ patientId }).populate(
      "prescriptions"
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const prescription = patient.prescriptions.find(
      (prescription) => prescription._id.toString() === prescriptionId
    );

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found for this patient",
      });
    }

    // Update fields one by one, handling nested arrays
    if (updatedData.chiefComplain) {
      prescription.chiefComplain = prescription.chiefComplain.map(
        (existingItem) => {
          const updatedItem = updatedData.chiefComplain.find(
            (newItem) =>
              newItem.chiefComplainName === existingItem.chiefComplainName
          );
          if (updatedItem && updatedItem.dentalChart) {
            return {
              ...existingItem,
              dentalChart: updatedItem.dentalChart,
            };
          }
          return existingItem;
        }
      );

      // Add new items that don't already exist
      prescription.chiefComplain = [
        ...prescription.chiefComplain,
        ...updatedData.chiefComplain.filter(
          (newItem) =>
            !prescription.chiefComplain.some(
              (existingItem) =>
                existingItem.chiefComplainName === newItem.chiefComplainName
            )
        ),
      ];
    }

    if (updatedData.onExamination) {
      prescription.onExamination = prescription.onExamination.map(
        (existingItem) => {
          const updatedItem = updatedData.onExamination.find(
            (newItem) =>
              newItem.onExaminationName === existingItem.onExaminationName
          );
          if (updatedItem && updatedItem.dentalChart) {
            return {
              ...existingItem,
              dentalChart: updatedItem.dentalChart,
            };
          }
          return existingItem;
        }
      );

      // Add new items that don't already exist
      prescription.onExamination = [
        ...prescription.onExamination,
        ...updatedData.onExamination.filter(
          (newItem) =>
            !prescription.onExamination.some(
              (existingItem) =>
                existingItem.onExaminationName === newItem.onExaminationName
            )
        ),
      ];
    }

    if (updatedData.investigation) {
      prescription.investigation = [
        ...prescription.investigation,
        ...updatedData.investigation.filter(
          (newItem) =>
            !prescription.investigation.some(
              (existingItem) =>
                existingItem.investigationName === newItem.investigationName
            )
        ),
      ];
    }

    if (updatedData.radiography) {
      // Update dentalChart for matching radiography items
      prescription.radiography = prescription.radiography.map(
        (existingItem) => {
          const updatedItem = updatedData.radiography.find(
            (newItem) =>
              newItem.radiographyName === existingItem.radiographyName
          );
          if (updatedItem && updatedItem.dentalChart) {
            return {
              ...existingItem,
              dentalChart: updatedItem.dentalChart,
            };
          }
          return existingItem;
        }
      );

      // Add new radiography items that don't already exist
      prescription.radiography = [
        ...prescription.radiography,
        ...updatedData.radiography.filter(
          (newItem) =>
            !prescription.radiography.some(
              (existingItem) =>
                existingItem.radiographyName === newItem.radiographyName
            )
        ),
      ];
    }

    if (updatedData.advices) {
      // Update dentalChart for matching advices items
      prescription.advices = prescription.advices.map((existingItem) => {
        const updatedItem = updatedData.advices.find(
          (newItem) => newItem.advicesName === existingItem.advicesName
        );
        if (updatedItem && updatedItem.dentalChart) {
          return {
            ...existingItem,
            dentalChart: updatedItem.dentalChart,
          };
        }
        return existingItem;
      });

      // Add new advices items that don't already exist
      prescription.advices = [
        ...prescription.advices,
        ...updatedData.advices.filter(
          (newItem) =>
            !prescription.advices.some(
              (existingItem) => existingItem.advicesName === newItem.advicesName
            )
        ),
      ];
    }

    if (updatedData.medications) {
      prescription.medications = [
        ...prescription.medications,
        ...updatedData.medications.filter(
          (newItem) =>
            !prescription.medications.some(
              (existingItem) =>
                existingItem.medicineBrandName === newItem.medicineBrandName &&
                existingItem.medicineComposition === newItem.medicineComposition
            )
        ),
      ];
    }
    if (updatedData.followupdate) {
      prescription.followupdate = updatedData.followupdate;
    }

    if (prescriptionPdf) {
      if (prescription.prescriptionPdf?.public_id) {
        try {
          await deleteFile(prescription.prescriptionPdf.public_id);
        } catch (error) {
          console.error("Error deleting old PDF file:", error);
          return res.status(500).json({
            message: "Error deleting the old PDF file before upload.",
            error: error.message,
          });
        }
      }

      if (prescriptionPdf.mimetype !== "application/pdf") {
        return res
          .status(400)
          .json({ message: "Uploaded file is not a valid PDF" });
      }

      let uploadedFile = null;
      if (prescriptionPdf.tempFilePath) {
        uploadedFile = await uploadFile(
          prescriptionPdf.tempFilePath,
          prescriptionPdf.mimetype
        );

        if (uploadedFile.error) {
          return res.status(500).json({
            message: "Error uploading new PDF file",
            error: uploadedFile.error,
          });
        }

        fs.unlink(prescriptionPdf.tempFilePath, (err) => {
          if (err) {
            console.error("Error deleting temp file:", err);
          }
        });

        prescription.prescriptionPdf = {
          secure_url: uploadedFile.secure_url,
          public_id: uploadedFile.public_id,
        };
      }
    } else if (!prescription.prescriptionPdf?.secure_url) {
      prescription.prescriptionPdf = {
        secure_url: "",
        public_id: "",
      };
    }

    const savedPrescription = await Prescriptions.findByIdAndUpdate(
      prescriptionId,
      {
        $set: { ...updatedData, prescriptionPdf: prescription.prescriptionPdf },
      },
      { new: true }
    );

    res.status(200).json({
      message: "Prescription updated successfully",
      data: savedPrescription,
    });
  } catch (error) {
    console.error("Error editing prescription:", error);
    res.status(500).json({
      message: "Error editing prescription",
      error: error.message,
    });
  }
};

// Update Patient with New Prescriptions Using prescriptionId create prescription part for patient
exports.updatePatientWithPrescription = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { prescriptions } = req.body;

    if (!Array.isArray(prescriptions) || prescriptions.length === 0) {
      return res
        .status(400)
        .json({ message: "Prescription data must be a non-empty array" });
    }

    const prescriptionIds = [];

    for (const prescriptionData of prescriptions) {
      // Check if prescriptionData is a valid object
      if (!prescriptionData || typeof prescriptionData !== "object") {
        return res
          .status(400)
          .json({ message: "Each prescription must be a valid object" });
      }

      // Create a new object to explicitly define the fields without IDs
      const filteredPrescriptionData = {
        chiefComplain: prescriptionData.chiefComplain
          ? prescriptionData.chiefComplain.map((item) => ({
              chiefComplainName: item.chiefComplainName || "",
              dentalChart: Array.isArray(item.dentalChart)
                ? item.dentalChart
                : [],
            }))
          : [],
        onExamination: prescriptionData.onExamination
          ? prescriptionData.onExamination.map((item) => ({
              onExaminationName: item.onExaminationName || "",
              onExaminationArea: item.onExaminationArea || [],
              onExaminationAdditionalNotes:
                item.onExaminationAdditionalNotes || "",
              dentalChart: item.dentalChart || [],
            }))
          : [],
        investigation: prescriptionData.investigation
          ? prescriptionData.investigation.map((item) => ({
              investigationName: item.investigationName || "",
            }))
          : [],
        radiography: prescriptionData.radiography
          ? prescriptionData.radiography.map((item) => ({
              radiographyName: item.radiographyName || "",
              dentalChart: item.dentalChart || [],
            }))
          : [],
        advices: prescriptionData.advices
          ? prescriptionData.advices.map((item) => ({
              advicesName: item.advicesName || "",
              dentalChart: item.dentalChart || [],
            }))
          : [],
        medications: prescriptionData.medications
          ? prescriptionData.medications.map((item) => ({
              medicineBrandName: item.medicineBrandName || "",
              medicineComposition: item.medicineComposition || "",
              medicineStrength: item.medicineStrength || "",
              medicineDose: item.medicineDose || "",
              medicineFrequency: item.medicineFrequency || "",
              medicineTiming: item.medicineTiming || "",
              medicineDuration: item.medicineDuration || "",
              medicineStartfrom: item.medicineStartfrom || "",
              medicineInstructions: item.medicineInstructions || "",
              medicineQuantity: item.medicineQuantity || "",
            }))
          : [],
        referDoctor: prescriptionData.referDoctor
          ? prescriptionData.referDoctor.map((item) => ({
              referDoctor: item.referDoctor || "",
            }))
          : [],
        followupdate: prescriptionData.followupdate || undefined,
        prescriptionPdf: prescriptionData.prescriptionPdf || undefined,
      };

      try {
        // Save the new prescription document
        const newPrescription = new Prescriptions(filteredPrescriptionData);
        const savedPrescription = await newPrescription.save();
        prescriptionIds.push(savedPrescription._id);
      } catch (saveError) {
        console.error("Error saving individual prescription:", saveError);
        return res.status(500).json({
          message: "Error saving prescription to database",
          error: saveError.message,
        });
      }
    }

    // Update the patient's prescriptions array after saving all prescriptions
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId },
      { $push: { prescriptions: { $each: prescriptionIds } } },
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.status(200).json({
      message: "Prescription data added successfully",
      data: updatedPatient,
      prescriptionIds: prescriptionIds,
    });
  } catch (error) {
    console.error("Error updating patient with prescription:", error);
    res.status(500).json({
      message: "Error updating patient with prescription",
      error: error.message,
    });
  }
};

// delete any of the array element like if oral finding have two array then if want then one is delete
exports.deleteSubdocumentEntry = async (req, res) => {
  try {
    const { patientId, prescriptionId, subdocument, customId } = req.params;

    if (!patientId || !prescriptionId || !subdocument || !customId) {
      return res.status(400).json({
        message:
          "Patient ID, Prescription ID, Subdocument type, and Custom ID are required",
      });
    }

    const customIdFieldMap = {
      medications: "medicationId",
      vitals: "vitalsId",
      oralFinding: "oralFindingId",
      dentalProcedure: "dentalProcedureId",
      medicalHistory: "medicalHistoryId",
      symptoms: "symptomId",
      diagnosis: "diagnosisId",
      referDoctor: "referDoctorId",
    };

    const customIdField = customIdFieldMap[subdocument];
    if (!customIdField) {
      return res.status(400).json({
        message: "Invalid subdocument type",
      });
    }

    const patient = await Patients.findOne({ patientId }).populate(
      "prescriptions"
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const prescription = patient.prescriptions.find(
      (prescription) => prescription.prescriptionId === prescriptionId
    );
    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const subdocumentArray = prescription[subdocument];
    const initialLength = subdocumentArray.length;

    prescription[subdocument] = subdocumentArray.filter(
      (item) => item[customIdField] !== customId
    );

    if (prescription[subdocument].length === initialLength) {
      return res
        .status(404)
        .json({ message: `${subdocument} entry not found` });
    }
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    await prescription.save();

    res.status(200).json({
      message: `${subdocument} entry deleted successfully`,
      data: prescription,
    });
  } catch (error) {
    console.error("Error deleting subdocument entry:", error);
    res.status(500).json({
      message: "Error deleting subdocument entry",
      error: error.message,
    });
  }
};
// if patient have two prescription or more if wANT ANY onw are delete then one have delte function
exports.deletePatientPrescription = async (req, res) => {
  try {
    const { patientId, prescriptionId } = req.params;

    if (!patientId || !prescriptionId) {
      return res.status(400).json({
        message: "Patient ID and Prescription ID are required",
      });
    }

    const patient = await Patients.findOne({ patientId }).populate(
      "prescriptions"
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const prescriptionToDelete = patient.prescriptions.find(
      (p) => p.prescriptionId === prescriptionId
    );

    if (!prescriptionToDelete) {
      return res.status(404).json({
        message: "Prescription not found for this patient",
      });
    }

    patient.prescriptions = patient.prescriptions.filter(
      (p) => p.prescriptionId !== prescriptionId
    );
    await patient.save();

    const deletedPrescription = await Prescriptions.findOneAndDelete({
      prescriptionId: prescriptionId,
    });

    if (!deletedPrescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Prescription deleted successfully",
      data: deletedPrescription,
    });
  } catch (error) {
    console.error("Error deleting prescription:", error);
    res.status(500).json({
      message: "Error deleting prescription",
      error: error.message,
    });
  }
};
// full one patient are delete
exports.deletePatients = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        message: "Patient ID is required",
      });
    }

    const patientToDelete = await Patients.findOne({ patientId }).lean();
    if (!patientToDelete) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    const prescriptionIds = patientToDelete.prescriptions;

    const deletedPatient = await Patients.findOneAndDelete({ patientId });

    await Prescriptions.deleteMany({ _id: { $in: prescriptionIds } });

    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Patient and associated prescriptions deleted successfully",
      data: deletedPatient,
    });
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({
      message: "Error deleting patient",
      error: error.message,
    });
  }
};
//Add Patient Document
exports.addPatientDocument = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({
        message: "Patient ID is required",
      });
    }
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }
    if (!req.body.title) {
      return res.status(400).send("Title is required.");
    }

    const documentId = await generateNestedDocumentId(Patients, patientId);
    let uploadedFile = req.files.file;
    const uploadResult = await uploadFile(
      uploadedFile.tempFilePath,
      uploadedFile.mimetype
    );
    const newDocumentData = {
      documentId,
      documentTitle: req.body.title,
      publicId: uploadResult.public_id,
      documentFile: uploadResult.secure_url,
    };
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId: patientId },
      { $push: { patientDocuments: newDocumentData } },
      { new: true }
    );

    if (!updatedPatient) {
      return res.status(400).json({ message: "Error adding document" });
    }

    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: `document added successfully`,
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error adding patient document:", error);
    res.status(500).json({
      message: "Error adding patient document",
      error: error.message,
    });
  }
};
//Update Patient Document
exports.updatePatientDocument = async (req, res) => {
  try {
    const { patientId, documentId } = req.params;

    if (!patientId || !documentId) {
      return res.status(400).json({
        message: "Patient ID and Document ID are required",
      });
    }

    // Find the patient and document to retrieve the current publicId
    const patient = await Patients.findOne(
      { patientId, "patientDocuments.documentId": documentId },
      { "patientDocuments.$": 1 } // Only get the matching document
    );

    if (!patient || !patient.patientDocuments.length) {
      return res.status(404).json({ message: "Patient or document not found" });
    }

    // Retrieve the existing publicId
    const existingDocument = patient.patientDocuments[0];
    const existingPublicId = existingDocument.publicId;

    let updatedData = {};

    // If a title is provided, add it to updatedData
    if (req.body.title) {
      updatedData.documentTitle = req.body.title;
    }

    // If a new file is provided, delete the old one and upload the new one
    if (req.files && req.files.file) {
      // Delete the old file using the existing publicId
      if (existingPublicId) {
        await deleteFile(existingPublicId);
      }

      // Upload the new file and add to updatedData
      let uploadedFile = req.files.file;
      const uploadResult = await uploadFile(
        uploadedFile.tempFilePath,
        uploadedFile.mimetype
      );
      updatedData.publicId = uploadResult.public_id;
      updatedData.documentFile = uploadResult.secure_url;
    }

    // Update the document with the new data
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId: patientId, "patientDocuments.documentId": documentId },
      {
        $set: {
          "patientDocuments.$[doc].documentTitle": updatedData.documentTitle,
          "patientDocuments.$[doc].publicId": updatedData.publicId,
          "patientDocuments.$[doc].documentFile": updatedData.documentFile,
        },
      },
      {
        arrayFilters: [{ "doc.documentId": documentId }],
        new: true,
      }
    );
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));
    res.status(200).json({
      message: "Document updated successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error updating patient document:", error);
    res.status(500).json({
      message: "Error updating patient document",
      error: error.message,
    });
  }
};
//Delete Patient Document
exports.deletePatientDocument = async (req, res) => {
  try {
    const { patientId, documentId } = req.params;

    if (!patientId || !documentId) {
      return res.status(400).json({
        message: "Patient ID and Document ID are required",
      });
    }

    // Find the patient and document to retrieve the current publicId
    const patient = await Patients.findOne(
      { patientId, "patientDocuments.documentId": documentId },
      { "patientDocuments.$": 1 } // Only get the matching document
    );

    if (!patient || !patient.patientDocuments.length) {
      return res.status(404).json({ message: "Patient or document not found" });
    }

    // Retrieve the publicId of the document to be deleted
    const documentToDelete = patient.patientDocuments[0];
    const publicId = documentToDelete.publicId;

    // Delete the file using the publicId
    if (publicId) {
      await deleteFile(publicId);
    }

    // Remove the document from the patientDocuments array
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId },
      { $pull: { patientDocuments: { documentId } } },
      { new: true }
    );

    if (!updatedPatient) {
      return res.status(400).json({ message: "Error deleting document" });
    }

    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Document deleted successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error deleting patient document:", error);
    res.status(500).json({
      message: "Error deleting patient document",
      error: error.message,
    });
  }
};

exports.addPaymentDetails = async (req, res) => {
  try {
    const { patientId, clinicId } = req.params;
    const { paymentMethod, paymentDetails, totalCharges, totalPaid, anyDue } =
      req.body;

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }
    if (!paymentDetails || paymentDetails.length === 0) {
      return res.status(400).json({ message: "Payment details are missing" });
    }

    // Generate a unique payment ID for this payment group
    const paymentId = await generateNestedCustomId(
      Patients,
      "paymentDetails",
      "paymentId"
    );

    // Structure the payment data with a single paymentMethod and nested payment details
    const newPaymentData = {
      paymentId,
      paymentMethod,
      totalCharges,
      totalPaid,
      anyDue,
      clinicId,
      paymentDetails: paymentDetails.map((detail) => ({
        iteamName: detail.iteamName,
        iteamCharges: detail.iteamCharges,
        paymentDescription: detail.paymentDescription,
      })),
    };

    // Push the new payment data into paymentDetails array
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId: patientId },
      { $push: { paymentDetails: newPaymentData } },
      { new: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Payment details added successfully",
      paymentId: paymentId,
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error adding payment details:", error);
    res
      .status(500)
      .json({ message: "Error adding payment details", error: error.message });
  }
};

exports.updatePaymentDetails = async (req, res) => {
  try {
    const { patientId, paymentId } = req.params;
    const { paymentDetails, totalCharges, totalPaid } = req.body;

    // Ensure patientId and paymentId are provided
    if (!patientId || !paymentId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Payment ID are required" });
    }

    // Calculate `anyDue` based on provided `totalPaid` or default to `totalCharges` if no payment made
    const calculatedTotalPaid = totalPaid
      ? Number(totalPaid)
      : Number(totalCharges);
    const anyDue = Number(totalCharges) - calculatedTotalPaid;

    // Find and update the payment record with matching `paymentId` in `paymentDetails`
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId, "paymentDetails.paymentId": paymentId },
      {
        $set: {
          "paymentDetails.$.paymentDetails": paymentDetails,
          "paymentDetails.$.totalCharges": totalCharges,
          "paymentDetails.$.totalPaid": calculatedTotalPaid.toString(),
          "paymentDetails.$.anyDue": anyDue.toString(),
        },
      },
      { new: true }
    );

    if (!updatedPatient) {
      return res
        .status(404)
        .json({ message: "Payment record not found for update" });
    }

    res.status(200).json({
      message: "Payment details updated successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error updating payment details:", error);
    res.status(500).json({
      message: "Error updating payment details",
      error: error.message,
    });
  }
};

exports.addnewTCCard = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { tcCardDetails, tccardPdf, tcTypeOfWork } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    if (
      !tcCardDetails ||
      !Array.isArray(tcCardDetails) ||
      tcCardDetails.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "TC Card details are missing or invalid" });
    }

    if (
      !tcTypeOfWork ||
      !Array.isArray(tcTypeOfWork) ||
      tcTypeOfWork.length === 0 ||
      tcTypeOfWork.some(
        (work) =>
          !work.typeOfWork || !work.tcamount || !Array.isArray(work.dentalChart)
      )
    ) {
      return res.status(400).json({
        message:
          "TC Type of Work details are missing, invalid, or dentalChart is not an array",
      });
    }

    let uploadedFile = null;
    if (tccardPdf && tccardPdf.tempFilePath) {
      uploadedFile = await uploadFile(
        tccardPdf.tempFilePath,
        tccardPdf.fileType
      );
      if (uploadedFile.error) {
        return res.status(500).json({
          message: "Error uploading file",
          error: uploadedFile.error,
        });
      }
      // After the file is uploaded, delete the temporary file
      fs.unlink(tccardPdf.tempFilePath, (err) => {
        if (err) {
          console.error("Error deleting the temp file:", err);
        } else {
          console.log("Temporary file deleted successfully.");
        }
      });
    }

    const totalPayment = tcTypeOfWork.reduce((sum, details) => {
      const amount = parseFloat(details.tcamount) || 0;
      return sum + amount;
    }, 0);

    // Generate a unique TC Card ID
    const tcCardId = await generateNestedCustomId(
      Patients,
      "patientTcCard",
      "tcCardId"
    );

    // Structure the TC Card data
    const newTCCard = {
      tcCardId,
      patientTcworkTypeDetails: tcTypeOfWork.map((details) => ({
        typeOfWork: details.typeOfWork,
        tcamount: details.tcamount,
        dentalChart: details.dentalChart,
      })),
      patientTcCardDetails: tcCardDetails.map((detail) => ({
        typeOfWork: detail.typeOfWork,
        tc: detail.tc,
        stepDone: detail.stepDone,
        nextAppointment: detail.nextAppointment,
        nextStep: detail.nextStep,
        payment: detail.payment,
        due: detail.due,
        paymentMethod: detail.paymentMethod,
        comment: detail.comment,
      })),
      totalPayment: totalPayment.toString(),
      tccardPdf: uploadedFile
        ? {
            secure_url: uploadedFile.secure_url,
            public_id: uploadedFile.public_id,
          }
        : {
            secure_url: tccardPdf?.secure_url || null,
            public_id: tccardPdf?.public_id || null,
          },
    };

    // Push the new TC Card into patientTcCard array
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId },
      { $push: { patientTcCard: newTCCard } },
      { new: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.status(200).json({
      message: "TC Card added successfully",
      tcCardId,
      data: updatedPatient.patientTcCard,
    });
  } catch (error) {
    console.error("Error adding TC Card:", error);
    res
      .status(500)
      .json({ message: "Error adding TC Card", error: error.message });
  }
};

exports.updateTCCard = async (req, res) => {
  try {
    const { patientId, tcCardId } = req.params;
    const { tcCardDetails, tcTypeOfWork } = req.body;
    const tccardPdf = req.files?.tccardPdf;

    if (!patientId || !tcCardId) {
      return res
        .status(400)
        .json({ message: "Patient ID and TC Card ID are required" });
    }

    const patient = await Patients.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const tcCard = patient.patientTcCard.find(
      (card) => card.tcCardId === tcCardId
    );

    if (!tcCard) {
      return res.status(404).json({ message: "TC Card not found" });
    }

    // If a new PDF file is uploaded, delete the old one first
    if (tccardPdf) {
      // Check if an existing PDF is present and delete it
      if (tcCard.tccardPdf?.public_id) {
        try {
          await deleteFile(tcCard.tccardPdf.public_id);
        } catch (error) {
          console.error("Error deleting old PDF file:", error);
          return res.status(500).json({
            message: "Error deleting the old PDF file before upload.",
            error: error.message,
          });
        }
      }

      // Upload the new PDF
      if (tccardPdf.mimetype !== "application/pdf") {
        return res
          .status(400)
          .json({ message: "Uploaded file is not a valid PDF" });
      }

      let uploadedFile = null;

      if (tccardPdf.tempFilePath) {
        uploadedFile = await uploadFile(
          tccardPdf.tempFilePath,
          tccardPdf.mimetype
        );

        if (uploadedFile.error) {
          return res.status(500).json({
            message: "Error uploading new PDF file",
            error: uploadedFile.error,
          });
        }

        // Delete the temporary file from the local file system after upload
        fs.unlink(tccardPdf.tempFilePath, (err) => {
          if (err) {
            console.error("Error deleting the temp file:", err);
          }
        });

        // Update the TC card with the new PDF URL and public_id
        tcCard.tccardPdf = {
          secure_url: uploadedFile.secure_url,
          public_id: uploadedFile.public_id,
        };
      }
    }
    if (tcTypeOfWork && Array.isArray(tcTypeOfWork)) {
      tcCard.patientTcworkTypeDetails = tcTypeOfWork.map((details) => ({
        typeOfWork: details.typeOfWork,
        tcamount: details.tcamount,
        dentalChart: details.dentalChart,
      }));
      tcCard.totalPayment = tcTypeOfWork.reduce((sum, details) => {
        const amount = parseFloat(details.tcamount) || 0;
        return sum + amount;
      }, 0);
    }

    // Update the TC Card details (other fields like typeOfWork, payment, etc.)
    if (tcCardDetails && Array.isArray(tcCardDetails)) {
      tcCard.patientTcCardDetails = tcCardDetails.map((detail) => ({
        stepDone: detail.stepDone,
        nextAppointment: detail.nextAppointment,
        nextStep: detail.nextStep,
        payment: detail.payment,
        due: detail.due,
        paymentMethod: detail.paymentMethod,
        comment: detail.comment,
      }));
    }

    // Save the updated patient document with the modified TC Card
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId },
      { $set: { patientTcCard: patient.patientTcCard } },
      { new: true }
    );

    if (!updatedPatient) {
      return res.status(500).json({ message: "Error updating TC Card" });
    }

    const updatedTcCard = updatedPatient.patientTcCard.find(
      (card) => card.tcCardId === tcCardId
    );

    res.status(200).json({
      message: "TC Card updated successfully",
      data: updatedTcCard,
    });
  } catch (error) {
    console.error("Error updating TC Card:", error);
    res
      .status(500)
      .json({ message: "Error updating TC Card", error: error.message });
  }
};

exports.deleteTCCard = async (req, res) => {
  try {
    const { patientId, tcCardId } = req.params;

    if (!patientId || !tcCardId) {
      return res
        .status(400)
        .json({ message: "Patient ID and TC Card ID are required" });
    }

    // Find the patient by patientId
    const patient = await Patients.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the TC Card to be deleted
    const tcCard = patient.patientTcCard.find(
      (card) => card.tcCardId === tcCardId
    );

    if (!tcCard) {
      return res.status(404).json({ message: "TC Card not found" });
    }

    if (tcCard.tccardPdf && tcCard.tccardPdf.public_id) {
      const publicId = tcCard.tccardPdf.public_id;

      const deleteResult = await deleteFile(publicId);
      if (deleteResult.result !== "ok") {
        return res.status(500).json({
          message: "Error deleting the file from Cloudinary",
          error: deleteResult,
        });
      }
    }

    // Remove the TC Card from the patient's record
    patient.patientTcCard = patient.patientTcCard.filter(
      (card) => card.tcCardId !== tcCardId
    );

    // Save the updated patient document
    const updatedPatient = await patient.save();

    res.status(200).json({
      message: "TC Card deleted successfully",
      data: updatedPatient.patientTcCard,
    });
  } catch (error) {
    console.error("Error deleting TC Card:", error);
    res
      .status(500)
      .json({ message: "Error deleting TC Card", error: error.message });
  }
};

exports.createPatientsFromCSV = async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({
      message: "No file uploaded. Please upload a CSV file.",
    });
  }

  const file = req.files.file;
  const filePath = path.join(__dirname, "../temp", file.name);
  let duplicateCount = 0; // Initialize duplicate counter

  try {
    await file.mv(filePath);

    const patientPromises = [];

    fs.createReadStream(filePath)
      .pipe(fastcsv.parse({ headers: true, skipEmptyLines: true }))
      .on("data", async (row) => {
        try {
          const patientId = await generatePatientId();

          const {
            patientName,
            mobileNumber,
            gender,
            age,
            location,
            chooseDoctor,
            address,
            city,
            pinCode,
            priority,
            clinicId,
          } = row;

          // Check if the patient with the same mobileNumber already exists
          const existingPatient = await Patients.findOne({ mobileNumber });

          if (existingPatient) {
            duplicateCount++;

            return;
          }

          const prescriptions = [];
          const prescriptionIds = [];

          if (prescriptions.length > 0) {
            for (let prescription of prescriptions) {
              const newPrescription = new Prescriptions(prescription);
              const savedPrescription = await newPrescription.save();
              prescriptionIds.push(savedPrescription._id);
            }
          }

          const newPatient = new Patients({
            patientId,
            patientName,
            mobileNumber,
            gender,
            age,
            location,
            chooseDoctor,
            address,
            city,
            pinCode,
            priority,
            clinicId,
            prescriptions: prescriptionIds,
            medicalHistory: [],
          });

          patientPromises.push(newPatient.save());
        } catch (error) {
          console.error(`Error processing patient record: ${error.message}`);
        }
      })
      .on("end", async () => {
        try {
          const savedPatients = await Promise.all(patientPromises);

          const cacheKeysToInvalidate = cache
            .keys()
            .filter(
              (key) => key.includes("allPatients") || key.includes("page:")
            );
          cacheKeysToInvalidate.forEach((key) => cache.del(key));

          fs.unlinkSync(filePath);

          res.status(201).json({
            message: `Patients Imported Successfully. ${duplicateCount} duplicates found and skipped.`,
            data: savedPatients.length,
            duplicateCount, // Return the duplicate count
          });
        } catch (error) {
          console.error("Error saving patients:", error);
          res.status(500).json({
            message: "Error saving patients from CSV",
            error: error.message,
          });
        }
      })
      .on("error", (error) => {
        console.error("Error reading CSV file:", error);
        res.status(500).json({
          message: "Error reading CSV file",
          error: error.message,
        });
      });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      message: "Error importing patients from CSV",
      error: error.message,
    });
  }
};

exports.getPatientsForExport = async (req, res) => {
  try {
    const match = {};

    // Apply filters if provided in the query
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      match.$or = [
        { patientId: searchRegex },
        { patientName: searchRegex },
        { mobileNumber: searchRegex },
      ];
    }

    // Date filter
    if (req.query.startdate || req.query.enddate) {
      const startDate = req.query.startdate
        ? new Date(req.query.startdate)
        : null;
      let endDate = req.query.enddate ? new Date(req.query.enddate) : null;

      if (startDate && endDate) {
        endDate.setHours(23, 59, 59, 999);
        match.appointmentdate = { $gte: startDate, $lte: endDate };
      } else if (startDate) {
        const endOfDay = new Date(startDate);
        endOfDay.setHours(23, 59, 59, 999);
        match.appointmentdate = { $gte: startDate, $lte: endOfDay };
      }
    }

    // Filter by doctorId
    if (req.query.doctorId) {
      match.chooseDoctor = req.query.doctorId;
    }

    if (req.query.clinicId) {
      match.clinicId = req.query.clinicId;
    }

    const patients = await Patients.find(match)
      .sort({ appointmentdate: -1 })
      .populate("clinicId", "clinic_name clinic_address")
      .populate("prescriptions");

    // Fetch doctor details for each patient if chooseDoctor exists
    const patientsWithDoctorDetails = await Promise.all(
      patients.map(async (patient) => {
        const patientObj = patient.toObject();

        if (patientObj.chooseDoctor) {
          const doctor = await User.findOne({
            userId: patientObj.chooseDoctor,
          }).select("name phone email role designation doctorDegree");

          if (doctor) {
            patientObj.chooseDoctorDetails = {
              name: doctor.name,
              phone: doctor.phone,
              email: doctor.email,
              role: doctor.role,
              designation: doctor.designation,
              doctorDegree: doctor.doctorDegree,
            };
          }
        }
        return patientObj;
      })
    );

    // Prepare CSV or Excel format
    const csv = convertPatientsToCSV(patientsWithDoctorDetails); // Convert data to CSV format
    res.header("Content-Type", "text/csv");
    res.attachment("patients_data.csv");
    return res.send(csv);
  } catch (error) {
    console.error("Error exporting Patients:", error);
    res.status(500).json({
      message: "Error exporting Patients",
      error: error.message,
    });
  }
};

exports.getDoctorsBasedOnClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;

    // Check if the clinicId is a valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(clinicId);

    const resultArray = await Patients.aggregate([
      {
        $match: {
          clinicId: isValidObjectId
            ? new mongoose.Types.ObjectId(clinicId) // Use `new` here
            : clinicId, // Use plain string if not a valid ObjectId
        },
      },
      {
        $group: {
          _id: "$clinicId",
          doctors: { $addToSet: "$chooseDoctor" },
        },
      },
      {
        $project: {
          clinicId: "$_id",
          _id: 0,
          doctors: 1,
        },
      },
    ]);

    // Convert the result to an object
    const result = resultArray.reduce((acc, item) => {
      acc["doctors"] = item.doctors;
      return acc;
    }, {});

    res.status(200).json(result);
  } catch (error) {
    console.error("Error getting Doctors:", error);
    res.status(500).json({
      message: "Error getting Doctors",
      error: error.message,
    });
  }
};

// Helper function to convert patient data into CSV format
const convertPatientsToCSV = (patients) => {
  const headers = [
    "Patient ID",
    "Patient Name",
    "Mobile Number",
    "Gender",
    "Age",
    "Location",
    "Doctor Name",
    "Doctor Phone",
    "Doctor Email",
    "Appointment Date",
    "Clinic Name",
    "Address",
    "City",
    "Pin Code",
    "Priority",
    "Prescription Details",
    "TCCard Details",
    "Payment Details",
    "Document Details",
    "Medical History",
  ];

  const rows = patients.map((patient) => {
    const {
      patientId,
      patientName,
      mobileNumber,
      gender,
      age,
      location,
      chooseDoctorDetails,
      appointmentdate,
      clinicId,
      address,
      city,
      pinCode,
      priority,
      prescriptions,
      patientTcCard,
      paymentDetails,
      patientDocuments,
      medicalHistory,
    } = patient;

    // Format the appointment date
    const formattedAppointmentDate = appointmentdate
      ? new Date(appointmentdate).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true, // Use 12-hour format with AM/PM
        })
      : "";

    // Extract prescription details (if any)
    const prescriptionDetails = prescriptions
      ? prescriptions
          .map((prescription) => {
            const chiefComplain = prescription.chiefComplain
              ? prescription.chiefComplain
                  .map((complain) => complain.chiefComplainName)
                  .join(", ")
              : "";
            const onExamination = prescription.onExamination
              ? prescription.onExamination
                  .map((examine) => {
                    return `${
                      examine.onExaminationName
                    } (Area: ${examine.onExaminationArea.join(", ")})`;
                  })
                  .join(", ")
              : "";
            const investigations = prescription.investigation
              ? prescription.investigation
                  .map((investigation) => investigation.investigationName)
                  .join(", ")
              : "";
            const radiography = prescription.radiography
              ? prescription.radiography
                  .map((radiograph) => radiograph.radiographyName)
                  .join(", ")
              : "";
            const advices = prescription.advices
              ? prescription.advices
                  .map((advice) => advice.advicesName)
                  .join(", ")
              : "";

            // Format medications as a detailed list
            const medications = prescription.medications
              ? prescription.medications
                  .map((medication) => {
                    return `Brand: ${medication.medicineBrandName}, Composition: ${medication.medicineComposition}, Strength: ${medication.medicineStrength}, Dose: ${medication.medicineDose}, Frequency: ${medication.medicineFrequency}, Timing: ${medication.medicineTiming}, Duration: ${medication.medicineDuration}, Start From: ${medication.medicineStartfrom}, Instructions: ${medication.medicineInstructions}, Quantity: ${medication.medicineQuantity}`;
                  })
                  .join(" | ")
              : "No Medications";

            const referDoctor = prescription.referDoctor
              ? prescription.referDoctor
                  .map((refer) => refer.referDoctor)
                  .join(", ")
              : "";
            const followupDate = prescription.followupdate
              ? prescription.followupdate.toISOString()
              : "";

            // Combine all prescription details into one string
            return `Chief Complain: ${chiefComplain}; On Examination: ${onExamination}; Investigations: ${investigations}; Radiography: ${radiography}; Advices: ${advices}; Medications: ${medications}; Refer Doctor: ${referDoctor}; Follow Up Date: ${followupDate}`;
          })
          .join(" | ")
      : "No prescriptions";

    // Extract TCCard Details (if any)
    const tcCardDetails = patientTcCard
      ? patientTcCard
          .map((tcCard) => {
            return tcCard.patientTcCardDetails
              .map((tc) => {
                return `Type: ${tc.typeOfWork}, TC: ${tc.tc}, Step Done: ${tc.stepDone}, Next Appointment: ${tc.nextAppointment}, Payment: ${tc.payment}`;
              })
              .join(" | ");
          })
          .join(" | ")
      : "No TCCard Details";

    // Extract Payment Details (if any)
    const paymentDetail = paymentDetails
      ? paymentDetails
          .map((payment) => {
            return `Item: ${payment.iteamName}, Charges: ${payment.iteamCharges}, Description: ${payment.paymentDescription}`;
          })
          .join(" | ")
      : "No Payment Details";

    // Extract Document Details (if any)
    const documentDetails = patientDocuments
      ? patientDocuments
          .map((document) => {
            return `Title: ${document.documentTitle}, File: ${document.documentFile}`;
          })
          .join(" | ")
      : "No Documents";

    // Extract Medical History Details (if any)
    const medicalHistoryDetails = medicalHistory
      ? medicalHistory
          .map((history) => {
            return `${history.medicalHistoryName} (Duration: ${
              history.duration
            }, Medicines: ${history.medicalHistoryMedicine.join(", ")})`;
          })
          .join(" | ")
      : "No Medical History";

    return [
      patientId,
      patientName,
      mobileNumber,
      gender,
      age,
      location,
      chooseDoctorDetails ? chooseDoctorDetails.name : "",
      chooseDoctorDetails ? chooseDoctorDetails.phone : "",
      chooseDoctorDetails ? chooseDoctorDetails.email : "",
      formattedAppointmentDate, // Use formatted date
      clinicId ? clinicId.clinic_name : "",
      address,
      city,
      pinCode,
      priority,
      prescriptionDetails,
      tcCardDetails,
      paymentDetail,
      documentDetails,
      medicalHistoryDetails,
    ];
  });

  // Combine headers and rows into CSV string
  const csvRows = [headers.join(","), ...rows.map((row) => row.join(","))];
  return csvRows.join("\n");
};
