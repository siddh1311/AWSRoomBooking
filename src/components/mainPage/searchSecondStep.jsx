import "react-big-calendar/lib/css/react-big-calendar.css";
import { Calendar, momentLocalizer } from "react-big-calendar";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { tailChase } from "ldrs";
import moment from "moment";
import "flatpickr/dist/themes/dark.css";
import { notification } from "antd";
import {
  setSearchStart,
  setSearchDuration,
  setModalError,
  setSelectedEvent,
  setCalendarUnavailableBlocks as setUnavailableBlocks,
} from "../../redux/features/mainPage/searchSlice";
import { getMeetingTimes } from "../../apis/apis";
// import axios from "axios";

const customLocalizer = momentLocalizer(moment);
customLocalizer.formats.eventTimeRangeFormat = (
  { start, end },
  culture,
  localizer,
) =>
  localizer.format(start, "hh:mm A", culture) +
  " - " +
  localizer.format(end, "hh:mm A", culture);

export default function SecondStep({ valueChanged }) {
  tailChase.register();
  const {
    startTime,
    duration,
    participants,
    date,
    selectedEvent,
    calendarUnavailableBlocks,
  } = useSelector((state) => state.search);

  const currentUserId = useSelector((state) => state.currentUser.userId);
  const [api, contextHolder] = notification.useNotification({
    maxCount: 1,
  });

  const errorNotification = (message) => {
    api.error({
      message: message,
      placement: "bottomRight",
      duration: 3,
    });
  };

  const [events, setEvents] = useState([]);
  const [fetchingAvailabilities, setFetchingAvailabilities] = useState(false);
  const dispatch = useDispatch();
  const [desierializedSelectedEvent, setDesierializedSelectedEvent] =
    useState(null);

  const [maxDuration, setMaxDuration] = useState();
  const [errors, setErrors] = useState({
    selectedDuration: {
      minDuration: {
        showError: false,
        message: "Minimum duration is 30 minutes",
      },
      maxDuration: {
        showError: false,
        message:
          "You can't increase the duration further as it exceeds the available time during that availablity slot",
      },
      notMultipleOf30: {
        showError: false,
        message: "Input has to be in multiples of 30 (e.g. 30, 60, 90, 120)",
      },
    },
  });
  const [hasError, setHasError] = useState(false);

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
    if (selectedEvent) {
      setDesierializedSelectedEvent({
        start: new Date(selectedEvent.start), // Deserialize start date from string
        end: new Date(selectedEvent.end), // Deserialize end date from string
        title: selectedEvent.title,
      });
    } else if (selectedEvent === null) {
      setDesierializedSelectedEvent(null);
    }
  }, [selectedEvent]);

  useEffect(() => {
    const durationInput = parseInt(duration);

    if (duration === "" || durationInput < 30) {
      updateErrorState("selectedDuration", "minDuration", true);
      updateErrorState("selectedDuration", "maxDuration", false);
      updateErrorState("selectedDuration", "notMultipleOf30", false);
    } else if (durationInput % 30 !== 0) {
      updateErrorState("selectedDuration", "minDuration", false);
      updateErrorState("selectedDuration", "maxDuration", false);
      updateErrorState("selectedDuration", "notMultipleOf30", true);
    } else if (durationInput >= maxDuration) {
      updateErrorState("selectedDuration", "maxDuration", true);
      updateErrorState("selectedDuration", "minDuration", false);
      updateErrorState("selectedDuration", "notMultipleOf30", false);
    } else {
      updateErrorState("selectedDuration", "minDuration", false);
      updateErrorState("selectedDuration", "maxDuration", false);
      updateErrorState("selectedDuration", "notMultipleOf30", false);
    }
  }, [duration, maxDuration]);

  useEffect(() => {
    const hasError =
      errors.selectedDuration.minDuration.showError ||
      errors.selectedDuration.notMultipleOf30.showError ||
      !startTime ||
      !desierializedSelectedEvent;

    dispatch(setModalError(hasError));

    setHasError(hasError);
  }, [
    errors.selectedDuration,
    startTime,
    desierializedSelectedEvent,
    setHasError,
  ]);

  function calculateMaxDuration(desierializedSelectedEvent, events) {
    let maxDuration = 30;
    let prevEnd = moment(desierializedSelectedEvent.end);

    events.some((slot) => {
      const slotStart = moment(slot.start);

      if (!slotStart.isSame(prevEnd)) {
        return false; // exit the for loop
      }

      // else update
      prevEnd = moment(slot.end);
      maxDuration += 30;
      return false; // Continue checking other slots
    });

    return maxDuration;
  }

  useEffect(() => {
    if (desierializedSelectedEvent && events.length > 0) {
      const maxDuration = calculateMaxDuration(
        desierializedSelectedEvent,
        events,
      );
      setMaxDuration(maxDuration);
    }
  }, [desierializedSelectedEvent, events]);

  const handleEventSelection = (event) => {
    const eventStart = moment(event.start).format("HH:mm");
    dispatch(
      setSelectedEvent({
        start: event.start.toISOString(), // Serialize start date to string
        end: event.end.toISOString(), // Serialize end date to string
        title: event.title,
      }),
    );
    dispatch(setSearchStart(eventStart));
    // Calculate duration in minutes for simplicity
    const eventDuration = moment(event.end).diff(
      moment(event.start),
      "minutes",
    );

    dispatch(setSearchDuration(eventDuration > 30 ? 30 : eventDuration));
  };

  const handleDurationChange = (e) => {
    if (!desierializedSelectedEvent) return; // Ensure there is a selected event
    const durationInput = parseInt(e.target.value);

    if (durationInput > maxDuration) {
      dispatch(setSearchDuration(maxDuration.toString()));
    } else {
      dispatch(setSearchDuration(e.target.value));
    }
  };

  useEffect(() => {
    if (Array.isArray(calendarUnavailableBlocks)) {
      const dayStartHour = 8; // Calendar day starts at 8:00 AM
      const dayEndHour = 19; // Calendar day ends at 7:00 PM
      const availableSlots = generateAvailableSlots(
        calendarUnavailableBlocks,
        dayStartHour,
        dayEndHour,
        date,
      );

      setEvents(availableSlots);
      if (availableSlots.length < 1) {
        errorNotification("No available times! Please select another date.");
      }
    }
  }, [calendarUnavailableBlocks]);

  useEffect(() => {
    const fetchUnavailableTimes = async () => {
      const data = {
        participant_ids: participants.map((item) => item.value),
        date: date,
      };
      setFetchingAvailabilities(true);
      try {
        if (participants?.length > 0 && date !== "") {
          const response = await getMeetingTimes(currentUserId, data);
          dispatch(setUnavailableBlocks(response));
          setFetchingAvailabilities(false);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    if (valueChanged) {
      dispatch(setSelectedEvent(null));
    }

    if (currentUserId) {
      fetchUnavailableTimes();
    }
  }, [valueChanged, currentUserId]);

  const eventStyleGetter = (event, start, end, isSelected) => {
    let withinTimeFrame = false;

    if (desierializedSelectedEvent) {
      const selectedEventStartTime = moment(desierializedSelectedEvent.start);
      const endTime = selectedEventStartTime.clone().add(duration, "minutes");
      withinTimeFrame = moment(start).isBetween(
        selectedEventStartTime,
        endTime,
      );
    }

    let style = {
      backgroundColor: isSelected || withinTimeFrame ? "green" : event.color,
      borderRadius: "5px",
      opacity: 0.8,
      color: "white",
      border: "0px",
      display: "block",
    };
    return {
      style: style,
    };
  };
  return (
    <>
      <div className="space-y-6 overflow-auto">
        {contextHolder}
        {fetchingAvailabilities ? (
          <div className="mt-24 flex flex-col justify-center items-center self-center">
            <l-tail-chase size="80" speed="1.75" color="#1677ff"></l-tail-chase>
            <span className="text-center my-4 text-2xl font-bold text-[#1677ff]">
              Loading...
            </span>
          </div>
        ) : (
          <div>
            <h2
              className={`text-center text-sm text-red-600 mb-4 ${!desierializedSelectedEvent ? "visible" : "invisible"}`}
            >
              Please select availability block and duration of your meeting
            </h2>

            <Calendar
              selected={desierializedSelectedEvent || null}
              localizer={customLocalizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 500 }}
              views={["day"]}
              defaultView="day"
              defaultDate={date}
              min={new Date().setHours(8, 0, 0, 0)}
              max={new Date().setHours(19, 0, 0, 0)}
              components={{
                toolbar: () => {
                  return null;
                },
              }}
              onSelectEvent={handleEventSelection}
              eventPropGetter={eventStyleGetter}
            />

            {desierializedSelectedEvent && (
              <div className="flex flex-col mt-4">
                <div className="flex pb-3 items-center">
                  <span className="font-semibold">Duration</span>
                </div>
                <select
                  style={{
                    borderColor: "hsl(0, 0%, 80%)",
                    borderRadius: "4px",
                    margin: "0 2px",
                  }}
                  value={duration}
                  onChange={handleDurationChange}
                >
                  <option value="30">0.5 hr</option>
                  <option value="60">1 hr</option>
                  <option value="90">1.5 hrs</option>
                  <option value="120">2 hrs</option>
                  <option value="150">2.5 hrs</option>
                  <option value="180">3 hrs</option>
                  <option value="210">3.5 hrs</option>
                  <option value="240">4 hrs</option>
                  <option value="270">4.5 hrs</option>
                  <option value="300">5 hrs</option>
                </select>

                <div className="h-8">
                  {errors.selectedDuration.minDuration.showError && (
                    <span className="text-sm text-red-600 my-2">
                      {errors.selectedDuration.minDuration.message}
                    </span>
                  )}
                  {errors.selectedDuration.maxDuration.showError && (
                    <span className="text-sm text-red-600 my-2">
                      {errors.selectedDuration.maxDuration.message}
                    </span>
                  )}
                  {errors.selectedDuration.notMultipleOf30.showError && (
                    <span className="text-sm text-red-600 my-2">
                      {errors.selectedDuration.notMultipleOf30.message}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function addMinutes(date, minutes) {
  return moment(date).add(minutes, "minutes").toDate();
}

// Convert and normalize unavailabilities to intervals of 30 minutes
function convertAndNormalizeUnavailabilities(unavailabilities) {
  return unavailabilities?.map(({ start_time, length }) => {
    const start = moment(start_time).toDate();
    const end = addMinutes(start, Math.ceil(length / 30) * 30); // Round up to the nearest 30-minute interval
    return { start, end };
  });
}

// Merge overlapping unavailabilities
function mergeUnavailabilities(unavailabilities) {
  unavailabilities.sort((a, b) => a.start - b.start);

  const merged = [];
  unavailabilities.forEach((unavailability) => {
    if (
      !merged.length ||
      unavailability.start > merged[merged.length - 1].end
    ) {
      merged.push(unavailability);
    } else {
      merged[merged.length - 1].end = new Date(
        Math.max(merged[merged.length - 1].end, unavailability.end),
      );
    }
  });
  return merged;
}

// Generate available time slots, excluding unavailability periods
function generateAvailableSlots(
  unavailabilities,
  dayStartHour,
  dayEndHour,
  date,
) {
  const mergedUnavailabilities = mergeUnavailabilities(
    convertAndNormalizeUnavailabilities(unavailabilities),
  );
  const availableSlots = [];
  const dayStart = moment(date).set({ hour: dayStartHour, minute: 0 });
  const dayEnd = moment(date).set({ hour: dayEndHour, minute: 0 });

  const now = moment(); // Get the current time
  let currentSlotStart = dayStart.clone();

  while (currentSlotStart.isBefore(dayEnd)) {
    const slotEnd = moment.min(
      currentSlotStart.clone().add(30, "minutes"),
      dayEnd,
    );
    let isAvailable = true;
    mergedUnavailabilities.forEach((unavailability) => {
      if (
        currentSlotStart.isSameOrAfter(unavailability.start) &&
        currentSlotStart.isBefore(unavailability.end)
      ) {
        isAvailable = false;
      }
    });

    // Only add the slot if it is available and its end time is in the future relative to the current time
    if (isAvailable && slotEnd.isAfter(now)) {
      availableSlots.push({
        start: currentSlotStart.toDate(),
        end: slotEnd.toDate(),
        title: "",
      });
    }
    currentSlotStart.add(30, "minutes");
  }

  return availableSlots;
}
