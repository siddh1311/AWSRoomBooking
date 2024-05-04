import { roomsReducer } from "./features/rooms/roomsSlice";
import { configureStore } from "@reduxjs/toolkit";
import { userReducer } from "./features/currentUser/userSlice";
import searchReducer from "./features/mainPage/searchSlice";

const store = configureStore({
  reducer: {
    rooms: roomsReducer,
    currentUser: userReducer,
    search: searchReducer,
  },
  devTools: true,
});

export default store;
