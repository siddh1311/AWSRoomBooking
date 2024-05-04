/*
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
const Papa = require("papaparse");
const multer = require("multer");
// Set multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// declare a new express app
const app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());

let dbConnection;

// Initialize the database connection
try {
  dbConnection = createDBConnection("database1");
  dbConnection.connect();
  console.log("Database connection established successfully");
} catch (error) {
  console.error("Error connecting to database:", error);
  // If there's an error connecting to the database, terminate the application
  process.exit(1);
}

// Enable CORS for all methods
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// Middleware to check the status of the database connection before handling requests
app.use(function (req, res, next) {
  if (dbConnection) {
    // If database connection is established, proceed to handle requests
    next();
  } else {
    // If database connection is not established, return an error response
    res.status(500).json({ error: "Error connecting to database" });
  }
});

/**********************
 * Example get method *
 **********************/

app.get("/rooms", function (req, res) {
  let query = `select room.id, room.capacity, room.name, room.room_number, room.is_active as room_status, floor_building.floor_number, 
                floor_building.building_number, city.airport_code, facility.name as facility from room, 
                floor_building, city, room_facility, facility 
                where room.floor_building_id = floor_building.id 
                AND floor_building.city_id = city.id AND room_facility.room_id = room.id AND 
                room_facility.facility_id = facility.id`;
  dbConnection.query(query, function (error, results, fields) {
    if (error) {
      console.error("Error fetching rooms:", error);
      return res.status(500).json({ error, message: "Error fetching rooms" });
    } else {
      res.status(200).json({ results });
    }
  });
});

async function toggleRoomStatus(roomId) {
  return new Promise((resolve, reject) => {
    let query = `update room set is_active = NOT is_active where id = ?`;
    dbConnection.query(query, [roomId], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(1); //flag
      }
    });
  });
}

async function fetchBookingIdsForRoom(roomId) {
  return new Promise((resolve, reject) => {
    let query = `select b.id as booking_id from booking as b, room_booking as rb where b.id = rb.booking_id and rb.room_id = ?`;
    dbConnection.query(query, [roomId], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

async function toggleBookings(booking_ids) {
  return new Promise((resolve, reject) => {
    let query = `update booking set is_active = not is_active where booking.id in ?`;
    dbConnection.query(
      query,
      [[booking_ids]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(1); //flag
        }
      }
    );
  });
}

app.put("/rooms/toggle-status/:roomId", function (req, res) {
  const roomId = req.params.roomId;

  async function handleRoomToggle() {
    try {
      const roomToggle = await toggleRoomStatus(roomId);
      if (roomToggle !== 1) {
        return res
          .status(500)
          .json({ message: `Error toggling room: ${roomId}` });
      }
      const fetchBIDs = await fetchBookingIdsForRoom(roomId);
      if (fetchBIDs.length > 0) {
        const booking_ids = fetchBIDs.map((item) => item.booking_id);
        const bookingToggle = await toggleBookings(booking_ids);
        if (bookingToggle !== 1) {
          res
            .status(500)
            .json({ message: `Error toggling bookings for room: ${roomId}` });
        }
      }
      res.status(200).json({ message: `Toggling room ${roomId} successful.` });
    } catch (error) {
      return res.status(500).json({ error });
    }
  }
  handleRoomToggle();
});

async function getCityId(airport_code) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "SELECT id FROM city where airport_code = ?",
      [airport_code],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          if (results.length > 0) {
            resolve(results[0].id);
          } else {
            resolve(0);
          }
        }
      }
    );
  });
}

function checkFloorBuildingExistsForAdd(
  floor_number,
  building_number,
  city_id
) {
  return new Promise((resolve, reject) => {
    let query = `select fb.id from floor_building as fb where fb.floor_number = ? and
                    fb.building_number = ? and fb.city_id = ?`;
    dbConnection.query(
      query,
      [floor_number, building_number, city_id],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          if (results.length > 0) {
            resolve(results[0]["id"]);
          } else {
            resolve(-1);
          }
        }
      }
    );
  });
}

