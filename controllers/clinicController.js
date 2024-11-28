const generateCustomId = require("../middlewares/generateCustomId");
const Clinic = require("../models/Clinic");

exports.addNewClinic = async (req, res) => {
  try {
    const { clinic_name, clinic_address } = req.body;
    if (!clinic_name || !clinic_address) {
      return res.status(400).json({
        message: "All fields are required. eg: clinic_name, clinic_address",
      });
    }
    const existingClinic = await Clinic.findOne({ clinic_name });
    if (existingClinic) {
      return res.status(400).json({ message: "Clinic name already in use" });
    }
    const clinicId = await generateCustomId(Clinic, "clinicId", "clinicId");
    const newClinic = new Clinic({
      clinicId,
      clinic_name,
      clinic_address,
    });
    const savedClinic = await newClinic.save();
    res.status(201).json(savedClinic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllClinics = async (req, res) => {
  const { clinicId } = req.query;

  try {
    let clinics;

    if (clinicId) {
      clinics = await Clinic.find({ _id: clinicId });

      if (clinics.length === 0) {
        return res.status(404).json({ message: "Clinic not found" });
      }
    } else {
      clinics = await Clinic.find({});
    }

    res.status(200).json(clinics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getClinicById = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const clinic = await Clinic.findOne({ clinicId });
    if (!clinic) {
      return res.status(404).json({ message: "No Clinic not found" });
    }
    res.status(200).json(clinic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteClinicById = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const clinic = await Clinic.findOne({ clinicId });
    if (!clinic) {
      return res.status(404).json({ message: "No Clinic not found" });
    }
    await Clinic.deleteOne({ clinicId });
    res.status(200).json({ message: "Clinic deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDropdown = async (req, res) => {
  try {
    const searchQuery = req.query.query;

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    // Fuzzy regex matching for iteamName
    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");

    const items = await Clinic.aggregate([
      {
        $match: {
          clinic_name: fuzzyRegex,
        },
      },
      {
        $limit: 30,
      },
    ]);

    res.status(200).json(items);
  } catch (error) {
    console.error("Error searching items:", error);
    res.status(500).json({
      message: "Error searching items",
      error: error.message,
    });
  }
};
