const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;
//const port = 6000;
const jwt = require('jsonwebtoken');

// MongoDB connection URL
const uri =
  'mongodb+srv://SupremeNoble:IfCYhze6HMFC2xbC@noblecluster0.dgriaa9.mongodb.net';

// Create a new MongoClient
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to MongoDB
client
  .connect()
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Define database and collection names
const db = client.db('VMS');
const usersCollection = db.collection('users'); 
const residentsCollection = db.collection('residents');
const visitorsCollection = db.collection('visitors');

function login(username, password) {
    return usersCollection.findOne({ username })
      .then((user) => {
        if (user) {
          if (user.password === password) {
            // Check if the user is an admin
            if (user.role === 'admin') {
              // Fetch all users if the user is an admin
              return { isAdmin: true, user };
            }
            
            return { isAdmin: false, user }; // Successful login for a non-admin user
          } else {
            throw new Error('Invalid password');
          }
        }
  
        // Check in the dbUsers array for testing purposes //Deprecated
        const testUser = dbUsers.find((dbUser) => dbUser.username === username && dbUser.password === password);
        if (testUser) {
          return { isAdmin: false, user: testUser };
        }
  
        throw new Error('User not found');
      });
}

function AdminRegister(username, password, name, email, role, building, apartment, phone) {
    return usersCollection
      .findOne({ $or: [{ username }, { email }] }) // Check if username or email already exists
      .then((existingUser) => {
        if (existingUser) {
          console.log('Username or email already exists');
          throw new Error('Username or email already exists'); // Throw an error if username or email is already taken
        }
  
        const newUser = {
          username,
          password,
          name,
          email,
          role,
        };
  
        return usersCollection
          .insertOne(newUser)
          .then(() => {
            if (role === 'resident') {
              const residentData = {
                name,
                building,
                apartment,
                phone,
              };
              return residentsCollection.insertOne(residentData); // Add resident data to residentsCollection
            }
          })
          .then(() => {
            return 'User registered successfully';
          })
          .catch((error) => {
            throw new Error('Error registering user');
          });
      });
}

function register(username, password, name, email, building, apartment, phone) {
    const role = 'resident'; // Set the role to 'resident'
  
    return usersCollection
      .findOne({ $or: [{ username }, { email }] }) // Check if username or email already exists
      .then((existingUser) => {
        if (existingUser) {
          console.log('Username or email already exists');
          throw new Error('Username or email already exists'); // Throw an error if username or email is already taken
        }
  
        const newUser = {
          username,
          password,
          name,
          email,
          role,
        };
  
        return usersCollection
          .insertOne(newUser)
          .then(() => {
            //if (role === 'resident') {
              const residentData = {
                name,
                building,
                apartment,
                phone,
              };
              return residentsCollection.insertOne(residentData); // Add resident data to residentsCollection
            //}
          })
          .then(() => {
            return 'User registered successfully';
          })
          .catch((error) => {
            throw new Error('Error registering user');
          });
      });
}

function generateToken(userData) {
    const token = jwt.sign(userData, 'ApartmentSuperPassword');
    return token;
}
  
function verifyToken(req, res, next) {
    let header = req.headers.authorization;
    console.log(header);
  
    let token = header.split(' ')[1];
  
    jwt.verify(token, 'ApartmentSuperPassword', function (err, decoded) {
      if (err) {
        res.send('Invalid Token');
      }
  
      req.user = decoded;
      next();
    });
}

// Front page
app.get('/', (req,res) => {
    res.send('Welcome to BENR3433 Residences!')
})
  
// Apply JSON middleware
app.use(express.json());

// User registration
app.post('/userRegister', (req, res) => {

    const { username, password, name, email, role, building, apartment, phone } = req.body;
  
    register(username, password, name, email, role, building, apartment, phone)
      .then(() => {
        res.send('User registered successfully');
      })
      .catch((error) => {
        res.status(500).send('Error registering user');
      });
});

// Admin registration
app.post('/AdminRegister', verifyToken, (req, res) => {
    // Check if the user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Only admin can register users.');
    }
  
    const { username, password, name, email, role, building, apartment, phone } = req.body;
  
    AdminRegister(username, password, name, email, role, building, apartment, phone)
      .then(() => {
        res.send('User registered successfully');
      })
      .catch((error) => {
        res.status(500).send('Error registering user');
      });
});

// User login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    login(username, password)
      .then((result) => {
        let token = generateToken(result.user);
        //console.log('User details:', user);
        //res.send(token);

        // If user is an admin, fetch users
        if (result.isAdmin) {
          return usersCollection.find().toArray().then((users) => {
            // Return both the token and users data
            return { token, users };
          });
        }

        // If not an admin, return only the token
        return { token };
      })
      .then((result) => {
        // Send the combined response
        res.json(result);
      })
      .catch((error) => {
        res.status(401).send(error.message);
      });
});

// Create a visitor
app.post('/visitorRegister', verifyToken, (req, res) => {
    const { name, contact, gender } = req.body;
  
    // Generate a random 8-digit number for accesspass
    const accesspass = Math.floor(10000000 + Math.random() * 90000000);
  
    const visitorData = {
      accesspass: accesspass.toString(),
      name,
      contact,
      gender,
      building: null,
      apartment: null,
      whomtovisit: null,
      entryTime: null,
      checkoutTime: null
    };
  
    residentsCollection
      .findOne({ name: req.user.name }) // Find the resident's information by searching the user's name in residentsCollection
      .then((resident) => {
        if (resident) {
          visitorData.building = resident.building;
          visitorData.apartment = resident.apartment;
          visitorData.whomtovisit = resident.name; // Assuming resident's name is whom to visit
        }
  
        return visitorsCollection.insertOne(visitorData);
      })
      .then(() => {
        res.send(visitorData);
      })
      .catch((error) => {
        console.error('Error creating visitor:', error);
        res.status(500).send('An error occurred while creating the visitor');
      });
});

// View visitors
app.get('/visitors', verifyToken, (req, res) => {
    const userRole = req.user.role;
    const userName = req.user.name;
  
    if (userRole === 'admin') {
      visitorsCollection
        .find()
        .toArray()
        .then((visitors) => {
          if (visitors.length === 0) {
            res.send('No visitors found');
          } else {
            res.send(visitors);
          }
        })
        .catch((error) => {
          console.error('Error retrieving visitors:', error);
          res.status(500).send('An error occurred while retrieving visitors');
        });
    } else {
      visitorsCollection
        .find({ whomtovisit: userName })
        .project({ _id: 0,entryTime: 0, checkoutTime: 0 })
        .toArray()
        .then((visitors) => {
          if (visitors.length === 0) {
            res.send('You do not have any visitors registered');
          } else {
            res.send(visitors);
          }
        })
        .catch((error) => {
          console.error('Error retrieving visitors:', error);
          res.status(500).send('An error occurred while retrieving visitors');
        });
    }
});

// Visitor access info
app.get('/visitorAccess', (req, res) => {
    const contact = req.body.contact;
  
    visitorsCollection
      .find({ contact })
      .project({ _id: 0,entryTime: 0, checkoutTime: 0 })
      .toArray()
      .then((visitors) => {
        if (visitors.length === 0) {  
          res.send('No visitors found with the given contact number');
        } else {
          res.send(visitors);
        }
      })
      .catch((error) => {
        console.error('Error retrieving visitors by contact:', error);
        res.status(500).send('An error occurred while retrieving visitors by contact');
      });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
  