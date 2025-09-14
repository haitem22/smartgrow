// Ensure dotenv is loaded first with explicit path
require('dotenv').config({ path: __dirname + '/.env' });
// console.log('Process.env after dotenv:', process.env); // Uncomment for debugging if needed

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, SensorData } = require('./bdds.js'); // Use relative path, adjust to ./models.js if renamed

const FLASK_API_URL = 'http://localhost:5000/predict';
const MQTT_TOPIC_CONTROL = 'pump/control';

const JWT_SECRET = process.env.JWT_SECRET || 'Wv9!c2P@aX8$rV7eL1#tQz6sYkM3^jH0DfBgU4nEoIiT';

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in .env file. Please set it or check .env file location.');
  process.exit(1);
} else {
  console.log('JWT_SECRET loaded successfully:', JWT_SECRET); // Confirm value
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message, err.stack);
});

const app = express();
const server = http.createServer(app);

// Enable CORS for HTTP requests
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.1.76:3000', 'http://192.168.1.76:3001'],
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.1.76:3000', 'http://192.168.1.76:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/esp32_dashboard')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// JWT authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Signup route
app.post('/api/auth/signup', async (req, res) => {
  console.log('Raw request body:', req.body); // Log raw body first
  const { name, prenom, username, password, email, city, surface_area, deviceId } = req.body; // Include email in destructuring
  console.log('Destructured fields:', { name, prenom, username, password, email, city, surface_area, deviceId }); // Log after destructuring
  console.log('User schema paths:', Object.keys(User.schema.paths)); // Verify schema
  
  try {
    if (!name || !prenom || !username || !password || !email || !city || surface_area == null || !deviceId) {
      throw new Error('All fields are required, including email');
    }
    if (isNaN(surface_area) || surface_area < 0) {
      throw new Error('Surface area must be a valid positive number');
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      prenom,
      username,
      password: hashedPassword,
      email,
      city,
      surface_area: Number(surface_area),
      deviceId,
    });
    console.log('User object before save:', user); // Debug user object
    await user.save();
    console.log('User saved:', user);

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (err) {
    console.error('Signup error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// MQTT connection
const mqttClient = mqtt.connect('mqtt://localhost:1883', {
  clientId: `node_server_${Math.random().toString(16).slice(3)}`,
  keepalive: 60,
  reconnectPeriod: 1000,
});

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker at mqtt://localhost:1883');
  mqttClient.subscribe('sensor/data', { qos: 1 }, (err) => {
    if (err) {
      console.error('Subscription error:', err);
    } else {
      console.log('Subscribed to sensor/data');
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const sensData = JSON.parse(message.toString());
    //console.log("Content:", sensData);
    const data = {
      deviceId: sensData.deviceId,
      t: sensData.temp,       
      h_air: sensData.humidity,
      h_soil: sensData.soilValue,
      h_soil_pourcentage: sensData.soilPercent
    };
    console.log('Received MQTT data:', data);
    const { h_soil, t, h_air, deviceId, h_soil_pourcentage } = data;
    try {
      
      const response = await axios.post(FLASK_API_URL, { 
      m: h_soil, 
      t: t,
      h: h_air });

      const { prediction, time } = response.data;
      console.log('Prediction from Flask API:', prediction, 'Time:', time);

      // Save sensor data to MongoDB
      const sensorData = new SensorData({
        h_soil,
        h_soil_pourcentage: data.h_soil_pourcentage,
        t,
        h_air,
        prediction,
        time: prediction === 1 ? time : null,
        deviceId,
      });
      await sensorData.save();

      io.emit('sensorData', { ...data, prediction, time: prediction === 1 ? time : null }, (client) => {
        const user = client.user;
        return user && user.deviceId === deviceId; // Filter by deviceId
      });

      const controlMessage = {
        pump: prediction === 1 ? 'ON' : 'OFF',
        duration: prediction === 1 ? time : 0,
      };
      mqttClient.publish(MQTT_TOPIC_CONTROL, JSON.stringify(controlMessage), { qos: 1 }, (err) => {
        if (err) {
          console.error('Error publishing to ESP:', err);
        } else {
          console.log('Control message sent to ESP:', controlMessage);
        }
      });
    } catch (apiError) {
      console.error('Error calling Flask API:', apiError.message);

      // Save sensor data with error
      const sensorData = new SensorData({
        h_soil: data.h_soil,
        h_soil_pourcentage: data.h_soil_pourcentage,
        t: data.t,
        h_air: data.h_air,
        prediction: null,
        time: null,
        deviceId,
      });
      await sensorData.save();

      io.emit('sensorData', { ...data, error: 'Prediction API error' }, (client) => {
        const user = client.user;
        return user && user.deviceId === deviceId;
      });
    }
  } catch (err) {
    console.error('MQTT message parsing error:', err);
    io.emit('sensorData', { error: 'Invalid MQTT data format' });
  }
});

mqttClient.on('error', (err) => {
  console.error('MQTT error:', err.message, err.stack);
});

mqttClient.on('close', () => {
  console.log('MQTT connection closed');
});

mqttClient.on('offline', () => {
  console.log('MQTT client offline');
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  socket.on('calibrate', (data) => {
    mqttClient.publish('sensor/calibrate', JSON.stringify(data));
    console.log('Calibration requested:', data);
  });
  socket.on('reset', (data) => {
    mqttClient.publish('sensor/reset', JSON.stringify(data));
    console.log('Reset requested:', data);
  });
});

// HTTP endpoint for sensor data (protected)
app.get('/sensor-data', authenticate, (req, res) => {
  res.json({ message: 'Use WebSocket for real-time data', status: 'ok' });
});

// Endpoint to fetch historical sensor data
app.get('/api/sensor-data/history', authenticate, async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 }).limit(100);
    res.json(data);
  } catch (err) {
    console.error('History error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

app.get('/api/sensor-data/history/period', authenticate, async (req, res) => {
  try {
    const { period } = req.query;
    if (!['24h', '7d', '30d'].includes(period)) {
      return res.status(400).json({ message: 'Invalid period. Use 24h, 7d, or 30d' });
    }
    const now = new Date();
    let startDate;
    if (period === '24h') {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const data = await SensorData.find({
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    console.error('Period history error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

app.get('/api/user/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -createdAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

app.put('/api/user/profile', authenticate, async (req, res) => {
  try {
    const { name, prenom, username, email, city, surface_area, devices } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Check for unique username and email (excluding current user)
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already taken' });
      }
    }
    // Update fields
    user.name = name || user.name;
    user.prenom = prenom || user.prenom;
    user.username = username || user.username;
    user.email = email || user.email;
    user.city = city || user.city;
    user.surface_area = surface_area !== undefined ? surface_area : user.surface_area;
    user.devices = devices || user.devices;
    await user.save();
    res.json({ message: 'Profile updated successfully', user: user.toObject({ transform: (doc, ret) => { delete ret.password; delete ret.createdAt; return ret; } }) });
  } catch (err) {
    console.error('Profile update error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

app.post('/predict', authenticate, async (req, res) => {
  try {
    const { deviceId, duration } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!deviceId || !user.devices.includes(deviceId)) {
      return res.status(400).json({ message: 'Invalid or unauthorized deviceId' });
    }
    if (!duration || duration <= 0 || isNaN(duration)) {
      return res.status(400).json({ message: 'Duration must be a positive number' });
    }
    // Placeholder: Simulate sending irrigation command to ESP32
    console.log(`Sending irrigation command to ${deviceId} for ${duration} minutes`);
    // Example: Send command via MQTT or ESP32 communication (implementation-specific)
    res.json({ message: 'Irrigation command sent successfully' });
  } catch (err) {
    console.error('Irrigation command error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});