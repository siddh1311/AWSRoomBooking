import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchAuthSession } from "aws-amplify/auth";
const initialState = {
	isSignedIn: false,
	loading: true,
	authenticated: false,
	userEmail: "",
	userId: "",
	sessionGroup: "",
	role: "",
	idToken: {},
	error: null,
};

// Create an async thunk to fetch data from the API
export const fetchCurrentUser = createAsyncThunk(
	"currentUser/fetchCurrentUser",
	async (_, thunkAPI) => {
		try {
			const session = await fetchAuthSession();

			const tokens = session.tokens ?? {};
			const { accessToken } = tokens ?? {};
			const groups = accessToken.payload["cognito:groups"];

			const sessionGroup = groups && groups.length > 0 ? groups[0] : "User";
			const idToken = tokens.idToken.payload;
			const userEmail = idToken.email;
			const userId = idToken.sub;
			const role = idToken["custom:role"];

			return {
				authenticated: true,
				userEmail,
				userId,
				sessionGroup,
				idToken,
				role,
			};
		} catch (error) {
			// If an error occurs, reject the promise with the error message
			return thunkAPI.rejectWithValue(error.message);
		}
	}
);

// Create a slice
const userSlice = createSlice({
  name: "currentUser",
  initialState,
  reducers: {
    setCurrentUserTokens(state, action) {
      return { ...action.payload };
    },
    setSignedIn(state) {
      return { ...state, isSignedIn: true };
    },
    resetUserState(state) {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        return {
          ...state,
          ...action.payload,
          loading: false,
        };
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions and reducer
export const { setCurrentUserTokens, setSignedIn, resetUserState } =
  userSlice.actions;
export const userReducer = userSlice.reducer;