function insertOrUpdateFloorBuilding(floor_number, building_number, city_id) {
  return new Promise((resolve, reject) => {
    const floor_building_values = [[floor_number, building_number, city_id]];
    dbConnection.query(
      "INSERT INTO floor_building (floor_number, building_number, city_id) VALUES ?",
      [floor_building_values],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          dbConnection.query(
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
      }
    );
  });
}

async function insertRoom(capacity, roomName, roomNumber, floor_building_id) {
  return new Promise((resolve, reject) => {
    const room_values = [[capacity, roomName, roomNumber, floor_building_id]];
    dbConnection.query(
      "INSERT INTO room (capacity, name, room_number, floor_building_id) VALUES ?",
      [room_values],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          dbConnection.query(
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
      }
    );
  });
}

async function insertRoomFacility(room_id, facility_id) {
  return new Promise((resolve, reject) => {
    const room_facility_values = [[room_id, facility_id]];
    dbConnection.query(
      "INSERT INTO room_facility (room_id, facility_id) VALUES ?",
      [room_facility_values],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });
}

function getBuildingIdsInCity(city) {
  return new Promise((resolve, reject) => {
    let query = `select distinct fb.building_number from floor_building as fb, city as c 
                      where fb.city_id = c.id and c.airport_code = ?`;
    dbConnection.query(query, [city], function (error, results) {
      if (error) {
        reject(error);
      } else {
        // Convert RowDataPacket objects to plain objects
        const plainResults = JSON.parse(JSON.stringify(results));
        resolve(plainResults);
      }
    });
  });
}

function validateRoomInsertionInputs(
  roomNumber,
  roomName,
  capacity,
  airport_code,
  floor_number,
  building_number,
  facility_id
) {
  const paramValues = {
    roomNumber,
    roomName,
    capacity,
    airport_code,
    floor_number,
    building_number,
    facility_id,
  };

  // Attempt to convert string representations of numbers to actual numbers
  function ensurePositiveInteger(value) {
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      return !isNaN(parsed) && Number.isInteger(parsed) && parsed > 0
        ? parsed
        : null;
    } else if (typeof value === "number") {
      return Number.isInteger(value) && value >= 0 ? value : null;
    } else {
      return null; // If the value is neither string nor number, return null.
    }
  }

  // Convert and validate parameters as needed.
  const parsedValues = {
    roomNumber: ensurePositiveInteger(roomNumber),
    roomName: roomName, // No conversion needed for strings.
    capacity: ensurePositiveInteger(capacity),
    airport_code: airport_code, // Validation without conversion.
    floor_number: ensurePositiveInteger(floor_number),
    building_number: ensurePositiveInteger(building_number),
    facility_id: ensurePositiveInteger(facility_id),
  };

  // Define logical checks.
  const validations = {
    roomNumber: (value) => value !== null,
    roomName: (value) => typeof value === "string",
    capacity: (value) => value !== null,
    airport_code: (value) =>
      typeof value === "string" && /^[A-Z]{3}$/.test(value),
    floor_number: (value) => value !== null,
    building_number: (value) => value !== null,
    facility_id: (value) => value !== null,
  };

  // Iterate through each validation and check the value
  for (const [key, isValid] of Object.entries(validations)) {
    const value = parsedValues[key];
    if (!isValid(value)) {
      return {
        isValid: false,
        message: `Invalid value for ${key}, value: ${paramValues[key]}`,
      };
    }
  }

  // If all checks pass
  return { isValid: true, message: "All inputs are valid." };
}

