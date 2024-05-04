import axios from "axios";

// ROOM APIS
const ROOM_BASE_URL =
  "https://xqmkevnwsc.execute-api.ca-central-1.amazonaws.com/dev/rooms";

export const getAllRooms = async () => {
  try {
    const response = await axios.get(ROOM_BASE_URL);
    return response.data.results;
  } catch (e) {
    throw e;
  }
};

export const addNewRoom = async (requestBody) => {
  try {
    const response = await axios.post(`${ROOM_BASE_URL}/add`, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (e) {
    throw e;
  }
};

export const uploadImportRooms = async (requestBody) => {
  try {
    const response = await axios.post(
      `${ROOM_BASE_URL}/addMultiple`,
      requestBody,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response;
  } catch (e) {
    throw e;
  }
};

export const toggleRoomStatusById = async (room) => {
  try {
    const response = await axios.put(
      `${ROOM_BASE_URL}/toggle-status/${room.id}`,
    );
    return response.data;
  } catch (e) {
    throw e;
  }
};

export const deleteRoomById = async (roomId) => {
  try {
    const response = await axios.delete(`${ROOM_BASE_URL}/delete/${roomId}`);
    return response.data;
  } catch (e) {
    throw e;
  }
};

export const editRoom = async (requestBody) => {
  try {
    const response = await axios.put(`${ROOM_BASE_URL}/edit`, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (e) {
    throw e;
  }
};

export const getBuildingIdsByCities = async () => {
  try {
    const response = await axios.get(
      `${ROOM_BASE_URL}/get-buildings-for-cities`,
    );
    return response.data;
  } catch (e) {
    throw e;
  }
};

// BOOKING APIS
const BOOKING_BASE_URL =
  "https://y1r7rljup0.execute-api.ca-central-1.amazonaws.com/dev";

export const getMultiSearch = async (userId, requestBody) => {
  try {
    const response = await axios.post(
      `${BOOKING_BASE_URL}/bookings/multi-search/${userId}`,
      requestBody,
    );
    return response.data;
  } catch (e) {
    throw e;
  }
};

export const addNewBuilding = async (requestBody) => {
  try {
    const response = await axios.post(
      `${BOOKING_BASE_URL}/buildings/add`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (e) {
    throw e;
  }
};

export const doMultiAddBooking = async (userId, requestBody) => {
  try {
    const response = await axios.post(
      `${BOOKING_BASE_URL}/bookings/multi-add-booking/${userId}`,
      requestBody,
    );
    return response;
  } catch (e) {
    throw e;
  }
};

export const getMeetingTimes = async (userId, requestBody) => {
  try {
    const response = await axios.post(
      `${BOOKING_BASE_URL}/bookings/meeting-times/${userId}`,
      requestBody,
    );
    return response.data.participatingTimes;
  } catch (e) {
    throw e;
  }
};

function processBookings(data) {
  const processedBookings = data.map((item) => {
    const [date, start_time] = item.start_time.split(" ");
    const { city, building_number, floor_number, room_number } = item;

    const location = `${city}${building_number} ${floor_number}.${room_number}`;

    return { ...item, date, start_time, location };
  });

  return processedBookings;
}

function processBookingsMulti(data) {
  const processedBookings = data.map((item) => {
    const [date, start_time] = item.start_time.split(" ");
    const { rooms } = item;

    const processedRooms = rooms.map((room) => {
      const { city, building_number, floor_number, room_number } = room;
      const location = `${city}${building_number} ${floor_number}.${room_number}`;
      return { ...room, location };
    });
    let ret = item;
    ret.rooms = processedRooms;
    return { ...ret, date, start_time };
  });

  return processedBookings;
}

export const getMyCreatedBookings = async (userId) => {
  try {
    const response = await axios.get(
      `${BOOKING_BASE_URL}/bookings/get-host/${userId}`,
    );

    const processedData = processBookings(response.data);
    return processedData;
  } catch (e) {
    throw e;
  }
};

export const getCreatedBookingsMulti = async (userId) => {
  try {
    const response = await axios.get(
      `${BOOKING_BASE_URL}/bookings/multi-get-host/${userId}`,
    );

    const processedData = processBookingsMulti(
      response.data.hosted_bookings_map,
    );
    return processedData;
  } catch (e) {
    throw e;
  }
};

export const getMyInvitedBookings = async (userId) => {
  try {
    const response = await axios.get(
      `${BOOKING_BASE_URL}/bookings/get-invite/${userId}`,
    );

    const processedData = processBookings(response.data);
    return processedData;
  } catch (e) {
    throw e;
  }
};

export const getInvitedBookingsMulti = async (userId) => {
  try {
    const response = await axios.get(
      `${BOOKING_BASE_URL}/bookings/multi-get-invite/${userId}`,
    );

    const processedData = processBookings(response.data.invited_details);
    return processedData;
  } catch (e) {
    throw e;
  }
};

export const deleteBookingById = async (bookingId) => {
  try {
    const response = await axios.delete(
      `${BOOKING_BASE_URL}/bookings/delete/${bookingId}`,
    );

    return response.data;
  } catch (e) {
    throw e;
  }
};

export const deactivateBookingById = async (bookingId) => {
  try {
    const response = await axios.put(
      `${BOOKING_BASE_URL}/bookings/deactivate/${bookingId}`,
    );

    return response.data;
  } catch (e) {
    throw e;
  }
};

export const activateBookingById = async (bookingId) => {
  try {
    const response = await axios.put(
      `${BOOKING_BASE_URL}/bookings/activate/${bookingId}`,
    );

    return response.data;
  } catch (e) {
    throw e;
  }
};

// USERS API
const EMPLOYEE_BASE_URL =
  "https://4l3434cs30.execute-api.ca-central-1.amazonaws.com/dev/users";

function processUserDetails(data) {
  const processedData = data.map((item) => {
    const {
      employee_name,
      employee_role,
      is_active,
      floor_number,
      building_number,
      airport_code,
    } = item;
    const location = `${airport_code}${building_number} ${floor_number}`;

    return {
      ...item,
      name: employee_name,
      location,
      role: employee_role,
      status: is_active,
    };
  });

  return processedData;
}

export const getAllUserDetails = async () => {
  try {
    const response = await axios.get(EMPLOYEE_BASE_URL);

    return processUserDetails(response.data.results);
  } catch (e) {
    throw e;
  }
};

export const getActive = async () => {
  try {
    const response = await axios.get(`${EMPLOYEE_BASE_URL}/getActive`);
    return response.data.results;
  } catch (e) {
    throw e;
  }
};

export const addUser = async (requestBody) => {
  try {
    const response = await axios.post(`${EMPLOYEE_BASE_URL}/add`, requestBody);

    return response;
  } catch (e) {
    throw e;
  }
};

export const updateUser = async (user, requestBody) => {
  try {
    const response = await axios.put(
      `${EMPLOYEE_BASE_URL}/update/${user}`,
      requestBody,
    );

    return response;
  } catch (e) {
    throw e;
  }
};

export const toggleStatus = async (user, requestBody) => {
  try {
    const response = await axios.put(
      `${EMPLOYEE_BASE_URL}/toggle-status/${user}`,
      requestBody,
    );

    return response;
  } catch (e) {
    throw e;
  }
};
