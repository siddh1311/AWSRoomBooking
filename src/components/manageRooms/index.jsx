import UploadFileModal from "./uploadFileModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowUp } from "@fortawesome/free-solid-svg-icons";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { notification } from "antd";
import { tailChase } from "ldrs";
import { useSelector } from "react-redux";
import {
  addNewBuilding,
  addNewRoom,
  editRoom,
  deleteRoomById,
  getAllRooms,
  toggleRoomStatusById,
  getBuildingIdsByCities,
} from "../../apis/apis";
import RoomForm, {
  ADD_FORM_TYPE,
  EDIT_FORM_TYPE,
  NOT_SHOWN_FORM_TYPE,
} from "./roomForm";
import RoomTable from "./manageRoomTable";
import PopUpMessage, { POPUP_ERROR } from "./popUpMessage";
import { FORM_DEFAULT_VALUES } from "./roomForm";

const FACILITY_ID_MAP = {
  AV: 19,
  VC: 20,
  "AV/VC": 21,
  "N/A": 22,
};

const ManageRooms = () => {
  const [roomsData, setRoomsData] = useState([]);
  const [buildingNumbers, setBuildingNumbers] = useState([]);
  const [showPopUp, setShowPopUp] = useState(false);
  const [popUpMessage, setPopUpMessage] = useState("");
  const [roomFormType, setRoomFormType] = useState(NOT_SHOWN_FORM_TYPE);
  const [roomFormData, setRoomFormData] = useState({});
  const [api, contextHolder] = notification.useNotification();
  const [fetchingRoomsLoading, setFetchingLoading] = useState(true);
  const [isAddNewBuilding, setIsAddNewBuilding] = useState(false);
  const [buildingsByCities, setBuildingsByCities] = useState({});
  const [showModal, setShowModal] = useState(false);
  tailChase.register();

  const currentUserRole = useSelector(
    (state) => state.currentUser?.idToken?.["custom:role"],
  );

  async function fetchRoomsFromServer() {
    try {
      const response = await getAllRooms();
      setRoomsData(response);
      setBuildingNumbers([
        ...new Set(response.map((room) => room.building_number)),
      ]);
      setFetchingLoading(false);
    } catch (error) {
      console.log(error);
      warningNotification(
        "Error fetching data. Please try to refresh the page.",
      );
    }
  }

  async function fetchBuildingsByCities() {
    try {
      const response = await getBuildingIdsByCities();
      setBuildingsByCities(response);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchRoomsFromServer();
    fetchBuildingsByCities();
  }, []);

  const successNotification = (message) => {
    api.success({
      message: message,
      placement: "bottomRight",
      duration: 3,
    });
  };

  const warningNotification = (message) => {
    api.warning({
      message: message,
      placement: "bottomRight",
      duration: 3,
    });
  };

  if (currentUserRole !== "ADMIN") {
    return (
      <>
        <Navigate to="/" aria-current="page" />
      </>
    );
  }

  // function openPopUp() {
  //   setShowPopUp(true);
  // }

  function closePopUp() {
    setShowPopUp(false);
  }

  function closeRoomForm() {
    setRoomFormType(NOT_SHOWN_FORM_TYPE);
  }

  function setFacilityId(room_facility) {
    const facility = room_facility.facility;
    return { ...room_facility, ["facility_id"]: FACILITY_ID_MAP[facility] };
  }

  function isValidLatitude(lat) {
    const isWithinRange = lat >= -90 && lat <= 90;
    const isValidFormat = /^-?\d{1,2}(\.\d{1,6})?$/.test(lat);
    return isWithinRange && isValidFormat;
  }

  function isValidLongitude(lon) {
    const isWithinRange = lon >= -180 && lon <= 180;
    const isValidFormat = /^-?\d{1,3}(\.\d{1,6})?$/.test(lon);
    return isWithinRange && isValidFormat;
  }

  async function submitRoomForm() {
    if (roomFormData.room_number === "") {
      warningNotification("Please fill out a value for Room Number!");
      return;
    } else if (roomFormData.floor_number === "") {
      warningNotification("Please fill out a value for Floor Number!");
      return;
    } else if (roomFormData.building_number === "") {
      warningNotification("Please fill out a value for Building Number!");
      return;
    } 
    else if (roomFormData.latitude === "" && isAddNewBuilding) {
      warningNotification("Please fill out a value for Latitude!");
      return;
    } else if (roomFormData.longitude === "" && isAddNewBuilding) {
      warningNotification("Please fill out a value for Longitude!");
      return;
    } else if (roomFormData.capacity === "") {
      warningNotification("Please fill out a value for Capacity!");
      return;
    } else if (roomFormData.name === "") {
      roomFormData.name = "N/A";
      warningNotification('Room will be created with name "N/A"');
    } else if (!isValidLongitude(roomFormData.longitude) && isAddNewBuilding) {
      warningNotification(
        "The Longitude value is invalid. Ensure it is within -180 and 180 degrees and does not exceed 6 digits after the decimal point",
      );
      return;
    } else if (!isValidLatitude(roomFormData.latitude) && isAddNewBuilding) {
      warningNotification(
        "The Latitude value is invalid. Ensure it is within -90 and 90 degrees and does not exceed 6 digits after the decimal point.",
      );
      return;
    }

    const buildingRequestBody = {
      airport_code: roomFormData.airport_code,
      building_number: roomFormData.building_number,
      lat: roomFormData.latitude,
      lon: roomFormData.longitude,
      floor_number: roomFormData.floor_number
    };

    const { longitude, latitude, ...otherFormValues } = roomFormData;
    const roomRequestBody = JSON.stringify(setFacilityId(otherFormValues));

    try {
      if (isAddNewBuilding) {
        await addNewBuilding(buildingRequestBody);
      }
    } catch (e) {
      warningNotification("Error adding building!");
      return;
    }

    try {
      if (roomFormType === ADD_FORM_TYPE) {
        await addNewRoom(roomRequestBody);
      } else if (roomFormType === EDIT_FORM_TYPE) {
        await editRoom(roomRequestBody);
      }

      await fetchRoomsFromServer();
      if (roomFormType === ADD_FORM_TYPE) {
        successNotification(
          'Room "' + roomFormData.name + '" added successfully!',
        );
      } else if (roomFormType === EDIT_FORM_TYPE) {
        successNotification("Room edited successfully!");
      }
    } catch (error) {
      if (roomFormType === ADD_FORM_TYPE) {
        warningNotification("Error adding room!");
      } else if (roomFormType === EDIT_FORM_TYPE) {
        warningNotification("Error editing room!");
      }
      console.log(error);
    }
    setIsAddNewBuilding(false);
    fetchBuildingsByCities();
    closeRoomForm();
  }

  async function handleAddRoomFromTable() {
    setRoomFormType(ADD_FORM_TYPE);
    setRoomFormData(FORM_DEFAULT_VALUES);
  }

  async function handleEditRoomFromTable(room_facility) {
    setRoomFormType(EDIT_FORM_TYPE);
    setRoomFormData(room_facility);
  }

  async function handleRoomStatusFromTable(room) {
    try {
      const response = await toggleRoomStatusById(room);
      const fetch_response = await fetchRoomsFromServer();
      successNotification("Room activated/deactivated successfully!");
    } catch (error) {
      warningNotification("Error changing room status!");
      console.log(error);
    }
  }

  async function handleDeleteRoomFromTable(roomId) {
    try {
      const response = await deleteRoomById(roomId);
      const fetch_response = await fetchRoomsFromServer();
      successNotification("Room deleted successfully!");
    } catch (error) {
      warningNotification("Error deleting room!");
      console.log(error);
    }
  }

  return (
    <>
      <UploadFileModal
        show={showModal}
        setClose={() => {
          setShowModal(false);
        }}
        onSubmit={async () => {
          await fetchRoomsFromServer();
        }}
      />

      <div style={styles.main_container} className="p-12">
        {contextHolder}
        <div className="flex justify-between items-center py-8">
          <h1 className="text-2xl font-semibold">Manage Rooms</h1>

          <div className="flex justify-center items-center">
            <button style={styles.add_button} onClick={handleAddRoomFromTable}>
              + Add Room
            </button>
            <button
              style={styles.add_button}
              onClick={() => {
                setShowModal(true);
              }}
            >
              <FontAwesomeIcon icon={faFileArrowUp} className="mx-1" />
              <span>Import Rooms</span>
            </button>
          </div>
        </div>

        {roomFormType !== NOT_SHOWN_FORM_TYPE && (
          <RoomForm
            type={roomFormType}
            data={roomFormData}
            setData={setRoomFormData}
            submitForm={submitRoomForm}
            onClose={closeRoomForm}
            buildingNumbers={buildingNumbers}
            setParentIsAddNewBuilding={setIsAddNewBuilding}
            buildingsByCities={buildingsByCities}
          />
        )}
        {fetchingRoomsLoading && (
          <div className="mt-24 flex flex-col justify-center items-center self-center">
            <l-tail-chase size="80" speed="1.75" color="#1677ff"></l-tail-chase>
            <span className="text-center my-4 text-2xl font-bold text-[#1677ff]">
              Loading...
            </span>
          </div>
        )}
        {!fetchingRoomsLoading && (
          <RoomTable
            type={roomFormType}
            data={roomsData}
            handleDelete={handleDeleteRoomFromTable}
            handleEdit={handleEditRoomFromTable}
            handleStatus={handleRoomStatusFromTable}
          />
        )}
        {showPopUp && (
          <PopUpMessage
            message={popUpMessage}
            onClose={closePopUp}
            type={POPUP_ERROR}
          />
        )}
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

export default ManageRooms;
