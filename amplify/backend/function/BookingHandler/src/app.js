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
const { createDBConnection, endDBConnection } = require("/opt/connection");
const { mainSearch } = require("./AlgoHelpers");
const { findOptimalFloor, rankRoomsByFloor } = require("./FloorPlan");
const { generateMap } = require("./BuildingMap");
const {
  getBuildingDetails,
  compute,
  getParticipantDetails,
} = require("./clusterHelper");

const {
  insertIntoBookingTable,
  insertIntoParticipant,
  multiInsertIntoRoomBooking,
  checkMeetingTimesAndRoomConflictForBooking,
} = require("./MultiAddBookingHelpers");

// const {YVR_MAP} = require("./BuildingMap")
// const {YVR} = require("./BuildingMap")

// declare a new express app
const app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());

const YVR_ID = 17;
const YYZ_ID = 18;
const YUL_ID = 19;
let dbConnection;
let YVR_MAP;
let YUL_MAP;
let YYZ_MAP;

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

async function initializeMaps() {
  try {
    const yvr_buildings = await getBuildingIdsByCity("YVR");
    const yul_buildings = await getBuildingIdsByCity("YUL");
    const yyz_buildings = await getBuildingIdsByCity("YYZ");
    const yvr_coords = await getLatLonForBuildings(yvr_buildings, YVR_ID);
    const yul_coords = await getLatLonForBuildings(yul_buildings, YUL_ID);
    const yyz_coords = await getLatLonForBuildings(yyz_buildings, YYZ_ID);
    // console.log(yvr_buildings);
    // console.log(yvr_coords);
    YVR_MAP = generateMap(yvr_buildings, yvr_coords);
    YUL_MAP = generateMap(yul_buildings, yul_coords);
    YYZ_MAP = generateMap(yyz_buildings, yyz_coords);
    // console.log("YUL MAP: ");
    // console.log(YUL_MAP);
    // console.log("YYZ MAP: ");
    console.log(YYZ_MAP);
  } catch (error) {
    throw error;
  }
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

app.use(function (req, res, next) {
  try {
    if (YVR_MAP) {
      next();
    } else {
      initializeMaps();
      next();
    }
  } catch (error) {
    res.status(500).json({ error: "Error initializing map" });
  }
});

/**********************
 * Example get method *
 **********************/

function getBuildingIdsByCity(airport_code) {
  return new Promise((resolve, reject) => {
    let query = `select distinct fb.building_number from floor_building as fb, city as c where fb.city_id = c.id and c.airport_code = ? `;
    dbConnection.query(
      query,
      [airport_code],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          let processedResults = results.map((item) => item.building_number);
          resolve(processedResults);
        }
      }
    );
  });
}

function getLatLonForBuildings(buildings, city_id) {
  return new Promise((resolve, reject) => {
    let query = `select t.building_number, t.latitude, t.longitude from temp_building_location as t where t.building_number in ? and t.city_id = ?`;
    dbConnection.query(
      query,
      [[buildings], city_id],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(JSON.parse(JSON.stringify(results)));
        }
      }
    );
  });
}

async function getHostEmailFromBookingId(bookingId) {
  return new Promise((resolve, reject) => {
    let query = `select e.email as employee_email from employee as e, booking as b where b.id = ? and b.organizer_id = e.id`;
    dbConnection.query(query, [bookingId], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(results[0]["employee_email"]);
      }
    });
  });
}

async function getHostEmail(userId) {
  return new Promise((resolve, reject) => {
    let query = `select e.email as employee_email, e.id as employee_id, e.name as employee_name from employee as e where e.id = ? and e.is_active = true`;
    dbConnection.query(query, [userId], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(results[0]);
      }
    });
  });
}

async function getBookingParticipants(bookingId) {
  return new Promise((resolve, reject) => {
    let query = `select e.email as employee_email, e.id as employee_id, e.name as employee_name from participate as p, employee as e where p.booking_id = ? and e.id = p.participant_id and e.is_active = true`;
    dbConnection.query(query, [bookingId], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

async function resetIncorrectBookingActiveStatus() {
  return new Promise((resolve, reject) => {
    let query = `update booking as b
		join room_booking as rb on b.id = rb.booking_id
		join room as r on rb.room_id = r.id
		set b.is_active = true
		where r.is_active = true and b.is_active = false`;
    dbConnection.query(query, function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(1); //flag
      }
    });
  });
}

async function resetIncorrectBookingInactiveStatus() {
  return new Promise((resolve, reject) => {
    let query = `update booking as b
		join room_booking as rb on b.id = rb.booking_id
		join room as r on rb.room_id = r.id
		set b.is_active = false
		where r.is_active = false and b.is_active = true`;
    dbConnection.query(query, function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        resolve(1); //flag
      }
    });
  });
}