async function handleRoomInsertion(
  roomNumber,
  roomName,
  capacity,
  airport_code,
  floor_number,
  building_number,
  facility_id
) {
  return new Promise(async (resolve, reject) => {
    try {
      // await dbConnection.beginTransaction();
      // const validation = validateRoomInsertionInputs(
      //   roomNumber,
      //   roomName,
      //   capacity,
      //   airport_code,
      //   floor_number,
      //   building_number,
      //   facility_id
      // );
      // if (!validation.isValid) {
      //   await dbConnection.rollback();
      //   throw new Error(validation.message);
      // }
      const city_id = await getCityId(airport_code);
      if (city_id !== 0) {
        const existing_fb_id = await checkFloorBuildingExistsForAdd(
          floor_number,
          building_number,
          city_id
        );

        console.log(existing_fb_id);

        // const buildings_in_city = await getBuildingIdsInCity(airport_code);
        // console.log(buildings_in_city);
        // const roomBuilding = buildings_in_city.find(
        //   (building) => building.building_number === Number(building_number)
        // );

        // console.log(roomBuilding);
        // if (!roomBuilding) {
        //   await dbConnection.rollback();
        //   throw new Error(`Building Number "${building_number}" not found.`);
        // }

        let room_id = 0;
        if (existing_fb_id !== -1) {
          room_id = await insertRoom(
            capacity,
            roomName,
            roomNumber,
            existing_fb_id
          );

          console.log(room_id);
        } else {
          const floor_building_id = await insertOrUpdateFloorBuilding(
            floor_number,
            building_number,
            city_id
          );

          console.log(floor_building_id);

          room_id = await insertRoom(
            capacity,
            roomName,
            roomNumber,
            floor_building_id
          );
        }

        await insertRoomFacility(room_id, facility_id);

        // await dbConnection.commit();
        resolve({ success: `Room insertion succeeded with id ${room_id}!` });
      } else {
        // await dbConnection.rollback();
        reject({
          message: `City not found for the given airport code ${airport_code}`,
        });
      }
    } catch (error) {
      // await dbConnection.rollback();
      reject({
        error,
        message: "Error inserting room",
        details: error.message,
      });
    }
  });
}

app.post("/rooms/add", async function (req, res) {
  const roomNumber = req.body.room_number;
  const roomName = req.body.name;
  const capacity = req.body.capacity;
  const airport_code = req.body.airport_code;
  const floor_number = req.body.floor_number;
  const building_number = req.body.building_number;
  const facility_id = req.body.facility_id;

  try {
    const result = await handleRoomInsertion(
      roomNumber,
      roomName,
      capacity,
      airport_code,
      floor_number,
      building_number,
      facility_id
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.details });
  }
});

app.post(
  "/rooms/addMultiple",
  upload.single("file"),
  async function (req, res) {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    try {
      const csvData = req.file.buffer.toString("utf8");
      const result = await parseCSV(csvData);
      await validateCSVFormat(result);
      await handleMultipleRoomsInsertion(result.data);
      res.json({ success: "All rooms inserted successfully." });
    } catch (error) {
      res
        .status(error.statusCode || 500)
        .json({ error: error.message, details: error.details });
    }
  }
);

async function parseCSV(csvData) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvData.trim(), {
      header: true,
      complete: resolve,
      error: reject,
    });
  });
}

async function validateCSVFormat(result) {
  const requiredColumns = [
    "name",
    "city",
    "building_number",
    "floor_number",
    "room_number",
    "facilities",
    "capacity",
  ];
  const isValidFormat = requiredColumns.every((col) =>
    result.meta.fields.includes(col)
  );
  if (!isValidFormat) {
    throw { statusCode: 400, message: "Invalid CSV format." };
  }
}

async function fetchFacilities() {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "SELECT * FROM facility",
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          // Convert RowDataPacket objects to plain objects
          const plainResults = JSON.parse(JSON.stringify(results));
          resolve(plainResults);
        }
      }
    );
  });
}

async function handleMultipleRoomsInsertion(rooms) {
  let facilities;
  try {
    await dbConnection.beginTransaction();
    facilities = await fetchFacilities();
  } catch (error) {
    console.error("Error starting transaction or fetching facilities", error);
    throw { statusCode: 500, message: "Failed to prepare database operation." };
  }

  try {
    for (const room of rooms) {
      await processRoom(room, facilities);
    }
    await dbConnection.commit();
    console.log("Transaction committed successfully.");
  } catch (error) {
    console.error("Error processing rooms:", error);
    await dbConnection.rollback();
    console.log("Transaction rolled back.");
    throw {
      statusCode: 500,
      message: error.message,
      details: error.details,
    };
  }
}

