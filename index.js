require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');

app.use(cors({
  origin: ["http://localhost:5173",
    "http://localhost:5174",
    "https://career-venture.vercel.app",


  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

app.use(express.json()); // Middleware to parse JSON request bodies

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pflyccd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const testimonialCollection = client.db("Career-Venture").collection("reviews");
    const userCollections = client.db("Career-Venture").collection("users"); 
    const jobOpeningCollection = client.db("Career-Venture").collection("jobOpenings");
    const jobApplicationCollection = client.db("Career-Venture").collection("jobApplications");
    const BootCamps= client.db("Career-Venture").collection("BootCamps");
    const JoinedMembers = client.db("Career-Venture").collection("JoinedMembers");

    app.get('/testimonials', async (req, res) => {
      const cursor = testimonialCollection.find({});
      const results = await cursor.toArray();
      res.send(results);
    });

    app.post('/testimonials', async (req, res) => {
      const newTestimonial = req.body;
      const result = await testimonialCollection.insertOne(newTestimonial);
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const existingUser = await userCollections.findOne(query); // Use the correct variable name

      if (existingUser) {
        res.send({ message: "User already exists", insertedId: null });
        return;
      }

      const result = await userCollections.insertOne(newUser); // Use the correct variable name
      res.send(result);
    });
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      
      const query = { email: email ,role: "admin" };
      // console.log(query);
      
  
      const user = await userCollections.findOne(query);
      // console.log(user);
      
      res.send(user);
    });
 app.get('/users/mentor/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      
      const query = { email: email ,role: "mentor" };
      // console.log(query);
      

      const user = await userCollections.findOne(query);
      // console.log(user);
      
      res.send(user);
    });
    app.get('/users/member/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      
      const query = { email: email ,role: "member" };
      // console.log(query);
      
      const user = await userCollections.findOne(query);
      // console.log(user);
      
      res.send(user);
    });
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const user = await userCollections.findOne(query);
      res.send(user);
    });
    app.post ('/jobOpenning', async (req, res) => {
      const newJobOpening = req.body;
      const result = await jobOpeningCollection.insertOne(newJobOpening);   
      res.send(result);
    }
    );
    app.get('/jobOpenning', async (req, res) => {
      const cursor = jobOpeningCollection.find({});
      const results = await cursor.toArray();
      res.send(results);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Your Career is awaiting for an adventure!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