function getBIDsOfHost(userId) {
  return new Promise((resolve, reject) => {
    let query = `select b.id as booking_id from booking as b where b.organizer_id = ? and
    DATE_ADD(b.start_time, INTERVAL b.length MINUTE) >= DATE_SUB(NOW(), INTERVAL 8 HOUR)`;
    dbConnection.query(query, [userId], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        const plainResults = JSON.parse(JSON.stringify(results));
        resolve(plainResults);
      }
    });
  });
}

function getSharedBookingDetails(b_id) {
  return new Promise((resolve, reject) => {
    let query = `select b.meeting_title, b.is_active, b.id as booking_id, 
    DATE_FORMAT(b.start_time, '%Y-%m-%d %H:%i') as start_time, b.length
    from booking as b where b.id = ?`;
    dbConnection.query(query, [b_id], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        const plainResults = JSON.parse(JSON.stringify(results));
        resolve(plainResults);
      }
    });
  });
}

function getRoomIDsForBooking(b_id) {
  return new Promise((resolve, reject) => {
    let query = `select distinct room_id from booking as b, room_booking as rb 
                where b.id = rb.booking_id and b.id = ?`;
    dbConnection.query(query, [b_id], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        const plainResults = JSON.parse(JSON.stringify(results));
        resolve(plainResults);
      }
    });
  });
}

function getRoomDetails(room_id) {
  return new Promise((resolve, reject) => {
    let query = `select r.id as room_id, r.capacity, r.name as room_name, r.room_number, 
              LPAD(fb.floor_number, 2, '0') as floor_number,
              fb.building_number, c.airport_code as city, f.name as facility, r.is_active as room_status
              from room as r, floor_building as fb, city as c, room_facility as rf, facility as f
              where r.id = ? and r.floor_building_id = fb.id and fb.city_id = c.id and 
              r.id = rf.room_id and rf.facility_id = f.id`;
    dbConnection.query(query, [room_id], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        const plainResults = JSON.parse(JSON.stringify(results));
        resolve(plainResults[0]);
      }
    });
  });
}