async function processRoom(room, facilities) {
  try {
    // Find the matching facility ID for the room's facility name.
    const roomFacility = facilities.find(
      (facility) => facility.name === room.facilities.toUpperCase()
    );
    if (!roomFacility) {
      throw new Error(`Facility "${room.facilities}" not found.`);
    }

    await handleRoomInsertion(
      room.room_number,
      room.name,
      room.capacity,
      room.city.toUpperCase(),
      room.floor_number,
      room.building_number,
      roomFacility.id
    );

    console.log(`Room "${room.name}" processed successfully.`);
  } catch (error) {
    console.error(`Error processing room "${room.name}": ${error.message}`);
    throw error; // Rethrow the error to be handled by the calling function.
  }
}

async function checkRoomExist(room_id) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "select * from room where id = ?",
      [room_id],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          if (results.length > 0) {
            resolve(0);
          } else {
            resolve(-1);
          }
        }
      }
    );
  });
}

async function checkFloorBuildingExistsForEdit(
  floor_number,
  building_number,
  city_id
) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "select * from floor_building where floor_number = ? AND building_number = ? AND city_id = ?",
      [floor_number, building_number, city_id],
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

async function insertFloorBuilding(floor_number, building_number, city_id) {
  return new Promise((resolve, reject) => {
    var floor_building_values = [[floor_number, building_number, city_id]];
    dbConnection.query(
      "insert into floor_building (floor_number, building_number, city_id) values ?",
      [floor_building_values],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          dbConnection.query(
            "select id from floor_building where floor_number = ? AND building_number = ? AND city_id = ?",
            [floor_number, building_number, city_id],
            function (error, results, fields) {
              if (error) {
                reject(error);
              } else {
                resolve(results[0].id);
              }
            }
          );
        }
      }
    );
  });
}

async function updateRoomValues(
  room_id,
  capacity,
  room_name,
  room_number,
  floor_building_id
) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "update room set capacity = ?, name = ?, room_number = ?, floor_building_id = ? where id = ?",
      [capacity, room_name, room_number, floor_building_id, room_id],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });
}

async function updateRoomFacility(room_id, facility_id) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "update room_facility set facility_id = ? where room_id = ?",
      [facility_id, room_id],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });
}

app.put("/rooms/edit", function (req, res) {
  const room_id = req.body.id;
  const roomNumber = req.body.room_number;
  const roomName = req.body.name;
  const capacity = req.body.capacity;
  const airport_code = req.body.airport_code;
  const floor_number = req.body.floor_number;
  const building_number = req.body.building_number;
  const facility_id = req.body.facility_id;

  async function handleRoomEdit() {
    try {
      await dbConnection.beginTransaction();
      var check_room_existance = await checkRoomExist(room_id);
      if (check_room_existance == -1) {
        await dbConnection.rollback();
        return res
          .status(404)
          .json({ message: `Room being edited is not in database ${room_id}` });
      }
      var city_id = await getCityId(airport_code);
      if (city_id == 0) {
        await dbConnection.rollback();
        return res.status(500).json({
          message: `City not found for the given airport code ${airport_code}`,
        });
      }
      var check_fb_existance = await checkFloorBuildingExistsForEdit(
        floor_number,
        building_number,
        city_id
      );
      var floor_building_id = 0;
      if (check_fb_existance === -1) {
        floor_building_id = await insertFloorBuilding(
          floor_number,
          building_number,
          city_id
        );
      } else {
        floor_building_id = check_fb_existance;
      }

      await updateRoomValues(
        room_id,
        capacity,
        roomName,
        roomNumber,
        floor_building_id
      );
      await updateRoomFacility(room_id, facility_id);

      await dbConnection.commit();
      res
        .status(200)
        .json({ success: `Room Edit succeeded with id ${room_id}!` });
    } catch (error) {
      await dbConnection.rollback();
      console.error("Error editing room:", error);
      return res.status(500).json({ error, message: "Error editing room" });
    }
  }

  handleRoomEdit();
});

