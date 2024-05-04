import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Define the initial state
const initialState = {
	rooms: [],
	loading: false,
	error: null,
};

// Create an async thunk to fetch data from the API
export const fetchAllRooms = createAsyncThunk(
	"rooms/fetchAllRooms",
	async (_, thunkAPI) => {
		try {
			const response = await axios.get(
				"https://xqmkevnwsc.execute-api.ca-central-1.amazonaws.com/dev/rooms"
			);
			return response.data;
		} catch (error) {
			// If an error occurs, reject the promise with the error message
			return thunkAPI.rejectWithValue(error.message);
		}
	}
);

// Create a slice
const roomsSlice = createSlice({
	name: "rooms",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchAllRooms.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchAllRooms.fulfilled, (state, action) => {
				state.loading = false;
				state.rooms = action.payload;
			})
			.addCase(fetchAllRooms.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

// Export actions and reducer
export const roomsActions = roomsSlice.actions;
export const roomsReducer = roomsSlice.reducer;