function getRoomParticipantsEmails(room_id, b_id) {
  return new Promise((resolve, reject) => {
    let query = `select e.email 
    from room_booking as rb, employee as e
    where rb.participant_id = e.id and rb.room_id = ? and rb.booking_id = ?`;
    dbConnection.query(
      query,
      [room_id, b_id],
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

function getRoomParticipants(room_id, b_id) {
  return new Promise((resolve, reject) => {
    let query = `select rb.participant_id 
    from room_booking as rb
    where rb.room_id = ? and rb.booking_id = ?`;
    dbConnection.query(
      query,
      [room_id, b_id],
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

function getParticipantNameMap(participant_ids) {
  return new Promise((resolve, reject) => {
    let query = `select e.id as value, e.name as label, e.email as email from employee as e where e.id in ?`;
    dbConnection.query(
      query,
      [[participant_ids]],
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

app.get("/bookings/multi-get-host/:userId", function (req, res) {
  const userId = req.params.userId;
  async function handleFetchHostedBookings() {
    try {
      const resetBookingActiveFlag = await resetIncorrectBookingActiveStatus();
      if (resetBookingActiveFlag !== 1) {
        return res
          .status(500)
          .json({ message: "Error when reseting booking to active status" });
      }

      const resetBookingInactiveFlag =
        await resetIncorrectBookingInactiveStatus();
      if (resetBookingInactiveFlag !== 1) {
        return res
          .status(500)
          .json({ message: "Error when reseting booking to inactive status" });
      }

      let b_ids_map = await getBIDsOfHost(userId);
      const b_ids = b_ids_map.map((item) => item.booking_id);

      let hosted_bookings_map = [];
      for (var b_id of b_ids) {
        let shared_details = await getSharedBookingDetails(b_id);
        shared_details = shared_details[0];
        let room_ids_for_booking = await getRoomIDsForBooking(b_id);
        // Convert from {[room_id: 123], [room_id: 456]} => [123, 456]
        room_ids_for_booking = room_ids_for_booking.map((item) => item.room_id);

        let room_details = [];
        let booking_participants_ids = [];
        for (var room_id of room_ids_for_booking) {
          let room_info = await getRoomDetails(room_id);

          let participants = await getRoomParticipantsEmails(room_id, b_id);
          participants = participants.map((item) => item.email);

          let p_ids = await getRoomParticipants(room_id, b_id);
          p_ids = p_ids.map((item) => item.participant_id);
          booking_participants_ids.push(p_ids);
          room_info.participants = participants;
          room_details.push(room_info);
        }

        booking_participants_ids = booking_participants_ids.flat();
        shared_details.rooms = room_details;

        let email_name = await getParticipantNameMap(booking_participants_ids);
        // console.log(email_name);
        shared_details.employee_email_name = email_name;
        hosted_bookings_map.push(shared_details);
      }

      // console.log(hosted_bookings_map);
      res.status(200).json({ hosted_bookings_map });
    } catch (error) {
      console.error("Error fetching hosted bookings:", error);
      return res
        .status(500)
        .json({ error, message: "Error fetching hosted bookings" });
    }
  }

  handleFetchHostedBookings();
});

app.get("/bookings/get-host/:userId", function (req, res) {
  const userId = req.params.userId;
  async function handleFetchHostedBookings() {
    try {
      const resetBookingActiveFlag = await resetIncorrectBookingActiveStatus();
      if (resetBookingActiveFlag !== 1) {
        return res
          .status(500)
          .json({ message: "Error when reseting booking to active status" });
      }

      const resetBookingInactiveFlag =
        await resetIncorrectBookingInactiveStatus();
      if (resetBookingInactiveFlag !== 1) {
        return res
          .status(500)
          .json({ message: "Error when reseting booking to inactive status" });
      }

      let query = `select booking.meeting_title, booking.is_active, booking.id as booking_id, 
			DATE_FORMAT(booking.start_time, '%Y-%m-%d %H:%i') as start_time, booking.length, 
			room.name as room_name, room.room_number, LPAD(floor_building.floor_number, 2, '0') 
			as floor_number, floor_building.building_number, city.airport_code as city, facility.name as facility, 
			room.is_active as room_status
			from booking, room_booking, room, floor_building, city, room_facility, facility
			where booking.id = room_booking.booking_id and room_booking.room_id = room.id 
			and booking.organizer_id = ? and room.floor_building_id = floor_building.id and 
			floor_building.city_id = city.id and room.id = room_facility.room_id and room_facility.facility_id = facility.id
			and DATE(booking.start_time) >= CURDATE()`;

      dbConnection.query(
        query,
        [userId],
        async function (error, results, fields) {
          if (error) {
            console.error("Error fetching hosted bookings:", error);
            return res
              .status(500)
              .json({ error, message: "Error fetching hosted bookings" });
          } else {
            let host_email = await getHostEmail(userId);
            for (let booking of results) {
              try {
                let participants = await getBookingParticipants(
                  booking.booking_id
                );
                booking.participants = participants.map(
                  (participant) => participant.employee_email
                );
                booking.participants.push(host_email.employee_email);
                booking.employee_email_name = participants.map(
                  (participant) => {
                    return {
                      value: participant.employee_id,
                      label: participant.employee_name,
                    };
                  }
                );
              } catch (err) {
                console.log(
                  "Error fetching all participants in a booking",
                  err
                );
                return res.status(500).json({
                  err,
                  message: "Error fetching all participants in a booking",
                });
              }
            }
            res.status(200).json(results);
          }
        }
      );
    } catch (err) {
      console.error("Error fetching hosted bookings:", err);
      return res
        .status(500)
        .json({ err, message: "Error fetching hosted bookings" });
    }
  }

  handleFetchHostedBookings();
});

function getInvitedMeetingDetails(userId) {
  return new Promise((resolve, reject) => {
    let query = `
    select b.meeting_title, b.is_active, b.id as booking_id, DATE_FORMAT(b.start_time, '%Y-%m-%d %H:%i') as start_time, b.length, 
    r.name as room_name, r.room_number, e.name as host_name, LPAD(fb.floor_number, 2, '0') as floor_number, fb.building_number, 
    r.is_active as room_status, c.airport_code as city, f.name as facility, r.id as room_id
    from participate as p, booking as b, room_booking as rb, room as r, employee as e, floor_building as fb, city as c,
    room_facility as rf, facility as f
    where p.participant_id = ? and b.id = p.booking_id and b.id = rb.booking_id 
    and p.participant_id = rb.participant_id and rb.room_id = r.id and e.id = b.organizer_id and fb.id = r.floor_building_id
    and fb.city_id = c.id and rf.room_id = r.id and f.id = rf.facility_id and DATE_ADD(b.start_time, INTERVAL b.length MINUTE) >= DATE_SUB(NOW(), INTERVAL 8 HOUR)
    `;
    dbConnection.query(query, [userId], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        const plainResults = JSON.parse(JSON.stringify(results));
        resolve(plainResults);
      }
    });
  });
}

app.get("/bookings/multi-get-invite/:userId", function (req, res) {
  const userId = req.params.userId;
  async function handleInvitedBookings() {
    try {
      let invited_details = await getInvitedMeetingDetails(userId);
      // console.log(invited_details);

      for (var meeting of invited_details) {
        let meeting_room_id = meeting.room_id;
        let meeting_booking_id = meeting.booking_id;

        let participants = await getRoomParticipantsEmails(
          meeting_room_id,
          meeting_booking_id
        );
        // console.log(participants);
        participants = participants.map((item) => item.email);
        meeting.participants = participants;
      }

      res.status(200).json({ invited_details });
    } catch (err) {
      console.error("Error fetching invited bookings:", err);
      return res
        .status(500)
        .json({ err, message: "Error fetching invited bookings" });
    }
  }

  handleInvitedBookings();
});

app.get("/bookings/get-invite/:userId", function (req, res) {
  const userId = req.params.userId;
  let query = `select booking.meeting_title, booking.is_active, booking.id as booking_id, 
	DATE_FORMAT(booking.start_time, '%Y-%m-%d %H:%i') as start_time, booking.length, room.name as room_name, 
	room.room_number, employee.name as host_name, LPAD(floor_building.floor_number, 2, '0') as floor_number, 
	floor_building.building_number, city.airport_code as city, facility.name as facility
	from participate, booking, room_booking, room, employee, floor_building, city, room_facility, facility
	where participate.participant_id = ? and participate.booking_id = booking.id and 
	room_booking.booking_id = booking.id and room.id = room_booking.room_id and 
	booking.organizer_id = employee.id and room.floor_building_id = floor_building.id 
	and floor_building.city_id = city.id and room.id = room_facility.room_id and room_facility.facility_id = facility.id
	and DATE(booking.start_time) >= CURDATE()`;
  dbConnection.query(query, [userId], async function (error, results, fields) {
    if (error) {
      console.error("Error fetching invited bookings:", error);
      return res
        .status(500)
        .json({ error, message: "Error fetching invited bookings" });
    } else {
      for (let booking of results) {
        try {
          let participants = await getBookingParticipants(booking.booking_id);
          let host_email = await getHostEmailFromBookingId(booking.booking_id);
          booking.participants = participants.map(
            (participant) => participant.employee_email
          );
          booking.participants.push(host_email);
        } catch (err) {
          console.log("Error fetching all participants in a booking", err);
          return res.status(500).json({
            err,
            message: "Error fetching all participants in a booking",
          });
        }
      }
      res.status(200).json(results);
    }
  });
});

app.delete("/bookings/delete/:bookingId", function (req, res) {
  const bookingId = req.params.bookingId;
  dbConnection.query(
    "delete from booking where id = ?",
    [bookingId],
    function (error, results, fields) {
      if (error) {
        console.error("Error deleting booking:", error);
        return res
          .status(500)
          .json({ error, message: "Error deleting booking" });
      } else {
        res
          .status(200)
          .json({ success: `Delete booking with id ${bookingId} successful` });
      }
    }
  );
});

function getParticipatingBookings(participants) {
  return new Promise((resolve, reject) => {
    let query = `select distinct rb.booking_id from room_booking as rb where rb.participant_id in ?`;
    dbConnection.query(
      query,
      [[participants]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });
}

async function getHostedBookings(hosts) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "select distinct b.id from booking as b where b.organizer_id in ?",
      [[hosts]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });
}

async function getParticipatingBookingTimes(ids, date) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "select DATE_FORMAT(b.start_time, '%Y-%m-%d %H:%i') as start_time, b.length from booking as b where b.id in ? and DATE(b.start_time) = ? and b.is_active = true",
      [[ids], date],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });
}

app.post("/bookings/meeting-times/:userId", function (req, res) {
  const userId = req.params.userId;
  const participant_ids = req.body.participant_ids;
  const date = req.body.date;

  let meetingParticipantsWithHost = participant_ids;
  meetingParticipantsWithHost.push(userId);

  async function handleFetchMeetingTimes() {
    try {
      let participatingBookingIds = await getParticipatingBookings(
        meetingParticipantsWithHost
      );

      participatingBookingIds = participatingBookingIds.map(
        (item) => item.booking_id
      );

      let participatingTimes = [];
      if (participatingBookingIds.length !== 0) {
        participatingTimes = await getParticipatingBookingTimes(
          participatingBookingIds,
          date
        );
      }
      res.status(200).json({ participatingTimes });
    } catch (err) {
      console.error("Error fetching meeting times:", err);
      return res
        .status(500)
        .json({ err, message: "Error fetching meeting times" });
    }
  }

  handleFetchMeetingTimes();
});

async function getParticipantBuildingIds(participants) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "select f.building_number, COUNT(*) as participants_num from employee as e, floor_building as f where e.id in ? and e.floor_building_id = f.id group by f.building_number",
      [[participants]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });
}

function getAllUnavailableRooms(
  start_time,
  duration,
  meeting_buildings,
  cities
) {
  // console.log(start_time, duration, meeting_buildings, cities);
  return new Promise((resolve, reject) => {
    let query = `
    SELECT room.id, room.name as room_name, room.room_number, floor_building.floor_number, room.capacity, 
    floor_building.building_number, facility.name as facility_name, city.airport_code
    FROM room
    INNER JOIN floor_building ON room.floor_building_id = floor_building.id
    INNER JOIN room_facility ON room_facility.room_id = room.id
    INNER JOIN facility ON room_facility.facility_id = facility.id
    INNER JOIN city ON floor_building.city_id = city.id and city.airport_code in ?
    WHERE room.is_active = false OR
    EXISTS (
      SELECT * FROM room_booking, booking
        WHERE room_booking.room_id = room.id AND booking.is_active = true
        AND booking.id = room_booking.booking_id
        AND booking.start_time < DATE_ADD(?, INTERVAL ? MINUTE)
        AND DATE_ADD(booking.start_time, INTERVAL booking.length MINUTE) > ?
    )
    `;
    dbConnection.query(
      query,
      [[cities], start_time, duration, start_time],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          const plainResults = JSON.parse(JSON.stringify(results));
          console.log(plainResults);
          resolve(plainResults);
        }
      }
    );
  });
}

async function getAllAvailableRooms(
  capacity,
  facilities,
  start_time,
  duration,
  meeting_buildings,
  cities
) {
  return new Promise((resolve, reject) => {
    let query = `
    SELECT room.id, room.name as room_name, room.room_number, floor_building.floor_number, room.capacity, floor_building.building_number, facility.name as facility_name, city.airport_code
    FROM room
    INNER JOIN floor_building ON room.floor_building_id = floor_building.id
    INNER JOIN room_facility ON room_facility.room_id = room.id
    INNER JOIN facility ON room_facility.facility_id = facility.id
    INNER JOIN city ON floor_building.city_id = city.id and city.airport_code in ?
    WHERE room.is_active = true AND
      NOT EXISTS (SELECT * 
            FROM room_booking, booking
            WHERE room_booking.room_id = room.id AND booking.is_active = true
                AND booking.id = room_booking.booking_id
                AND booking.start_time < DATE_ADD(?, INTERVAL ? MINUTE)
                AND DATE_ADD(booking.start_time, INTERVAL booking.length MINUTE) > ?)`;
    dbConnection.query(
      query,
      [[cities], start_time, duration, start_time],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });
}

async function getAvailableRoomsInBuilding(
  capacity,
  facilities,
  start_time,
  duration,
  meeting_building_id,
  cities
) {
  return new Promise((resolve, reject) => {
    let query = `
			SELECT room.id, room.name as room_name, room.room_number, floor_building.floor_number, room.capacity, floor_building.building_number, facility.name as facility_name, city.airport_code
			FROM room
			INNER JOIN floor_building ON room.floor_building_id = floor_building.id
			INNER JOIN room_facility ON room_facility.room_id = room.id
			INNER JOIN facility ON room_facility.facility_id = facility.id
			INNER JOIN city ON floor_building.city_id = city.id and city.airport_code in ?
			WHERE room.is_active = true AND room.capacity >= ? AND facility.name in ? AND floor_building.building_number = ? AND
				NOT EXISTS (SELECT * 
							FROM room_booking, booking
							WHERE room_booking.room_id = room.id AND booking.is_active = true
									AND booking.id = room_booking.booking_id
									AND booking.start_time < DATE_ADD(?, INTERVAL ? MINUTE)
									AND DATE_ADD(booking.start_time, INTERVAL booking.length MINUTE) > ?)`;
    dbConnection.query(
      query,
      [
        [cities],
        capacity,
        [facilities],
        meeting_building_id,
        start_time,
        duration,
        start_time,
      ],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });
}

async function getParticipantBuildingAndFloor(participantIds) {
  return new Promise((resolve, reject) => {
    let query = `select f.building_number, f.floor_number from employee as e, floor_building as f 
					where e.floor_building_id = f.id and e.id in ?`;
    dbConnection.query(
      query,
      [[participantIds]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });
}

async function getParticipantCities(participant_ids) {
  return new Promise((resolve, reject) => {
    let query = `select distinct c.airport_code from employee as e, floor_building as f, city as c where e.floor_building_id = f.id and f.city_id = c.id and e.id in ?`;
    dbConnection.query(
      query,
      [[participant_ids]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          const airport_codes = results.map((item) => item.airport_code);
          resolve(airport_codes);
        }
      }
    );
  });
}

app.post("/bookings/multi-search/:userId", function (req, res) {
  const userId = req.params.userId;
  const participant_ids = req.body.participant_ids;
  const facilities = req.body.facilities;
  const start_time = req.body.start_time;
  const duration = req.body.duration;
  let numClusters = req.body.num_clusters;
  // console.log(participant_ids);
  if (facilities.length === 0) {
    // If they select no facilities needed, should show all facilities
    facilities.push("N/A");
    facilities.push("AV");
    facilities.push("VC");
    facilities.push("AV/VC");
  } else if (facilities.length === 1) {
    // If they select AV or VC, it should also show AV/VC
    facilities.push("AV/VC");
  } else {
    facilities.pop();
    facilities.pop();
    facilities.push("AV/VC");
  }

  const meetingParticipantsWithHost = participant_ids;
  meetingParticipantsWithHost.push(userId);
  const capacity = meetingParticipantsWithHost.length;

  async function handleSearch() {
    try {
      const allParticipantCities = await getParticipantCities(
        meetingParticipantsWithHost
      );
      console.log(allParticipantCities);

      if (allParticipantCities.length > 1) {
        numClusters = Math.max(numClusters, allParticipantCities.length);
        while (facilities.length > 0) {
          facilities.pop();
        }
        facilities.push("AV/VC");
      }

      // if (allParticipantCities[0] === "YVR") {
      //   city_map = YVR_MAP;
      // } else if (allParticipantCities[0] === "YUL") {
      //   city_map = YUL_MAP;
      // } else if (allParticipantCities[0] === "YYZ") {
      //   city_map = YYZ_MAP;
      // }

      // if (allParticipantCities[0] !== "YVR") {
      //   return res.status(400).json({
      //     message: "All users are not from YVR, only YVR is supported now.",
      //   });
      // }

      // const numClusters = 3;
      console.log(meetingParticipantsWithHost);
      const data = await compute(
        meetingParticipantsWithHost,
        numClusters,
        dbConnection
      );

      console.log(data);

      const groupedData = data.reduce((accumulator, participant) => {
        const { closestCentroidIndex } = participant;
        if (!accumulator[closestCentroidIndex]) {
          accumulator[closestCentroidIndex] = [];
        }
        accumulator[closestCentroidIndex].push(participant);
        return accumulator;
      }, {});

      // Convert groupedData into an array
      const resultList = Object.values(groupedData);
      let listFlatten = [];
      let allListFlatten = [];
      const heightMultiplier = 3;

      for (let i = 0; i < numClusters; i++) {
        const ids = resultList[i].map((obj) => obj.id);
        const cluster_capacity = ids.length;
        const participantBuildingIds = await getParticipantBuildingIds(
          // meetingParticipantsWithHost
          ids
        );

        const participantCities = await getParticipantCities(ids);
        console.log(participantCities);

        const participantBuildingsAndFloors =
          await getParticipantBuildingAndFloor(ids);
        // console.log("hdfhjd", participantBuildingIds);

        let optimalBuildings;
        if (participantCities[0] === "YVR") {
          optimalBuildings = mainSearch(YVR_MAP, participantBuildingIds);
        } else if (participantCities[0] === "YUL") {
          optimalBuildings = mainSearch(YUL_MAP, participantBuildingIds);
        } else if (participantCities[0] === "YYZ") {
          optimalBuildings = mainSearch(YYZ_MAP, participantBuildingIds);
        }
        // let optimalBuildings = mainSearch(YVR_MAP, participantBuildingIds);

        let optimalRooms = [];
        let optimalBuilding = -1; // flag
        for (var building of optimalBuildings) {
          const { meeting_building, distance } = building;
          const avg_distance = distance / ids.length;
          const rooms = await getAvailableRoomsInBuilding(
            cluster_capacity,
            facilities,
            start_time,
            duration,
            meeting_building,
            participantCities
          );
          rooms.forEach((item) => {
            let updateDistance = 0;
            participantBuildingsAndFloors.forEach((userBuilding) => {
              if (item.building_number === userBuilding.building_number) {
                updateDistance +=
                  Math.abs(item.floor_number - userBuilding.floor_number) *
                  heightMultiplier;
              } else {
                updateDistance +=
                  distance +
                  item.floor_number * heightMultiplier +
                  userBuilding.floor_number * heightMultiplier;
              }
            });
            item.avg_distance =
              Math.round((updateDistance / ids.length) * 100) / 100;
          });
          if (rooms.length !== 0) {
            optimalRooms.push(rooms);
            optimalBuilding = meeting_building;
            break;
          }
        }
        // console.log(optimalRooms);

        if (optimalBuilding === -1) {
          // NO ROOMS AVAILABLE
          return res.status(400).json({ message: "No available rooms found." });
        }

        let flattenedOptimalRooms = optimalRooms[0];

        // console.log("yeah", participantBuildingsAndFloors);
        const optimalFloor = findOptimalFloor(
          optimalBuilding,
          participantBuildingsAndFloors
        );
        rankRoomsByFloor(optimalFloor, flattenedOptimalRooms);
        listFlatten.push(flattenedOptimalRooms);
        const meeting_buildings = optimalBuildings.map(
          (item) => item.meeting_building
        );
        const allAvailableRooms = await getAllAvailableRooms(
          capacity,
          facilities,
          start_time,
          duration,
          meeting_buildings,
          participantCities
        );
        const allAvailableRoomsDistances = allAvailableRooms.map((item) => {
          const foundBuilding = optimalBuildings.find(
            (building) => building.meeting_building === item.building_number
          );

          let updateDistance = 0;
          participantBuildingsAndFloors.forEach((userBuilding) => {
            if (
              foundBuilding.meeting_building === userBuilding.building_number
            ) {
              updateDistance +=
                Math.abs(item.floor_number - userBuilding.floor_number) *
                heightMultiplier;
            } else {
              updateDistance +=
                foundBuilding.distance +
                item.floor_number * heightMultiplier +
                userBuilding.floor_number * heightMultiplier;
            }
          });
          const avg_distance =
            Math.round((updateDistance / ids.length) * 100) / 100;
          return { ...item, avg_distance };
        });
        allAvailableRoomsDistances.sort(
          (a, b) => a.avg_distance - b.avg_distance
        );
        allListFlatten.push(allAvailableRoomsDistances);
      }

      const clusterEmails = resultList.map((cluster) =>
        cluster.map((user) => user.email)
      );

      let participantBuildingIds = await getParticipantBuildingIds(
        meetingParticipantsWithHost
      );
      console.log(participantBuildingIds);
      participantBuildingIds = participantBuildingIds.map(
        (item) => item.building_number
      );
      let unavailableRooms = await getAllUnavailableRooms(
        start_time,
        duration,
        participantBuildingIds,
        allParticipantCities
      );
      // console.log(unavailableRooms);
      const retObj = {
        optimalRooms: listFlatten,
        allAvailableRooms: allListFlatten,
        ClusterGroups: clusterEmails,
        unavailableRooms: unavailableRooms,
      };

      res.status(200).json(retObj);
    } catch (err) {
      console.error("Error searching for rooms: ", err);
      return res
        .status(500)
        .json({ err, message: "Error searching for rooms" });
    }
  }

  handleSearch();
});

app.post("/bookings/multi-add-booking/:userId", async function (req, res) {
  const userId = req.params.userId;
  const start_time = req.body.start_time;
  const duration = req.body.duration;
  const meeting_title = req.body.meeting_title;
  const clusters = req.body.clusters;

  // await dbConnection.beginTransaction();

  /* 
    Concurrency check -- need to check if this time is already booked for the participants or
    if the room is already booked.
  */

  function getLock() {
    return new Promise((resolve, reject) => {
      dbConnection.query(
        'SELECT GET_LOCK("conflict-lock", 10)',
        (unlockError, unlockResults, unlockFields) => {
          if (unlockError) {
            reject(unlockError);
          }
          console.log("Table Locked.");
          resolve(unlockResults);
        }
      );
    });
  }

  function releaseLock() {
    return new Promise((resolve, reject) => {
      dbConnection.query(
        'SELECT RELEASE_LOCK("conflict-lock")',
        (unlockError, unlockResults, unlockFields) => {
          if (unlockError) {
            reject(unlockError);
          }
          console.log("RELEASE LOCK");
          resolve(unlockResults);
        }
      );
    });
  }

  try {
    await getLock();
  } catch (error) {
    return res.status(500).json({ error });
  }

  try {
    const no_conflicts = await checkMeetingTimesAndRoomConflictForBooking(
      start_time,
      duration,
      clusters,
      dbConnection
    );

    console.log(no_conflicts);
    if (no_conflicts === "Room Conflict") {
      try {
        await releaseLock();
      } catch (error) {
        return res.status(500).json({ error });
      }
      // await dbConnection.rollback();
      return res.status(409).json({
        type: "ROOM_CONFLICT",
        message:
          "Someone already booked this room. Please select a different one.",
      });
    } else if (no_conflicts === "Meeting Time Conflict") {
      // await dbConnection.rollback();
      try {
        await releaseLock();
      } catch (error) {
        return res.status(500).json({ error });
      }
      return res.status(409).json({
        type: "TIME_CONFLICT",
        message:
          "The participants in this meeting are no longer available. Please select a different time.",
      });
    }
  } catch (error) {
    // await dbConnection.rollback();
    try {
      await releaseLock();
    } catch (error) {
      return res.status(500).json({ error });
    }
    return res.status(500).json({
      error,
      message: "Error checking meeting-times and room conflict",
    });
  }

  const booking_id = await insertIntoBookingTable(
    userId,
    start_time,
    duration,
    meeting_title,
    dbConnection
  );

  async function handleBookingAdd(participant_ids, room_id) {
    try {
      const insertParticipateFlag = await insertIntoParticipant(
        booking_id,
        participant_ids,
        dbConnection
      );
      if (insertParticipateFlag !== 1) {
        // await dbConnection.rollback();
        try {
          await releaseLock();
        } catch (error) {
          return res.status(500).json({ error });
        }
        return res.status(500).json({
          message: `Error inserting into participate for booking id ${booking_id}`,
        });
      }

      for (var p_id of participant_ids) {
        await multiInsertIntoRoomBooking(
          booking_id,
          room_id,
          p_id,
          dbConnection
        );
      }
    } catch (error) {
      // await dbConnection.rollback();
      console.log(`Error booking room ${room_id}: `, error);
      try {
        await releaseLock();
      } catch (error) {
        return res.status(500).json({ error });
      }
      return res
        .status(500)
        .json({ error, message: `Error booking room ${room_id}` });
    }
  }

  for (var cluster of clusters) {
    const { participant_ids, room_id } = cluster;
    await handleBookingAdd(participant_ids, room_id);
  }

  try {
    await releaseLock();
    res.status(200).json({
      new_booking_id: booking_id,
      success: `Booking of room succeeded! Booking ID ${booking_id}!`,
    });
  } catch (error) {
    return res.status(500).json({ error });
  }
});

app.put("/bookings/deactivate/:bookingId", function (req, res) {
  const bookingId = req.params.bookingId;
  dbConnection.query(
    "update booking set is_active = false where booking.id = ?",
    [bookingId],
    function (error, results, fields) {
      if (error) {
        console.log(error);
        return res
          .status(500)
          .json({ error, message: "Error Deactivating booking." });
      } else {
        res.status(200).json({
          message: `Successfully deactivated booking id: ${bookingId}`,
        });
      }
    }
  );
});

app.put("/bookings/activate/:bookingId", function (req, res) {
  const bookingId = req.params.bookingId;
  dbConnection.query(
    "update booking set is_active = true where booking.id = ?",
    [bookingId],
    function (error, results, fields) {
      if (error) {
        console.log(error);
        return res
          .status(500)
          .json({ error, message: "Error Activating booking." });
      } else {
        res
          .status(200)
          .json({ message: `Successfully activated booking id: ${bookingId}` });
      }
    }
  );
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

async function insertFloorBuildingTable(
  floor_building,
  building_number,
  city_id
) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "insert into floor_building (floor_number, building_number, city_id) values ?",
      [[[floor_building, building_number, city_id]]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(1);
        }
      }
    );
  });
}

async function insertBuildingLocationTable(building_number, city_id, lat, lon) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "insert into temp_building_location (building_number, city_id, latitude, longitude) values ?",
      [[[building_number, city_id, lat, lon]]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(1);
        }
      }
    );
  });
}

