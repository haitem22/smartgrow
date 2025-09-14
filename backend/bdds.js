const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  password: { type: String, required: true, minlength: 6 },
  email: { type: String, required: true, trim: true, unique: true, lowercase: true },
  city: { type: String, required: true, trim: true },
  surface_area: { type: Number, required: true, min: 0 },
  devices: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const sensorDataSchema = new mongoose.Schema({
  h_soil: { type: Number, required: true },
  h_soil_pourcentage: { type: Number, required: true },
  t: { type: Number, required: true },
  h_air: { type: Number, required: true },
  prediction: { type: Number, enum: [0, 1] }, 
  time: { type: Number, default: null },
  deviceId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const SensorData = mongoose.model('SensorData', sensorDataSchema);

module.exports = { User, SensorData };