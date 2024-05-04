import { BrowserRouter, Routes, Route } from "react-router-dom";
// aws
import { Amplify } from "aws-amplify";
import {
  Authenticator,
  ThemeProvider,
  useTheme,
  View,
} from "@aws-amplify/ui-react";
import config from "./amplifyconfiguration.json";
// routes
import SearchMain from "./components/mainPage/searchMain";
import ManageBookings from "./components/manageBookings";
import ManageUsers from "./components/manageUsers/manageUsers";
import ManageRooms from "./components/manageRooms";
import Booking from "./components/mainPage/booking";
import Navbar from "./components/others/navbar";
import PageNotFound from "./components/others/pageNotFound";
//cognito config
import { components, formFields } from "./components/authComp";

Amplify.configure(config);

function App() {
  const { tokens } = useTheme();
  const theme = {
    name: "Auth Theme",
    tokens: {
      components: {
        authenticator: {
          router: {
            boxShadow: `0 0 16px ${tokens.colors.overlay["10"]}`,
            borderWidth: "0",
          },
          form: {
            padding: `${tokens.space.medium} ${tokens.space.xl} ${tokens.space.medium}`,
          },
        },
        button: {
          primary: {
            backgroundColor: tokens.colors.neutral["100"],
          },
          link: {
            color: tokens.colors.blue["80"],
          },
        },
        fieldcontrol: {
          _focus: {
            boxShadow: `0 0 0 2px ${tokens.colors.blue["60"]}`,
          },
        },
        tabs: {
          item: {
            color: tokens.colors.neutral["80"],
            _active: {
              borderColor: tokens.colors.neutral["100"],
              color: tokens.colors.blue["100"],
            },
          },
        },
      },
    },
  };

  return (
    <>
      <ThemeProvider theme={theme}>
        <View>
          <Authenticator
            formFields={formFields}
            components={components}
            hideSignUp={true}
          >
            {({ signOut, user }) => {
              return (
                <>
                  <BrowserRouter>
                    <Routes>
                      <Route
                        path="/"
                        element={<Navbar signOut={signOut} user={user} />}
                      >
                        <Route index element={<SearchMain />} />
                        <Route
                          path="managebookings"
                          element={<ManageBookings />}
                        />
                        <Route path="managerooms" element={<ManageRooms />} />
                        <Route path="manageusers" element={<ManageUsers />} />
                        <Route path="booking" element={<Booking />} />
                        <Route path="*" element={<PageNotFound />} />
                      </Route>
                    </Routes>
                  </BrowserRouter>
                </>
              );
            }}
          </Authenticator>
        </View>
      </ThemeProvider>
    </>
  );
}

export default App;