app.get("/rooms/get-buildings-for-cities", function (req, res) {
  let query = `select distinct fb.building_number, c.airport_code from floor_building as fb, city as c 
				where fb.city_id = c.id`;
  dbConnection.query(query, function (error, results, fields) {
    if (error) {
      console.error("Error getting building numbers for cities: ", error);
      return res
        .status(500)
        .json({ error: "Error getting building numbers for cities:" });
    } else {
      const plainResults = JSON.parse(JSON.stringify(results));

      const city_buildings = plainResults.reduce((acc, obj) => {
        const { airport_code, building_number } = obj;
        if (!acc[airport_code]) {
          acc[airport_code] = [];
        }
        acc[airport_code].push(building_number);
        return acc;
      }, {});
      res.status(200).json(city_buildings);
    }
  });
});

app.get("/rooms/get/:floorNumber/:buildingNumber/:cityId", function (req, res) {
  const floorNumber = req.params.floorNumber;
  const buildingNumber = req.params.buildingNumber;
  const cityId = req.params.cityId;

  let query =
    "SELECT fb.id from floor_building as fb, city as c WHERE fb.floor_number = ? AND fb.building_number = ? AND fb.city_id = c.id and c.airport_code = ?";
  dbConnection.query(
    query,
    [floorNumber, buildingNumber, cityId],
    function (error, results, fields) {
      if (error) {
        console.error("Error getting Floor_building_id: ", error);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

app.get("/rooms/get/details/:floorBuildingId", function (req, res) {
  const floorBuildingId = req.params.floorBuildingId.split(",").map(Number);
  dbConnection.query(
    "Select * from floor_building WHERE id IN (?)",
    [floorBuildingId],
    function (error, results, fields) {
      if (error) {
        console.error("Error getting data for the Floor_building_id: ", error);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

app.get("/rooms/get/buildingNumbers/:cityId", function (req, res) {
  const cityId = req.params.cityId;

  dbConnection.query(
    "SELECT DISTINCT building_number from floor_building WHERE city_id = ?",
    [cityId],
    function (error, results, fields) {
      if (error) {
        console.error("Error getting buildingNumbers: ", error);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

app.get("/rooms/getFloorNumbers/:buildingNumber/:cityId", function (req, res) {
  // const floorNumber = req.params.floorNumber;
  const buildingNumber = req.params.buildingNumber;
  const cityId = req.params.cityId;

  dbConnection.query(
    "SELECT DISTINCT floor_number from floor_building WHERE building_number = ? AND city_id = ?",
    [buildingNumber, cityId],
    function (error, results, fields) {
      if (error) {
        console.error("Error getting floorNumbers: ", error);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

app.get("/rooms/getCities", function (req, res) {
  dbConnection.query("SELECT * FROM city", function (error, results, fields) {
    if (error) {
      console.error("Error getting cities: ", error);
      return res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.status(200).json(results);
    }
  });
});

app.get("/rooms/*", function (req, res) {
  // Add your code here
  res.json({ success: "get call succeed!", url: req.url });
});

/****************************
 * Example post method *
 ****************************/

app.post("/rooms", function (req, res) {
  // Add your code here
  res.json({ success: "post call succeed!", url: req.url, body: req.body });
});

app.post("/rooms/*", function (req, res) {
  // Add your code here
  res.json({ success: "post call succeed!", url: req.url, body: req.body });
});

/****************************
 * Example put method *
 ****************************/

app.put("/rooms", function (req, res) {
  // Add your code here
  res.json({ success: "put call succeed!", url: req.url, body: req.body });
});

app.put("/rooms/*", function (req, res) {
  // Add your code here
  res.json({ success: "put call succeed!", url: req.url, body: req.body });
});

/****************************
 * Example delete method *
 ****************************/

app.delete("/rooms", function (req, res) {
  // Add your code here
  res.json({ success: "delete call succeed!", url: req.url });
});

app.delete("/rooms/*", function (req, res) {
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