app.post("/buildings/add", function (req, res) {
  const airport_code = req.body.airport_code;
  const building_number = req.body.building_number;
  const lat = req.body.lat;
  const lon = req.body.lon;
  const floor_number = req.body.floor_number;

  async function handleAddBuilding() {
    try {
      // await dbConnection.beginTransaction();
      const city_id = await getCityId(airport_code);
      const insertFloorBuildingFlag = await insertFloorBuildingTable(
        floor_number,
        building_number,
        city_id
      );
      if (insertFloorBuildingFlag !== 1) {
        // await dbConnection.rollback();
        return res
          .status(500)
          .json({ message: "Error adding into floor_building table." });
      }

      const insertBuildinglocationFlag = await insertBuildingLocationTable(
        building_number,
        city_id,
        lat,
        lon
      );

      if (insertBuildinglocationFlag !== 1) {
        // await dbConnection.rollback();
        return res
          .status(500)
          .json({ message: "Error adding into building_location table." });
      }

      initializeMaps();

      // await dbConnection.commit();
      res.status(200).json({
        message: `Successfully added new building with number: ${building_number}`,
      });
    } catch (error) {
      // await dbConnection.rollback();
      return res.status(500).json({ error, message: "Error adding building." });
    }
  }

  handleAddBuilding();
});

/****************************
 * Example post method *
 ****************************/

app.post("/bookings", function (req, res) {
  // Add your code here
  res.json({ success: "post call succeed!", url: req.url, body: req.body });
});

app.post("/bookings/*", function (req, res) {
  // Add your code here
  res.json({ success: "post call succeed!", url: req.url, body: req.body });
});

/****************************
 * Example put method *
 ****************************/

app.put("/bookings", function (req, res) {
  // Add your code here
  res.json({ success: "put call succeed!", url: req.url, body: req.body });
});

app.put("/bookings/*", function (req, res) {
  // Add your code here
  res.json({ success: "put call succeed!", url: req.url, body: req.body });
});

/****************************
 * Example delete method *
 ****************************/

app.delete("/bookings", function (req, res) {
  // Add your code here
  res.json({ success: "delete call succeed!", url: req.url });
});

app.delete("/bookings/*", function (req, res) {
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
