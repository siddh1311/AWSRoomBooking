import React, { useEffect } from "react";
import BookingsList from "./bookingsList.jsx";
import { useSelector, useDispatch } from "react-redux";
import { notification } from "antd";
import { setRoomBooked } from "../../redux/features/mainPage/searchSlice.js";
import { Link } from "react-router-dom";

const ManageBookings = () => {
  const { roomBooked } = useSelector((state) => state.search);

  const [api, contextHolder] = notification.useNotification({
    maxCount: 1
  });
  const dispatch = useDispatch();

  const successNotification = (message) => {
    api.success({
      message: message,
      placement: "bottomRight",
      duration: 3,
    });
  };

  useEffect(() => {
    if (roomBooked) {
      dispatch(setRoomBooked(false));
      successNotification("This room has been booked successfully!");
    }
  }, [roomBooked]);

  return (
    <>
      <div style={styles.main_container} className="p-12">
        {contextHolder}
        <div className="flex justify-between items-center py-8">
          <h1 className="text-2xl font-semibold">Manage Bookings</h1>
          <div className="flex justify-center items-center">
            <Link to="/" aria-current="page">
              <button style={styles.add_button}>+ Add Booking</button>
            </Link>
          </div>
        </div>

        <div>
          <BookingsList />
        </div>
      </div>
    </>
  );
};

const styles = {
  main_container: {
    marginTop: "64px",
    zIndex: "-1",
  },
  add_button: {
    margin: "5px",
    padding: "5px",
    border: "1px solid black",
    borderRadius: "5px",
    fontWeight: "bold",
  },
};

export default ManageBookings;
