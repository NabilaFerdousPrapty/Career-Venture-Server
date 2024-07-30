require('dotenv').config()
const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');

app.use(cors(
  {
      origin: ["http://localhost:5173",
         
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
))

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    const testimonialCollection = client.db("Career-Venture").collection("reviews");
    const userCollections= client.db("Career-Venture").collection("users");
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
      const result = await userCollections.insertOne(newUser);
      res.send(result);
    });
    
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Your Career is awaiting for an adventure!')
    }
)
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
    }
)
