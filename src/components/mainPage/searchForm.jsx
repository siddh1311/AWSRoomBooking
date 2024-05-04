// ref: https://tailkit.com/free-ui-components
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronRight,
  faChevronLeft,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import Select, { components } from "react-select";
import {
  Checkbox,
  InputNumber,
  ConfigProvider,
  Popover,
  notification,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/dark.css";
import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import moment from "moment";
import { useSelector, useDispatch } from "react-redux";
import SecondStep from "./searchSecondStep";
import {
  setSearchDate,
  setSearchFacilities,
  setSearchParticipants,
  setSearchNumRooms,
  setSearchClicked,
  clearSearchState,
} from "../../redux/features/mainPage/searchSlice";
import { filter, isEqual } from "lodash";
import { activateBookingById, getActive } from "../../apis/apis";

// ref: https://contactmentor.com/react-dropdown-search-multi-select/

export default function SearchForm() {
  const {
    error,
    date,
    facilities,
    participants,
    numRooms,
    startTime,
    duration,
    editMode,
    booking_id,
  } = useSelector((state) => state.search);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const FACILITIES = [
    { value: "AV", label: "Audio Visual" },
    { value: "VC", label: "Video Conferencing" },
  ];

  const [api, contextHolder] = notification.useNotification();

  const currentUser = useSelector((state) => state.currentUser);
  const currentUserId = currentUser.userId;
  const [currentUserCityId, setCurrentUserCityId] = useState("");

  const [users, setUsers] = useState([]);
  const participantsRef = useRef(null);

  // these for keep track of value changes of participants and date
  const [valueChanged, setValueChanged] = useState(false);
  const prevParticipantsRef = useRef(participants);
  const prevDateRef = useRef(date);

  const errorNotification = (message) => {
    api.error({
      message: message,
      placement: "bottomRight",
      duration: 3,
    });
  };

  const infoNotification = (message) => {
    api.info({
      message: message,
      placement: "bottomRight",
      duration: 2,
    });
  };

  useEffect(() => {
    // Perform deep equality check for participants and date
    const participantsEqual = isEqual(
      participants,
      prevParticipantsRef.current,
    );
    const dateEqual = isEqual(date, prevDateRef.current);

    // If either participants or date changed deeply, set valueChanged to true
    if (!participantsEqual || !dateEqual) {
      setValueChanged(true);
    }

    // Update previous values for the next comparison
    prevParticipantsRef.current = participants;
    prevDateRef.current = date;
  }, [participants, date]);

  useEffect(() => {
    if (!date) {
      let today = moment(new Date());
      const now = new Date();

      // Check if current time is past 7 PM and adjust the date to the next day if so
      if (now.getHours() >= 19) {
        today = today.add(1, "days"); // Move to the next day if it's past 7 PM
      }

      let daysToAdd = 0;
      const weekday = today.day(); // Get the day of the week for the adjusted date (0-6)

      // Adjust daysToAdd based on the current or next day being a weekend
      if (weekday === 6) {
        // Saturday
        daysToAdd = 2; // Move to Monday
      } else if (weekday === 0) {
        // Sunday
        daysToAdd = 1; // Move to Monday
      }

      const nextAvailableDate = today
        .add(daysToAdd, "days")
        .format("YYYY-MM-DD");

      dispatch(setSearchDate(nextAvailableDate));
    }
  }, [date]);

  const [isParticipantMenuOpen, setIsParticipantMenuOpen] = useState(false);
  const [isFacilitiesMenuOpen, setIsFacilitiesMenuOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  const [errors, setErrors] = useState({
    selectParticipants: {
      notSelected: {
        showError: false,
        message: "Please select participants first",
      },
    },
  });

  const updateErrorState = (errorType, errorName, value) => {
    setErrors((prevErrors) => ({
      ...prevErrors,
      [errorType]: {
        ...prevErrors[errorType],
        [errorName]: {
          ...prevErrors[errorType][errorName],
          showError: value,
        },
      },
    }));
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getActive();
        const currUser = data.find((user) => user.id === currentUserId);
        setCurrentUserCityId(currUser.city_id);

        const filteredData = data.filter((user) => user.id !== currentUserId);

        const transformedUsers = filteredData.map((user) => ({
          value: user.id,
          label: user.name,
          email: user.email,
          city_id: user.city_id,
        }));

        setUsers(transformedUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    if (currentUserId) fetchUsers();
  }, [currentUserId]);

  const handleInputChange = (value) => {
    setInputValue(value);
    setIsParticipantMenuOpen(value.length > 0);
  };

  const FacilitiesOption = (props) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <Checkbox>
          <span className="pl-2 text-left">{`${data.label}`}</span>
        </Checkbox>
      </components.Option>
    );
  };

  const ParticipantsOption = (props) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <div className="flex flex-col">
          <span>{`${data.label}`}</span>
          <span>{`${data.email}`}</span>
        </div>
      </components.Option>
    );
  };

  const fullFacilities = [
    {
      value: "AV",
      label: "Audio Visual",
    },
    {
      value: "VC",
      label: "Video Conferencing",
    },
  ];

  useEffect(() => {
    if (currentStep === 1) {
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  return (
    <>
      <form className="flex flex-col w-full p-4 pb-0 justify-between">
        {contextHolder}
        {currentStep === 1 && (
          <div className="flex flex-col">
            <span className="pt-4 pb-8 text-lg font-bold">
              Step 1: Enter the following fields
            </span>
            <div className="flex flex-wrap items-baseline gap-3 w-full">
              <div className="flex flex-col flex-1">
                <div className="flex flex-col">
                  <div className="flex pb-3 items-center">
                    <span className="font-semibold">Participants</span>
                    <Popover
                      content={
                        <div>
                          <p>
                            You are always included in the participants list.
                          </p>
                        </div>
                      }
                    >
                      <InfoCircleOutlined className="ml-1" />
                    </Popover>
                  </div>
                  <Select
                    ref={participantsRef}
                    className="min-w-[12.5rem]"
                    options={users}
                    placeholder="Search Participants"
                    value={participants}
                    onChange={(data) => {
                      dispatch(setSearchParticipants(data));
                      if (data.length > 0) {
                        updateErrorState(
                          "selectParticipants",
                          "notSelected",
                          false,
                        );
                      }
                      if (data.length + 1 < numRooms) {
                        infoNotification(
                          `Setting number of rooms to ${data.length + 1} as there are not enough users for this number of rooms.`,
                        );
                        dispatch(setSearchNumRooms(data.length + 1));
                      }
                      const uniqueCities = new Set([
                        ...data.map((participant) => participant.city_id),
                        currentUserCityId,
                      ]);
                      // console.log(uniqueCities);
                      if (numRooms < uniqueCities.size) {
                        infoNotification(
                          `Setting number of rooms to ${uniqueCities.size} as this user is in a different city.`,
                        );
                        dispatch(setSearchNumRooms(uniqueCities.size));
                        if (uniqueCities.size > 1 && facilities.length < 2) {
                          infoNotification(
                            `Setting AV/VC for meeting with multiple rooms.`,
                          );
                          dispatch(setSearchFacilities(fullFacilities));
                        }
                      }
                    }}
                    onInputChange={handleInputChange}
                    isSearchable={true}
                    isMulti
                    menuIsOpen={isParticipantMenuOpen}
                    noOptionsMessage={() => {
                      return "No employee with this name found";
                    }}
                    inputValue={inputValue}
                    components={{
                      DropdownIndicator: () => null,
                      IndicatorSeparator: () => null,
                      Option: ParticipantsOption,
                    }}
                  />
                </div>

                <div
                  className={`text-red-500 ${errors.selectParticipants.notSelected.showError ? "visibile" : "invisible"}`}
                >
                  {errors.selectParticipants.notSelected.message}
                </div>
              </div>
              <div id="flatpickr-container" className="flex flex-col flex-1">
                <div className="flex pb-3 items-center">
                  <span className="font-semibold">Date</span>
                </div>
                <Flatpickr
                  value={date}
                  options={{
                    altInput: true,
                    altFormat: "F j, Y",
                    dateFormat: "Y-m-d",
                    disable: [
                      function (date) {
                        const isWeekend =
                          date.getDay() === 0 || date.getDay() === 6;

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const now = new Date();
                        const isTodayAfter7PM =
                          now.getDate() === date.getDate() &&
                          now.getMonth() === date.getMonth() &&
                          now.getFullYear() === date.getFullYear() &&
                          now.getHours() >= 19; // Checks if it's past 7 PM today

                        const isBeforeToday = date < today;
                        return isWeekend || isBeforeToday || isTodayAfter7PM;
                      },
                    ],
                  }}
                  onChange={([selectedDate]) => {
                    const formattedDate =
                      moment(selectedDate).format("YYYY-MM-DD");
                    dispatch(setSearchDate(formattedDate));
                  }}
                />
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex pb-3 items-center">
                  <span className="font-semibold mr-1">Facilities</span>
                  <Popover
                    content={
                      <div>
                        <p>
                          When booking multiple rooms, AV/VC <b>must</b> be
                          enabled.
                        </p>
                      </div>
                    }
                  >
                    <InfoCircleOutlined />
                  </Popover>
                </div>
                <Select
                  className="min-w-[15.5rem]"
                  placeholder="Select Facilities"
                  formFieldName={"facilities"}
                  options={FACILITIES}
                  value={facilities}
                  onMenuOpen={() => {
                    setIsFacilitiesMenuOpen(facilities.length < 2);
                  }}
                  onChange={(e) => {
                    if (numRooms < 2) {
                      dispatch(setSearchFacilities(e));
                    } else {
                      errorNotification(
                        "AV/VC must be enabled for meetings with multiple rooms!",
                      );
                    }
                    if (e.length >= 2) {
                      setIsFacilitiesMenuOpen(false);
                    }
                  }}
                  isMulti
                  closeMenuOnSelect={false}
                  components={{ Option: FacilitiesOption }}
                  isSearchable={false}
                  menuIsOpen={isFacilitiesMenuOpen}
                />
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex pb-3 items-center">
                  <span className="font-semibold mr-1">Number of Rooms</span>
                  <Popover
                    content={
                      <div>
                        <p>
                          When booking multiple rooms, participants will be
                          assigned to groups that
                        </p>
                        <p>
                          minimize total travel distance to their destinations.
                        </p>
                        <br></br>
                        <p>
                          Number of rooms must be <b>less than or equal to</b>{" "}
                          number of total participants.
                        </p>
                      </div>
                    }
                  >
                    <InfoCircleOutlined />
                  </Popover>
                </div>
                <ConfigProvider
                  theme={{
                    components: {
                      InputNumber: {
                        inputFontSize: 17,
                      },
                    },
                  }}
                >
                  <InputNumber
                    className="w-full"
                    defaultValue="1"
                    value={numRooms}
                    onChange={(value) => {
                      // Check # rooms <= # of participants
                      if (value === null) {
                        dispatch(setSearchNumRooms(value));
                      } else if (value > participants.length + 1) {
                        errorNotification(
                          `Number of rooms must be less than or equal to total number of participants. Changing value back to: ${participants.length + 1}`,
                        );
                        dispatch(setSearchNumRooms(participants.length + 1));
                      } else {
                        // Check # of rooms >= # of cities
                        const uniqueCities = new Set([
                          ...participants.map((item) => item.city_id),
                          currentUserCityId,
                        ]);
                        // console.log(uniqueCities);

                        if (value < uniqueCities.size) {
                          errorNotification(
                            `Number of rooms must be greater than or equal to number of unique cities. Changing value back to: ${uniqueCities.size}`,
                          );
                          dispatch(setSearchNumRooms(uniqueCities.size));
                        } else {
                          dispatch(setSearchNumRooms(value));
                        }
                      }

                      if (value > 1 && facilities.length < 2) {
                        infoNotification(
                          "Setting AV/VC for this meeting between multiple rooms.",
                        );
                        dispatch(setSearchFacilities(fullFacilities));
                      }
                    }}
                  />
                </ConfigProvider>
              </div>
            </div>
            <div className="flex flex-col py-4">
              <button
                type="button"
                className="inline-flex items-center shadow-md justify-center space-x-2 rounded-none border border-slate-600 bg-slate-600 px-4 py-2 font-semibold leading-6 text-white hover:border-slate-500 hover:bg-slate-500 hover:text-white focus:ring focus:ring-slate-400 focus:ring-opacity-50 active:border-slate-700 active:bg-slate-700 dark:focus:ring-slate-400 dark:focus:ring-opacity-90"
                onClick={(e) => {
                  if (participants.length < 1) {
                    updateErrorState("selectParticipants", "notSelected", true);
                    participantsRef.current.focus();
                  } else if (numRooms === null) {
                    errorNotification("Please specify a value for Number of Rooms.");
                  } else {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentStep(2);
                  }
                }}
              >
                <span>Next</span>
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        )}
        {currentStep === 2 && (
          <div className="flex flex-col">
            <span className="pt-4 pb-8 text-lg font-bold">
              Step 2: Select start time and duration
            </span>
            <SecondStep valueChanged={valueChanged} />

            <div className="flex w-full my-8">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setValueChanged(false);
                }}
                className="inline-flex w-full mr-2 items-center shadow-md justify-center space-x-2 rounded-none border border-slate-600 bg-slate-600 px-4 py-2 font-semibold leading-6 text-white hover:border-slate-500 hover:bg-slate-500 hover:text-white focus:ring focus:ring-slate-400 focus:ring-opacity-50 active:border-slate-700 active:bg-slate-700 dark:focus:ring-slate-400 dark:focus:ring-opacity-90"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
                <span>Back</span>
              </button>
              {!error && (
                <div className="w-full ">
                  <Link
                    to="/booking"
                    aria-current="page"
                    onClick={() => {
                      dispatch(setSearchClicked(true));
                      setCurrentStep(1);
                      setValueChanged(false);
                    }}
                  >
                    <button
                      type="button"
                      className="w-full ml-2 inline-flexitems-center shadow-md justify-center space-x-2 rounded-none border border-slate-600 bg-slate-600 px-4 py-2 font-semibold leading-6 text-white hover:border-slate-500 hover:bg-slate-500 hover:text-white focus:ring focus:ring-slate-400 focus:ring-opacity-50 active:border-slate-700 active:bg-slate-700 dark:focus:ring-slate-400 dark:focus:ring-opacity-90"
                      id="searchButton"
                    >
                      <span>Search</span>
                      <FontAwesomeIcon icon={faSearch} />
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
        {editMode && (
          <button
            type="button"
            className="inline-flex items-center shadow-md justify-center space-x-2 rounded-none border border-slate-600 bg-red-600 px-4 py-2 font-semibold leading-6 text-white hover:border-slate-500 hover:bg-slate-500 hover:text-white focus:ring focus:ring-slate-400 focus:ring-opacity-50 active:border-slate-700 active:bg-slate-700 dark:focus:ring-slate-400 dark:focus:ring-opacity-90 mt-2"
            onClick={(e) => {
              try {
                activateBookingById(booking_id);
                dispatch(clearSearchState());
                navigate("/managebookings");
              } catch (e) {
                console.log(e);
              }
            }}
          >
            <span>Cancel Edit</span>
          </button>
        )}
      </form>
    </>
  );
}
