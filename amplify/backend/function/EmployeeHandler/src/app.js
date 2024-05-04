/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */ /*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/

const express = require("express");
const bodyParser = require("body-parser");
const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");
const { createDBConnection } = require("/opt/connection");

// declare a new express app
const app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());

// Enable CORS for all methods
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

const connection = createDBConnection("database1");

connection.connect();
app.get("/users", function (req, res) {
  let query = `select e.id, e.name as employee_name, e.email, e.role as employee_role, e.is_active, e.floor_building_id,
				LPAD(fb.floor_number, 2, '0') as floor_number, LPAD(fb.building_number, 2, '0') as building_number, c.airport_code 
				from employee as e, floor_building as fb, city as c
				where e.floor_building_id = fb.id and fb.city_id = c.id;`;
  connection.query(query, function (error, results, fields) {
    if (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json({ results });
    }
  });
});

app.get("/users/getActive", function (req, res) {
  connection.query(
    "SELECT e.id, e.name, e.email, fb.city_id FROM employee as e, floor_building as fb WHERE e.floor_building_id = fb.id and is_active = 1",
    function (error, results, fields) {
      if (error) {
        console.error("Error fetching active users:", error);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.json({ results });
      }
    }
  );
});

app.get("/users/get/:userId", function (req, res) {
  const userId = req.params.userId;
  connection.query(
    "SELECT * FROM employee WHERE id = ?",
    [userId],
    function (error, results, fields) {
      if (error) {
        console.error("Error fetching cities:", error);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.json(results);
      }
    }
  );
});

function addUserToDB(values) {
  return new Promise(function (resolve, reject) {
    let query = `INSERT INTO employee (id,name, email, role, floor_building_id) VALUES ?`;
    connection.query(query, [values], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(); // flag
      }
    });
  });
}

function fetchBuildingId(floor_number, building_number, airport_code) {
  return new Promise(function (resolve, reject) {
    let query = `select fb.id from floor_building as fb, city as c where fb.floor_number = ? and 
					fb.building_number = ? and fb.city_id = c.id and c.airport_code = ?`;
    connection.query(
      query,
      [floor_number, building_number, airport_code],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          const plainResults = JSON.parse(JSON.stringify(results));
          resolve(plainResults);
        }
      }
    );
  });
}

function getCityId(airport_code) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT id FROM city where airport_code = ?",
      [airport_code],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          if (results.length > 0) {
            resolve(results[0].id);
          } else {
            resolve(-1);
          }
        }
      }
    );
  });
}

function insertFloorBuildingId(floor_number, building_number, city_id) {
  return new Promise(function (resolve, reject) {
    let query = `insert into floor_building (floor_number, building_number, city_id) values ?`;
    const values = [[floor_number, building_number, city_id]];
    connection.query(query, [values], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        connection.query(
          "SELECT LAST_INSERT_ID()",
          function (error, results, fields) {
            if (error) {
              reject(error);
            } else {
              resolve(results[0]["LAST_INSERT_ID()"]);
            }
          }
        );
      }
    });
  });
}

app.post("/users/add", function (req, res) {
  const id = req.body.id;
  const name = req.body.name;
  const email = req.body.email;
  const role = req.body.role;
  const floor_number = req.body.floor_number;
  const building_number = req.body.building_number;
  const airport_code = req.body.airport_code;
  // const floor_building_id = req.body.floor_building_id;
  // var values = [[id,name, email, role, floor_building_id]]

  async function handleUserAdd() {
    try {
      await connection.beginTransaction();
      const floor_building_id = await fetchBuildingId(
        floor_number,
        building_number,
        airport_code
      );
      if (floor_building_id.length > 0) {
        const values = [[id, name, email, role, floor_building_id[0].id]];
        await addUserToDB(values);

        await connection.commit();
        res.status(200).json({
          success: `Successfully Added User: ${id}, ${floor_building_id[0].id}`,
        });
      } else {
        const city_id = await getCityId(airport_code);
        if (city_id === -1) {
          await connection.rollback();
          res.status(500).json({ message: "Incorrect airport_code" });
        }
        const new_added_fb = await insertFloorBuildingId(
          floor_number,
          building_number,
          city_id
        );
        // console.log(new_added_fb);
        const values = [[id, name, email, role, new_added_fb]];
        await addUserToDB(values);

        await connection.commit();
        res
          .status(200)
          .json({ success: `Successfully Added User: ${id}, ${new_added_fb}` });
      }
    } catch (err) {
      await connection.rollback();
      console.error("Error adding user:", err);
      res.status(500).json({ err, message: "Error adding user" });
    }
  }

  handleUserAdd();
});

app.delete("/users/delete/:userId", function (req, res) {
  const userId = req.params.userId;
  connection.query(
    "DELETE FROM employee WHERE id = ?",
    [userId],
    function (error, results, fields) {
      if (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.json({ success: "Delete of employee succeessful!", url: req.url });
      }
    }
  );
});

function updateUser(userId, name, role, floor_building_id) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE employee SET name = ?, role = ?, floor_building_id = ? WHERE id = ?`;
    connection.query(
      query,
      [name, role, floor_building_id, userId],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(); //flag
        }
      }
    );
  });
}

app.put("/users/update/:userId", function (req, res) {
  const userId = req.params.userId;
  const name = req.body.employee_name;
  // const email = req.body.email;
  const role = req.body.employee_role;
  const floor_number = req.body.floor_number;
  const building_number = req.body.building_number;
  const airport_code = req.body.airport_code;

  async function handleUserUpdate() {
    try {
      await connection.beginTransaction();
      const floor_building_id = await fetchBuildingId(
        floor_number,
        building_number,
        airport_code
      );
      if (floor_building_id.length > 0) {
        await updateUser(userId, name, role, floor_building_id[0].id);

        await connection.commit();
        res
          .status(200)
          .json({ success: `Successfully Updated User: ${userId}` });
      } else {
        const city_id = await getCityId(airport_code);
        if (city_id === -1) {
          await connection.rollback();
          res.status(500).json({ message: "Incorrect airport_code" });
        }
        const new_added_fb = await insertFloorBuildingId(
          floor_number,
          building_number,
          city_id
        );
        console.log(new_added_fb);
        await updateUser(userId, name, role, new_added_fb);

        await connection.commit();
        res
          .status(200)
          .json({ success: `Successfully Updated User: ${userId}` });
      }
    } catch (err) {
      console.error("Error updating user:", err);
      await connection.rollback();
      res.status(500).json({ err, message: "Error updating user" });
    }
  }

  handleUserUpdate();
});

async function toggleUserStatus(userId) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE employee SET is_active = NOT is_active WHERE id = ?`;
    connection.query(query, [userId], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(1); //flag
      }
    });
  });
}

app.put("/users/toggle-status/:userId", function (req, res) {
  const userId = req.params.userId;

  async function handleUserToggle() {
    try {
      const userToggle = await toggleUserStatus(userId);
      if (userToggle !== 1) {
        res
          .status(500)
          .json({ message: `Error deactivating employee: ${userId}` });
      }
      // const bookingToggle = await toggleUserBookingStatus(userId);
      // if (bookingToggle !== 1) {
      // 	res.status(500).json({ message: `Error deactivating bookings of employee: ${userId}` });
      // }
      res.json({ success: `Toggling Employee ${userId} successful!` });
    } catch (error) {
      res.status(500).json({ error });
    }
  }

  handleUserToggle();
});

app.get("/users/fetch-all-cities", function (req, res) {
  connection.query("SELECT * FROM city", function (error, results, fields) {
    if (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(results);
    }
  });
});

/****************************
 * Example post method *
 ****************************/

app.post("/users", function (req, res) {
  // Add your code here
  res.json({ success: "post call succeed!", url: req.url, body: req.body });
});

app.post("/users/*", function (req, res) {
  // Add your code here
  res.json({ success: "post call succeed!", url: req.url, body: req.body });
});

/****************************
 * Example put method *
 ****************************/

app.put("/users", function (req, res) {
  // Add your code here
  res.json({ success: "put call succeed!", url: req.url, body: req.body });
});

app.put("/users/*", function (req, res) {
  // Add your code here
  res.json({ success: "put call succeed!", url: req.url, body: req.body });
});

/****************************
 * Example delete method *
 ****************************/

app.delete("/users", function (req, res) {
  // Add your code here
  res.json({ success: "delete call succeed!", url: req.url });
});

app.delete("/users/*", function (req, res) {
  // Add your code here
  res.json({ success: "delete call succeed!", url: req.url });
});

app.listen(3000, function () {
  console.log("App started");
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app;
