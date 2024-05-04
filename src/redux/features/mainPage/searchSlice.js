import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  startTime: "",
  duration: "",
  date: "",
  facilities: [],
  participants: [],
  numRooms: 1,
  error: false,
  searchClicked: false,
  roomBooked: false,
  selectedEvent: null,
  calendarUnavailableBlocks: [],
  editMode: false,
};

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setSearchStart(state, action) {
      state.startTime = action.payload;
    },
    setSearchDuration(state, action) {
      state.duration = action.payload;
    },
    setSearchDate(state, action) {
      state.date = action.payload;
    },
    setSearchFacilities(state, action) {
      state.facilities = action.payload;
    },
    setSearchParticipants(state, action) {
      state.participants = action.payload;
    },
    setSearchNumRooms(state, action) {
      state.numRooms = action.payload;
    },
    setModalError(state, action) {
      state.error = action.payload;
    },
    setSearchClicked(state, action) {
      state.searchClicked = action.payload;
    },
    setRoomBooked(state, action) {
      state.roomBooked = action.payload;
    },
    setSelectedEvent(state, action) {
      state.selectedEvent = action.payload;
    },
    setCalendarUnavailableBlocks(state, action) {
      state.calendarUnavailableBlocks = action.payload;
    },
    setEditState(state, action) {
      state.startTime = action.payload.start_time;
      state.duration = action.payload.length;
      state.date = action.payload.date;
      state.facilities = action.payload.facilities;
      state.participants = action.payload.employee_email_name;
      state.numRooms = action.payload.numRooms;
      state.error = false;
      state.searchClicked = false;
      state.roomBooked = false;
      state.selectedEvent = null;
      state.calendarUnavailableBlocks = [];
      state.editMode = true;

      state.booking_title = action.payload.meeting_title;
      state.booking_id = action.payload.booking_id;
    },
    setConflictSearchState(state, action) {
      return {
        ...state,
        startTime: "",
        duration: "",
        error: false,
        searchClicked: false,
        roomBooked: false,
        selectedEvent: null,
        calendarUnavailableBlocks: [],
        editMode: false,
      };
    },
    clearSearchState(state) {
      return initialState;
    },
  },
});

export const {
  setSearchStart,
  setSearchDuration,
  setSearchDate,
  setSearchFacilities,
  setSearchParticipants,
  setSearchNumRooms,
  setModalError,
  clearSearchState,
  setSearchClicked,
  setRoomBooked,
  setSelectedEvent,
  setCalendarUnavailableBlocks,
  setEditState,
  setConflictSearchState,
} = searchSlice.actions;

export default searchSlice.reducer;
