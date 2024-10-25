const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment-timezone');
const exceljs = require('exceljs');

const app = express();
const PORT = 3008;
const JWT_SECRET = 'your_jwt_secret_key'; // Secure this in an env file

const dbPath = path.join(__dirname, 'admitSpot.db');
let db = null;

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize Database and Server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create tables after establishing DB connection
    await createTables();

    app.listen(PORT, () => {
      console.log(`Server Running at http://localhost:${PORT}/`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Helper Function to Create Tables if not exists
const createTables = async () => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      isVerified BOOLEAN DEFAULT FALSE,
      resetCode TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      timezone TEXT,
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      isDeleted BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);
  // console.log('Tables created');
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    // console.log('Authenticated user:', req.user.id);
    next();
  });
};

// --- USER AUTHENTICATION APIS ---

app.get('/get', async(req,res)=>{
    console.log("Accessing APIs")
    res.send("APIs accessing")
})

// User Registration
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  console.log("coming to register API")
  try {
    // Checking if the user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists." });
    }

    // Hashing the password 
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    await db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);

    // TODO: Send email verification link (not implemented)

    // Send success response
    res.status(201).json({ message: "User registered successfully! Please verify your email." });
  } catch (error) {
    console.error("Error in /register:", error.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});


// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// --- CONTACT MANAGEMENT APIS ---

// Add Contact
app.post(
  '/contacts',
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional(),
    body('address').optional(),
    body('timezone').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, address, timezone } = req.body;

    try {
      await db.run(
        'INSERT INTO contacts (name, email, phone, address, timezone, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, phone, address, timezone, req.user.id]
      );
      res.status(201).json({ message: 'Contact added successfully' });
    } catch (e) {
      res.status(500).json({ error: 'Email already exists' });
    }
  }
);

// Retrieve Contacts with Filters and Sorting
app.get('/contacts', authenticateToken, async (req, res) => {
  const { name, email, timezone } = req.query;
  console.log("coming to contacts...")
  let query = 'SELECT * FROM contacts WHERE isDeleted = 0 AND user_id = ?';
  const params = [req.user.id];
  console.log("params--",params)

  if (name) {
    query += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  if (email) {
    query += ' AND email LIKE ?';
    params.push(`%${email}%`);
  }
  if (timezone) {
    query += ' AND timezone LIKE ?';
    params.push(`%${timezone}%`);
  }

  try {
    const contacts = await db.all(query, params);
    res.json(contacts);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve contacts' });
  }
});

// Update Contact
app.put('/contacts/:id', authenticateToken, async (req, res) => {
  const { name, email, phone, address, timezone } = req.body;

  try {
    await db.run(
      'UPDATE contacts SET name = ?, email = ?, phone = ?, address = ?, timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, email, phone, address, timezone, req.params.id, req.user.id]
    );
    res.json({ message: 'Contact updated successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Soft Delete Contact
app.delete('/contacts/:id', authenticateToken, async (req, res) => {
  try {
    await db.run('UPDATE contacts SET isDeleted = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Contact deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// --- FILE HANDLING: CSV UPLOAD AND DOWNLOAD ---

// CSV File Upload
const upload = multer({ dest: 'uploads/' });
app.post('/contacts/upload', authenticateToken, upload.single('file'), (req, res) => {
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'File upload is required' });

  const contacts = [];

  fs.createReadStream(file.path)
    .pipe(csv())
    .on('data', (row) => {
      contacts.push(row);
    })
    .on('end', async () => {
      for (const contact of contacts) {
        try {
          await db.run(
            'INSERT INTO contacts (name, email, phone, address, timezone, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [contact.name, contact.email, contact.phone, contact.address, contact.timezone, req.user.id]
          );
        } catch (e) {
          return res.status(500).json({ error: 'Failed to upload contacts' });
        }
      }
      res.json({ message: 'Contacts uploaded successfully' });
    });
});

// CSV File Download
app.get('/contacts/download', authenticateToken, async (req, res) => {
  const contacts = await db.all('SELECT * FROM contacts WHERE user_id = ? AND isDeleted = 0', [req.user.id]);

  const workbook = new exceljs.Workbook();
  const worksheet = workbook.addWorksheet('Contacts');

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 20 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Timezone', key: 'timezone', width: 30 },
    { header: 'Created At', key: 'created_at', width: 30 },
  ];

  worksheet.addRows(contacts);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=contacts.xlsx');

  return workbook.xlsx.write(res).then(() => {
    res.status(200).end();
  });
});

// Delete Tables (For Development)
app.delete('/delete-tables', async (req, res) => {
  try {
    await db.exec('DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS contacts;');
    res.json({ message: 'Tables deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tables.' });
  }
});


module.exports = app
