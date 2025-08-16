const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000
require('dotenv').config();
const { ObjectId } = require('mongodb')

const admin = require("firebase-admin");
const serviceAccount = require("./token.json");

// Middleware
const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Mongodb
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ixrdttt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const verifyFireBaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  }
  catch (error) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
}

async function run() {
  try {
    const database = client.db("Restaurant");
    const resCollection = database.collection("Tops")

    const orderDatabase = client.db("Restaurant");
    const orderCollection = orderDatabase.collection("orders")
// patch

app.patch('/allfoods/:id', async (req, res) => {
    const id = parseInt(req.params.id); 
    try {
        const result = await resCollection.updateOne(
            { _id: id }, 
            { $inc: {
purchaseCount: 1 } } 
        );
        res.send(result);
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).send({ message: 'Failed to update purchase count'});
}
});
    // Top
    app.get('/tops', async (req, res) => {
      const result = await resCollection.find({
        purchaseCount: { $exists: true }
      }).sort({
        purchaseCount: -1
      }).limit(6).toArray();
      res.send(result)
    })

   

app.get('/allfoods', async (req, res) => {
  const { searchParams, sort } = req.query;
  let query = {};

  // Search
  if (searchParams) {
    query = { name: { $regex: searchParams, $options: "i" } };
  }

  let sortQuery;

  // 
  if (sort === 'asc') {
    sortQuery = { price: 1 }; // Low to High
  } else if (sort === 'desc') {
    sortQuery = { price: -1 }; // High to Low
  } else {
    // Default: purchaseCount descending
    sortQuery = { purchaseCount: -1 };
  }

  const result = await resCollection.find(query).sort(sortQuery).toArray();
  res.send(result);
});





    // details
    app.get('/allfoods/:id', async (req, res) => {
      const id = parseInt(req.params.id);

      const query = { _id: id }
      const result = await resCollection.findOne(query);
      res.send(result)
    })

    // Add food
    app.post('/allfoods', verifyFireBaseToken, async (req, res) => {
      const newRecipe = req.body;
      const email = req.body.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      if (!email) {
        return res.status(400).send({ error: 'email is required' });
      }
      const result = await resCollection.insertOne(newRecipe)
      res.send(result)
      console.log(result)
    })

    // My Food
    app.get('/myfoods', verifyFireBaseToken, async (req, res) => {
      const email = req.query.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      if (!email) {
        return res.status(400).send({ error: 'email is required' });
      }
      const userFoods = await resCollection.find({ email }).toArray();
      res.send(userFoods)
    })

    // DELETE
    app.delete('/myfoods/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const result = await resCollection.deleteOne({ _id: id });
      res.send(result);
    });

    // Update Recipe
    app.put('/myfoods/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const updatedFood = req.body;

      const result = await resCollection.updateOne(
        { _id: id },
        { $set: updatedFood }
      );

      res.send(result);
    });

    // Order
    app.post('/orders', verifyFireBaseToken, async (req, res) => {
      const newOrder = req.body;
      const email = newOrder.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      if (!email) {
        return res.status(400).send({ error: 'email is required' });
      }
      const result = await orderCollection.insertOne(newOrder)
      res.send(result)
      console.log(result)
    })

    // My orders
    app.get('/orders', verifyFireBaseToken, async (req, res) => {
      const email = req.query.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      if (!email) {
        return res.status(400).send({ error: 'email is required' });
      }
      const userOrders = await orderCollection.find({ email }).toArray();
      res.send(userOrders)
    })

    // DELETE 
    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const result = await orderCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

   
  


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Optional cleanup
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
