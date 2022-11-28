const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

console.log(process.env.DB_ACCESS_TOKEN);

// middle ware

app.use(cors());
app.use(express.json());

// ===verify Token====
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorize access");
  }
  const token = authHeader;
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      res.status(403).send({ message: "forbiden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster1.evach3k.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// making run function

async function run() {
  try {
    const categoryCollection = client.db("resalebd").collection("category");
    const userCollection = client.db("resalebd").collection("users");
    const productCollection = client.db("resalebd").collection("products");

    const orderCollection = client.db("resalebd").collection("orders");
    const paymentsCollection = client.db("resalebd").collection("payments");

    // get api for all category

    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
    });

    // post api for user

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get all users by query
    app.get("/users", async (req, res) => {
      const role = req.query.role;
      const query = { role: role };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // update  user data

    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          verified: true,
        },
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // Delete user

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // get admin api

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // post api for product collection
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // patch product

    app.patch("/product/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          isReported: true,
        },
      };
      const options = { upsert: true };
      const result = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // get api for advirtisment items

    app.get("/advertisItem", async (req, res) => {
      const isAdvertise = req.query.isAdvertise;

      const filter = {
        isAdvertise: Boolean(isAdvertise),
      };

      const Items = await productCollection.find(filter).toArray();

      const result = Items.filter((i) => i.paid === undefined);

      res.send(result);
    });

    // advertis Items in product api

    app.patch("/advertisItem/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          isAdvertise: true,
        },
      };

      const result = await productCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get all products of a seller

    app.get("/products", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    //get all product by query

    app.get("/reportedItems", async (req, res) => {
      const isReported = req.query.isReported;
      const query = { isReported: Boolean(isReported) };
      console.log(query);
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    // delete Reported item from the product collection

    app.delete("/reportedItems/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    // get all product of a category

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { category_id: id };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    // post all orders
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    // ===get user orders
    app.get("/allorder", async (req, res) => {
      const email = req.query.email;
      const query = { buyerEmail: email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    // get single pay product

    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });

    // delete a order
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // payment api
    app.post("/create-payment-intent", async (req, res) => {
      const product = req.body;

      const price = product.productPrice;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // post for paymment

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      // console.log(payment);
      const id = payment.productId;

      const result = await paymentsCollection.insertOne(payment);

      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const options = { upsert: true };

      const update = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      const query = { productId: id };

      const updateOrder = {
        $set: {
          paid: true,
        },
      };

      const orderUpdate = await orderCollection.updateOne(query, updateOrder);

      res.send(result);
    });

    // jwt token

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.DB_ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }
      res.status(401).send("Unauthorize access");
    });

    // the end
  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Wellcome to new server");
});

app.listen(port, () => {
  console.log("server is running");
});
