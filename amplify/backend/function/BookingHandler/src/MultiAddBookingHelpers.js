function formatDate(start_time) {
  // Assuming start_time is in the format "YYYY-MM-DD HH:MM:SS"
  return start_time.replace(" ", "T");
}

function insertIntoBookingTable(
  organizer_id,
  start_time,
  duration,
  meeting_title,
  dbConnection
) {
  return new Promise((resolve, reject) => {
    let formatted_start_time = formatDate(start_time);
    let query = `insert into booking (organizer_id, start_time, length, meeting_title) values ?`;
    dbConnection.query(
      query,
      [[[organizer_id, formatted_start_time, duration, meeting_title]]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          dbConnection.query("SELECT LAST_INSERT_ID()", function (err, r, f) {
            if (err) {
              reject(err);
            } else {
              resolve(r[0]["LAST_INSERT_ID()"]);
            }
          });
        }
      }
    );
  });
}

function insertIntoParticipant(booking_id, participant_ids, dbConnection) {
  return new Promise((resolve, reject) => {
    const values = participant_ids.map((participantId) => [
      booking_id,
      participantId,
    ]);
    let query = `insert into participate (booking_id, participant_id) values ?`;
    dbConnection.query(query, [values], function (error, results, fields) {
      if (error) {
        return reject(error);
      } else {
        return resolve(1); // flag
      }
    });
  });
}

function multiInsertIntoRoomBooking(
  booking_id,
  room_id,
  participant_id,
  dbConnection
) {
  return new Promise((resolve, reject) => {
    let query = `insert into room_booking (room_id, booking_id, participant_id) values ?`;
    dbConnection.query(
      query,
      [[[room_id, booking_id, participant_id]]],
      function (error, results, fields) {
        if (error) {
          return reject(error);
        } else {
          return resolve(1); // flag
        }
      }
    );
  });
}

function getAllBookingsForRoom(room_id, dbConnection) {
  return new Promise((resolve, reject) => {
    let query = `select distinct rb.booking_id from room_booking as rb where rb.room_id = ?`;
    dbConnection.query(query, [room_id], function (error, results, fields) {
      if (error) {
        reject(error);
      } else {
        let plainResults = JSON.parse(JSON.stringify(results));
        plainResults = plainResults.map((item) => item.booking_id);
        resolve(plainResults);
      }
    });
  });
}

function getAllBookingsForParticipants(participan_ids, dbConnection) {
  return new Promise((resolve, reject) => {
    let query = `select distinct rb.booking_id from room_booking as rb where rb.participant_id in ?`;
    dbConnection.query(
      query,
      [[participan_ids]],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          let plainResults = JSON.parse(JSON.stringify(results));
          plainResults = plainResults.map((item) => item.booking_id);
          resolve(plainResults);
        }
      }
    );
  });
}

function getIntersectingBookingsForRoom(
  room_booking_ids,
  start_time,
  duration,
  dbConnection
) {
  return new Promise((resolve, reject) => {
    let query = `select * from booking as b where b.is_active = 1 and b.id in ? and
    (
        b.start_time < DATE_ADD(?, INTERVAL ? MINUTE) and
        ? < DATE_ADD(b.start_time, INTERVAL b.length MINUTE)
    )`;
    dbConnection.query(
      query,
      [[room_booking_ids], start_time, duration, start_time],
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

function getIntersectingBookingsForMeetingTimes(
  participant_booking_ids,
  start_time,
  duration,
  dbConnection
) {
  console.log(participant_booking_ids);
  return new Promise((resolve, reject) => {
    let query = `select * from booking as b where b.is_active = 1 and b.id in ? and
      (
          b.start_time < DATE_ADD(?, INTERVAL ? MINUTE) and
          ? < DATE_ADD(b.start_time, INTERVAL b.length MINUTE)
      )`;
    dbConnection.query(
      query,
      [[participant_booking_ids], start_time, duration, start_time],
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

async function checkRoomConflictHelper(
  start_time,
  duration,
  room_id,
  dbConnection
) {
  try {
    let room_booking_ids = await getAllBookingsForRoom(room_id, dbConnection);
    if (room_booking_ids.length === 0) {
      return true;
    }
    let intersecting_bookings_for_room = await getIntersectingBookingsForRoom(
      room_booking_ids,
      start_time,
      duration,
      dbConnection
    );
    console.log(intersecting_bookings_for_room);
    // console.log(intersecting_bookings_for_room.length);
    if (intersecting_bookings_for_room.length > 0) {
      // There is at least 1 intersecting booking for this room
      return false;
    }
    return true;
  } catch (error) {
    console.log("Error checking room conflicts: ", error);
    throw new Error(error);
  }
}

async function checkMeetingTimesConflictHelper(
  start_time,
  duration,
  participant_ids,
  room_id,
  dbConnection
) {
  try {
    let participant_booking_ids = await getAllBookingsForParticipants(
      participant_ids,
      dbConnection
    );
    if (participant_booking_ids.length === 0) {
      return true;
    }
    console.log(participant_booking_ids);
    let intersecting_bookings_for_times =
      await getIntersectingBookingsForMeetingTimes(
        participant_booking_ids,
        start_time,
        duration,
        dbConnection
      );
    console.log("INTERSECTING BOOKING TIMES: ");
    console.log(intersecting_bookings_for_times);
    if (intersecting_bookings_for_times.length > 0) {
      // There is at least 1 intersecting booking for this set of participants
      return false;
    }
    return true;
  } catch (error) {
    console.log("Error checking meeting times conflicts: ", error);
    throw new Error(error);
  }
}

async function checkMeetingTimesAndRoomConflictForBooking(
  start_time,
  duration,
  clusters,
  dbConnection
) {
  try {
    let formatted_time = formatDate(start_time);
    for (var current_cluster of clusters) {
      var participant_ids = current_cluster.participant_ids;
      var room_id = current_cluster.room_id;
      const no_room_conflicts = await checkRoomConflictHelper(
        formatted_time,
        duration,
        room_id,
        dbConnection
      );
      //   console.log(no_room_conflicts);
      if (no_room_conflicts === false) {
        return "Room Conflict";
      }

      const no_times_conflict = await checkMeetingTimesConflictHelper(
        formatted_time,
        duration,
        participant_ids,
        room_id,
        dbConnection
      );

      if (no_times_conflict === false) {
        return "Meeting Time Conflict";
      }
    }
    return "No Conflict";
  } catch (error) {
    console.log("Error checking meeting-times and room conflict: ", error);
    throw new Error(error);
  }
}

module.exports = {
  insertIntoBookingTable,
  insertIntoParticipant,
  multiInsertIntoRoomBooking,
  checkMeetingTimesAndRoomConflictForBooking,
};
