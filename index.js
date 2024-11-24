require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2; // Use v2 for the latest features
const app = express();
const port = process.env.PORT || 8000;
const cors = require('cors');
const jwt = require('jsonwebtoken');
cloudinary.config({
  cloud_name: process.env.Cloud_Name,
  api_key: process.env.Api_Key,
  api_secret: process.env.Api_Secret,
});
app.use(cors({
  origin: ["http://localhost:5173",
    "http://localhost:5174",
    "https://career-venture.web.app",
    "https://career-venture.firebaseapp.com/"


  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { appendFile } = require('fs');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pflyccd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '1y'
  })
  res.send({ token });

})
const verifyToken = (req, res, next) => {
  if (!req?.headers?.authorization) {
    return res.status(401).send({ message: 'Unauthorized Access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: 'Unauthorized Access' });
    }
    req.decoded = decoded
    next();
  })

}
async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const testimonialCollection = client.db("Career-Venture").collection("reviews");
    const userCollections = client.db("Career-Venture").collection("users");
    const jobOpeningCollection = client.db("Career-Venture").collection("jobOpenings");
    const jobApplicationCollection = client.db("Career-Venture").collection("jobApplications");
    const BootCamps = client.db("Career-Venture").collection("Bootcamps");
    const MentorsCollection = client.db("Career-Venture").collection("Mentors")
    const JoinedMembers = client.db("Career-Venture").collection(
      "JoinedMembers");
    const resourcesCollection = client.db("Career-Venture").collection("Resources");
    const newsletterSubscribers = client.db("Career-Venture").collection("newsletterSubscribers");
    const paymentCollection = client.db("Career-Venture").collection("payments");
    const wishlistCollection = client.db("Career-Venture").collection("wishlist");
    const slotsCollection = client.db("Career-Venture").collection("slotsOfMentors");
    const slotBookingCollection = client.db("Career-Venture").collection("slotBooking");
    const JobApplicationResponseCollection = client.db("Career-Venture").collection("JobApplicationResponse");
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollections.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
      next();
    }

    app.get('/testimonials', async (req, res) => {
      const cursor = testimonialCollection.find({});
      const results = await cursor.toArray();
      res.send(results);
    });
    app.get("/testimonial/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testimonialCollection.findOne(query);
      res.send(result);
    }
    );

    app.post('/testimonials', async (req, res) => {
      try {
        const newTestimonial = req.body;
        const result = await testimonialCollection.insertOne(newTestimonial);
        res.send(result);
      } catch (error) {
        console.error('Error inserting testimonial:', error);
        res.status(500).send({ message: 'Failed to submit testimonial' });
      }
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
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const cursor = userCollections.find({});
      const results = await cursor.toArray();
      res.send(results);
    }
    );

    app.patch('/users/block/:email', async (req, res) => {
      const email = req.params.email;

      // Find the user by email to determine their role
      const user = await userCollections.findOne({ email: email });

      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }


      if (user.role === 'member') {
        const update = { $set: { status: 'blocked' } };
        const result = await userCollections.updateOne({ email: email, role: 'member' }, update);
        return res.send(result); // Send result for member update
      } else if (user.role === 'mentor') {
        const update = { $set: { status: 'pending' } };
        const result = await userCollections.updateOne({ email: email, role: 'mentor' }, update);
        return res.send(result); // Send result for mentor update
      } else {
        return res.status(400).send({ message: 'Invalid role for this operation' });
      }
    });
    app.get('/users/member', async (req, res) => {
      const query = { role: "member", status: "active" };
      const cursor = userCollections.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email);

      const query = { email: email, role: "admin" };
      // console.log(query);


      const user = await userCollections.findOne(query);
      // console.log(user);

      res.send(user);
    });
    //apply for being mentor
    app.post('/mentor/apply', async (req, res) => {
      const newMentor = req.body;
      const result = await MentorsCollection.insertOne(newMentor);
      res.send(result);
    });
    app.get('/users/mentor/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email);

      const query = { email: email, role: "mentor" };
      // console.log(query);


      const user = await userCollections.findOne(query);
      // console.log(user);

      res.send(user);
    });
    // Approve mentor route
    app.patch('/user/mentor/approve/:email', async (req, res) => {
      try {
        const email = req.params.email.trim().toLowerCase();
        const query = { email: email };

        console.log('Query:', query);
        const user = await userCollections.findOne(query);
        console.log('User Found:', user); // Verify if a user is found

        if (!user) {
          return res.status(404).send({ message: 'User not found' });
        }

        const update = { $set: { role: 'mentor' } };
        const result = await userCollections.updateOne(query, update);
        // console.log('Approve Result:', result); // Debugging log

        if (result.matchedCount === 0) {
          return res.status(400).send({ message: 'No matching document found to update' });
        }

        res.send(result);
      } catch (error) {
        console.error('Error during update:', error);
        res.status(500).send({ message: 'Server error' });
      }
    });
    //get mentor details by email
    app.get('/mentors/details/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await MentorsCollection.findOne(query);
      res.send(result);
    }
    );
    //get a specific mentor details by id
    app.get('/mentors/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await MentorsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error fetching mentor:', error);
        res.status(500).send({ message: 'Failed to fetch mentor', error });
      }
    });
    //get mentors all available slots by mentor id
    app.get('/mentor/slots/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { mentor_id: id, status: 'available' };
        const cursor = slotsCollection.find(query);
        const results = await cursor.toArray();
        res.send(results);
      } catch (error) {
        console.error('Error fetching mentor slots:', error);
        res.status(500).send({ message: 'Failed to fetch mentor slots', error });
      }
    });
    //get all slots of a mentor
    app.get('/mentor/slots/all/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { mentor_id: id };
        const cursor = slotsCollection.find(query);
        const results = await cursor.toArray();
        res.send(results);
      } catch (error) {
        console.error('Error fetching mentor slots:', error);
        res.status(500).send({ message: 'Failed to fetch mentor slots', error });
      }
    });
    //edit a slot with id
    app.patch('/mentor/slots/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const update = { $set: req.body };
        const result = await slotsCollection.updateOne(query, update);
        res.send(result);
      } catch (error) {
        console.error('Error updating slot:', error);
        res.status(500).send({ message: 'Failed to update slot', error });
      }
    });
    //delete a slot with id
    app.delete('/mentor/slots/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await slotsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error deleting slot:', error);
        res.status(500).send({ message: 'Failed to delete slot', error });
      }
    });
    //add a slot for a mentor with mentor id
    app.post('/mentor/slots/:id', async (req, res) => {
      try {
        const mentorId = req.params.id;
        const newSlot = { mentor_id: mentorId, ...req.body };
        const result = await slotsCollection.insertOne(newSlot);
        res.send(result);
      } catch (error) {
        console.error('Error adding slot:', error);
        res.status(500).send({ message: 'Failed to add slot', error });
      }
    });

    //book a slot with mentor id
    app.post('/mentor/slot/book/:id', async (req, res) => {
      try {
        const mentorId = req.params.id;
        console.log('Mentor ID:', mentorId);

        const { user, slotId, date } = req.body;

        // Define the query to match the specific slot for the given mentor
        const query = {
          mentor_id: mentorId,

          status: { $ne: "booked" }, // Ensures slot is not already booked
        };

        // Update slot status to booked if available
        const update = { $set: { status: "booked" } };
        const slotUpdateResult = await slotsCollection.updateOne(query, update);

        if (slotUpdateResult.modifiedCount === 0) {
          return res.status(409).send({ message: 'Slot is already booked or does not exist' });
        }

        // Create a new booking document
        const newBooking = {
          mentor_id: mentorId,
          user: user,
          slot_id: slotId,
          date: date,
          bookedAt: new Date(),
        };

        // Insert booking into the booking collection
        const bookingResult = await slotBookingCollection.insertOne(newBooking);

        res.status(201).send({ message: 'Slot booked successfully', bookingId: bookingResult.insertedId });
      } catch (error) {
        console.error('Error booking slot:', error);
        res.status(500).send({ message: 'Failed to book slot', error: error.message });
      }
    });
    //get my booked slots with user email
    app.get('/mentor/slot/booked/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { "user.email": email }; // Wrap the nested field in quotes
        const cursor = slotBookingCollection.find(query);
        const results = await cursor.toArray();
        res.send(results);
      } catch (error) {
        console.error('Error fetching booked slots:', error);
        res.status(500).send({ message: 'Failed to fetch booked slots', error });
      }
    });



    //pay for a slot

    // Reject mentor route


    app.get('/users/member/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email);

      const query = { email: email, role: "member" };
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
    app.post('/jobOpenning', async (req, res) => {
      const newJobOpening = req.body;
      const result = await jobOpeningCollection.insertOne(newJobOpening);
      res.send(result);
    }
    );
    app.get('/jobOpenning', async (req, res) => {
      const page = parseInt(req.query.page) || 1; // Current page number
      const limit = parseInt(req.query.limit) || 10; // Number of items per page
      const skip = (page - 1) * limit; // Skip the items for pagination

      const cursor = jobOpeningCollection.find({});
      const results = await cursor.skip(skip).limit(limit).toArray(); // Apply pagination
      const totalResults = await jobOpeningCollection.countDocuments(); // Get total count

      res.send({
        totalResults,
        totalPages: Math.ceil(totalResults / limit), // Calculate total pages
        currentPage: page,
        results,
      });
    });
    app.get('/jobOpenning/:id', async (req, res) => {
      const id = req.params.id;
      // console.log(id);

      const query = { _id: new ObjectId(id) };
      const result = await jobOpeningCollection.findOne(query);
      res.send(result);
    });
    //post job application response
    app.post('/jobApplicationResponse', async (req, res) => {
      const newJobApplicationResponse = req.body;
      const result = await JobApplicationResponseCollection.insertOne(newJobApplicationResponse);
      res.send(result);
    });
    app.get('/jobApplicationResponse/:email', async (req, res) => {
      const email = req.params.email;
      const query = {
        applicantEmail
          : email
      };
      const cursor = JobApplicationResponseCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });

    app.get('/bootCamps', async (req, res) => {
      const page = parseInt(req.query.page) || 1; // Default to page 1
      const limit = parseInt(req.query.limit) || 6; // Default to 6 items per page
      const search = req.query.search || ""; // Get the search query

      const skip = (page - 1) * limit; // Calculate how many documents to skip

      // Create a search condition based on the name
      const searchCondition = search ? { name: { $regex: search, $options: 'i' } } : {};


      const totalBootCamps = await BootCamps.countDocuments(searchCondition); // Get total number of boot camps matching the search
      const totalPages = Math.ceil(totalBootCamps / limit); // Calculate total pages

      // Fetch boot camps with search, pagination, and limiting
      const bootCamps = await BootCamps.find(searchCondition)
        .skip(skip)
        .limit(limit)
        .toArray();

      res.send({
        bootCamps,
        currentPage: page,
        totalPages,
        totalBootCamps
      });
    });
    app.post('/bootCamps', async (req, res) => {
      const newBootCamp = req.body;
      try {
        const result = await BootCamps.insertOne(newBootCamp);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to add bootcamp', error });
      }
    });

    app.post('/wishlist', async (req, res) => {
      const { bootCampName, bootCampPrice, bootCampMentors, userEmail } = req.body; // Get userEmail directly from the body

      try {
        // Check if the bootcamp is already in the user's wishlist using userEmail
        const existingWishlistItem = await wishlistCollection.findOne({
          user: userEmail,  // Use userEmail to check existing wishlist
          bootCampName: bootCampName,
        });

        if (existingWishlistItem) {
          return res.status(400).json({ message: 'This bootcamp is already in your wishlist.' });
        }

        // Insert the new wishlist item into the collection
        const newWishlistItem = {
          user: userEmail,  // Store the user's email
          bootCampName,
          bootCampPrice,
          bootCampMentors,
        };

        await wishlistCollection.insertOne(newWishlistItem);

        return res.status(200).json({ message: 'Bootcamp added to your wishlist!' });
      } catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({ message: 'Server error. Please try again.' });
      }
    });
    //get wishlist items by user email
    app.get('/wishlist/:email', async (req, res) => {
      const email = req.params.email;
      const query = { user: email };
      const cursor = wishlistCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });

    app.get('/wishlist', async (req, res) => {
      const userId = req.user._id;  // Get the user ID from the token payload

      try {
        const cursor = wishlistCollection.find({ user: userId });
        const results = await cursor.toArray();
        return res.status(200).json(results);
      } catch (error) {
        console.error('Error fetching wishlist:', error);
        return res.status(500).json({ message: 'Server error. Please try again.' });
      }
    });
    app.delete('/wishlist/:id', async (req, res) => {
      const userId = req.user._id;  // Get the user ID from the token payload
      const wishlistId = req.params.id;

      try {
        const result = await wishlistCollection.deleteOne({ _id: new ObjectId(wishlistId), user: userId });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Item not found in your wishlist.' });
        }

        return res.status(200).json({ message: 'Item removed from your wishlist.' });
      } catch (error) {
        console.error('Error removing from wishlist:', error);
        return res.status(500).json({ message: 'Server error. Please try again.' });
      }
    });

    app.get('/jobApplications', async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1; // Default to 1
        const limit = parseInt(req.query.limit) || 6; // Default to 6 per page

        const query = { status: "pending" }; // Only filter by status: "pending"

        const skip = (page - 1) * limit; // Skip calculation

        const totalJobApplications = await jobApplicationCollection.countDocuments(query);
        const jobApplications = await jobApplicationCollection.find(query)
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({
          jobApplications,
          currentPage: page,
          totalPages: Math.ceil(totalJobApplications / limit),
        });
      } catch (error) {
        console.error("Error fetching job applications:", error);
        res.status(500).send({ error: "Failed to fetch job applications" });
      }
    });
    //change the status of a job application
    app.patch('/jobApplications/statusChange/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const query = { _id: new ObjectId(id) };
      const update = { $set: { status: 'reviewed' } };

      try {
        const result = await jobApplicationCollection.updateOne(query, update);
        res.send(result);
      } catch (error) {
        console.error('Error updating job application status:', error);
        res.status(500).send({ message: 'Failed to update job application status' });
      }
    });

    app.get('/jobApplications/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobApplicationCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error fetching job application:', error);
        res.status(500).send({ message: 'Failed to fetch job application', error });
      }
    });

    app.post('/jobOpenning/:id/apply', async (req, res) => {
      const jobId = req.params.id;
      const { name, email, resumeLink, portfolio, photo, phone, address } = req.body;

      // Construct application object including applicant's email, photo, and other fields
      const application = {
        applicant_name: name,
        jobId,
        email,
        resumeLink,
        portfolio,
        photo,  // Include the photo field in the application data
        appliedAt: new Date(),
        phone,
        address,
      };

      try {
        const result = await jobApplicationCollection.insertOne(application);
        res.status(201).send({ success: true, message: "Application submitted successfully", applicationId: result.insertedId });
      } catch (error) {
        console.error("Error saving application:", error);
        res.status(500).send({ success: false, message: "Failed to submit application. Please try again." });
      }
    });


    app.get('/jobOpenning/:id/applications', async (req, res) => {
      const jobId = req.params.id;
      const query = { jobId };
      const cursor = jobApplicationCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });
    //get all job applications by an email
    app.get('/jobApplications/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };  // Querying by email as a string
        const cursor = jobApplicationCollection.find(query);
        const results = await cursor.toArray();
        res.send(results);
      } catch (error) {
        console.error('Error fetching job applications:', error);
        res.status(500).send('Internal Server Error');
      }
    });
    //get my job applications with user email
    app.get('/jobApplications/user/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const cursor = jobApplicationCollection.find(query);
        const results = await cursor.toArray();
        res.send(results);
      } catch (error) {
        console.error('Error fetching job applications:', error);
        res.status(500).send('Internal Server Error');
      }
    });
    app.get('/LearnAboutBootCamp/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await BootCamps.findOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error fetching BootCamp:', error);
        res.status(500).send({ message: 'Failed to fetch BootCamp', error });
      }
    });

    app.post('/bootCamps', async (req, res) => {
      const newBootCamp = req.body;
      const result = await BootCamps.insertOne(newBootCamp);
      res.send(result);
    });
    app.get('/approvedMentors', async (req, res) => {
      const page = parseInt(req.query.page) || 1; // Get the page number from the query params, default to 1
      const limit = parseInt(req.query.limit) || 6; // Set the limit per page (default is 10)
      const skip = (page - 1) * limit; // Calculate how many documents to skip

      const query = { status: 'approved' };

      try {
        const totalMentors = await MentorsCollection.countDocuments(query); // Total number of mentors
        const mentors = await MentorsCollection.find(query).skip(skip).limit(limit).toArray(); // Apply pagination

        res.send({
          mentors,
          currentPage: page,
          totalPages: Math.ceil(totalMentors / limit), // Total pages based on mentor count and limit
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch mentors." });
      }
    });


    app.get('/pendingMentors', async (req, res) => {
      const query = { status: 'pending' };
      const cursor = MentorsCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    }
    );
    app.get('/rejectedMentors', async (req, res) => {
      const query = { status: 'rejected' };
      const cursor = MentorsCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    }
    );
    app.patch('/mentors/approve/:id', async (req, res) => {

      const query = { _id: new ObjectId(req.params.id) };
      const update = { $set: { status: 'approved' } };
      const result = await MentorsCollection.updateOne(query, update);
      res.send(result);
    }
    );
    app.patch('/mentors/reject/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const update = { $set: { status: 'rejected' } };
      const result = await MentorsCollection.updateOne(query, update);
      res.send(result);
    }
    );
    app.get('/resources', async (req, res) => {
      const page = parseInt(req.query.page) || 1; // Default to page 1
      const limit = parseInt(req.query.limit) || 6; // Default to 6 resources per page
      const skip = (page - 1) * limit;

      // Extract search term (tags) from query string
      const searchTag = req.query.search || '';

      // Create a filter to search resources based on tags if the search term is provided
      const filter = searchTag
        ? { tags: { $regex: searchTag, $options: 'i' } } // Case-insensitive search for tags
        : {}; // No filter if no search term is provided

      try {
        // Find resources that match the search criteria and paginate results
        const cursor = resourcesCollection.find(filter).skip(skip).limit(limit);
        const results = await cursor.toArray();
        const totalItems = await resourcesCollection.countDocuments(filter); // Count matching resources

        // Send response with the filtered and paginated resources
        res.send({
          resources: results,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
        });
      } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).send({ message: 'Error fetching resources' });
      }
    });
    app.get('/resources/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await resourcesCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error fetching resource:', error);
        res.status(500).send({ message: 'Failed to fetch resource', error });
      }
    });


    app.post('/resources', async (req, res) => {
      try {
        const { name, details, description, author, date, imageLink, tags, resourceLink } = req.body;

        // Adding default values for upvote, downvote, and comments
        const newResource = {
          name,
          details,
          description,
          author,
          date: date || new Date(),
          imageLink,
          tags,
          resourceLink,
          upvote: 0,
          downvote: 0,
          comments: []
        };

        const result = await resourcesCollection.insertOne(newResource);
        res.send(result);
      } catch (error) {
        console.error('Error while adding resource:', error);
        res.status(500).send({ error: 'Failed to add resource' });
      }
    });

    app.post('/resources/:id/comments', async (req, res) => {
      try {
        const resourceId = req.params.id;
        const { user, u_image, comment, date } = req.body;

        // Log the received data to verify
        // console.log("Received Data:", req.body);

        // Creating the comment object in the required structure
        const newComment = {
          user: user,            // Keeps the 'user' field as is
          u_image: u_image,      // Keeps the 'u_image' field as is
          comment: comment,      // Keeps the 'comment' field as is
          date: date,            // Keeps the 'date' field as is
        };

        const result = await resourcesCollection.updateOne(
          { _id: new ObjectId(resourceId) },
          { $push: { comments: newComment } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'Resource not found' });
        }

        // Send back the success response
        res.send({ message: 'Comment added successfully', comment: newComment });
      } catch (error) {
        console.error('Error posting comment:', error);
        res.status(500).send({ message: 'Error posting comment' });
      }
    });




    // Endpoint to fetch all comments for a specific resource
    app.get('/resources/:id/comments', async (req, res) => {
      try {
        const resourceId = req.params.id;
        const resource = await resourcesCollection.findOne({ _id: new ObjectId(resourceId) });

        if (!resource) {
          return res.status(404).send({ message: 'Resource not found' });
        }

        res.send({ comments: resource.comments || [] });
      } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).send({ message: 'Error fetching comments' });
      }
    });
    app.patch('/resources/upvote/:postId', async (req, res) => {
      try {
        const { postId } = req.params;

        const query = { _id: new ObjectId(postId) };
        const result = await resourcesCollection.updateOne(query, { $inc: { upvote: 1 } });
        if (result.modifiedCount === 1) {
          res.status(200).json({ message: 'Upvote count updated successfully' });
        } else {
          res.status(404).json({ error: 'Query document not found' });
        }
      } catch (error) {
        console.error('Error upvoting post:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // Backend API for handling downvotes
    app.patch('/resources/downvote/:postId', async (req, res) => {
      try {
        const { postId } = req.params;
        // console.log('postId:', postId);
        // console.log('postId:', postId);

        const query = { _id: new ObjectId(postId) };
        const result = await resourcesCollection.updateOne(query, { $inc: { downvote: 1 } });

        if (result.modifiedCount === 1) {
          res.status(200).json({ message: 'Downvote count updated successfully' });
        } else {
          res.status(404).json({ error: 'Query document not found' });
        }
      } catch (error) {
        console.error('Error downvoting post:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    app.get('/newsletterSubscribers', async (req, res) => {
      const cursor = newsletterSubscribers.find({});
      const results = await cursor.toArray();
      res.send(results);
    }
    );
    app.post('/newsletterSubscribers', async (req, res) => {
      const newSubscriber = req.body;
      const result = await newsletterSubscribers.insertOne(newSubscriber);
      res.send(result);
    }
    );

    ///payment related api

    app.post("/create_payment_intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',

        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret

      });
      // console.log('secret', paymentIntent.client_secret);
    }
    );
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);


      // console.log('payment info', payment);


      res.send(payment);
    })
    //approve payment status

    app.get('/payments', async (req, res) => {
      const cursor = paymentCollection.find({});
      const results = await cursor.toArray();
      res.send(results);
    });
    app.get('/payments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.findOne(query);
      res.send(result);
    });
    app.get('/payments/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = paymentCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    }
    );
    //fetch payment with Mentor id
    app.get('/payments/mentor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { mentorId: id };
      const cursor = paymentCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });

    app.put('/payments/approve/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body; // assuming the status is passed in the request body

      if (status !== 'approved') {
        return res.status(400).send({ error: 'Invalid status' });
      }

      try {
        const result = await paymentCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: 'approved' } }
        );
        if (result.modifiedCount === 0) {
          return res.status(404).send({ error: 'Payment not found' });
        }
        res.send({ message: 'Payment approved' });
      } catch (err) {
        res.status(500).send({ error: 'Failed to approve payment' });
      }
    });
    //user profile update
    app.patch('/users/update/:email', async (req, res) => {
      const email = req.params.email;
      const update = req.body;
      const query = { email: email };
      const result = await userCollections.updateOne(query, { $set: update });
      res.send(result);
    });
    app.patch("/users/admin-toggle/:email", async (req, res) => {
      const email = req.params.email;
      const { role } = req.body; // Expect 'admin' or 'user' in request body
      const query = { email: email };
      const update = { $set: { role: role } };

      try {
        const result = await userCollections.updateOne(query, update);
        res.send(result);
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).send({ message: "Failed to update user role" });
      }
    });
    //block a user
    app.patch('/users/toggleStatus/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const { status } = req.body; // Expect "blocked" or "active" in the request body

        if (!email) {
          return res.status(400).send({ message: "User email is required" });
        }
        if (!status || (status !== "blocked" && status !== "active")) {
          return res
            .status(400)
            .send({ message: "Valid status ('blocked' or 'active') is required" });
        }

        const updatedUser = await userCollections.findOneAndUpdate(
          { email },
          { $set: { status } },
          { new: true }
        );

        if (!updatedUser) {
          return res.status(404).send({ message: "User not found" });
        }

        res
          .status(200)
          .send({ message: `User ${status} successfully`, user: updatedUser });
      } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).send({ message: "Failed to update user status" });
      }
    }
    );


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


