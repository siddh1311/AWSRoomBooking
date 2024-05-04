import React, { useState, useRef } from "react";
import { Button, Label, Modal, TextInput, Select } from "flowbite-react";
import { Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

export const ADD_FORM_TYPE = "ADD";
export const EDIT_FORM_TYPE = "EDIT";
export const NOT_SHOWN_FORM_TYPE = "NOT_SHOWN";

export const FORM_DEFAULT_VALUES = {
  name: "",
  room_number: "",
  floor_number: "",
  building_number: "",
  capacity: "",
  airport_code: "",
  facility: "N/A",
  longitude: "",
  latitude: "",
};

const ADD_FORM_TITLE = "Add a new room";
const EDIT_FORM_TITLE = "Edit the room with ID ";
const FLOOR_NUMBER_ERROR_MSG =
  "Floor number must be a number in the range 1-50";
const CAPACITY_ERROR_MSG = "Capacity must be a number in the range 1-100";
const ROOM_NUMBER_ERROR_MSG = "Room number must be a number in the range 1-999";
const BUILDING_NUMBER_ERROR_MSG =
  "Building number must be a number in the range 1-999";

const RoomForm = ({
  type,
  data,
  setData,
  submitForm,
  onClose,
  buildingNumbers,
  setParentIsAddNewBuilding,
  buildingsByCities,
}) => {
  let formTitle =
    type === ADD_FORM_TYPE ? ADD_FORM_TITLE : EDIT_FORM_TITLE + data.id;

  const onChange = (e) => {
    setData((prevData) => ({
      ...prevData,
      [e.target.id]: e.target.value,
    }));
  };

  const onSubmit = () => {
    submitForm();
  };

  const [addNewBuilding, toggleAddNewBuilding] = useState(false);
  const [savedBuildingNumber, setSavedBuildingNumber] = useState("");
  const [roomNumberFieldError, setRoomNumberFieldError] = useState(false);
  const [floorNumberFieldError, setFloorNumberFieldError] = useState(false);
  const [capacityFieldError, setCapacityFieldError] = useState(false);
  const [buildingNumberFieldError, setBuildingNumberFieldError] =
    useState(false);

  const formValid = !(
    roomNumberFieldError ||
    floorNumberFieldError ||
    capacityFieldError ||
    buildingNumberFieldError
  );

  const validateNumberField = (input, min, max) => {
    return input >= min && input <= max;
  };

  return (
    <>
      <Modal show={true} size="md" onClose={onClose} popup>
        <Modal.Header className="m-4">{formTitle}</Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="name" value="Room Name" />
              </div>
              <CustomTextInput
                id="name"
                placeholder="Enter room name"
                value={data.name}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="room_number" value="Room Number" />
                <span className="text-red-600">*</span>
              </div>
              <CustomTextInput
                id="room_number"
                placeholder="Enter room number"
                value={data.room_number}
                onChange={(event) => {
                  if (
                    !/^\d*$/.test(event.target.value) ||
                    !validateNumberField(parseInt(event.target.value), 0, 999)
                  ) {
                    setRoomNumberFieldError(true);
                  } else {
                    setRoomNumberFieldError(false);
                  }
                  onChange(event);
                }}
                color={roomNumberFieldError ? "failure" : "gray"}
                helperText={
                  <span>
                    {roomNumberFieldError ? ROOM_NUMBER_ERROR_MSG : ""}
                  </span>
                }
                required
                autoComplete="off"
              />
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="airport_code" value="City" />
                <span className="text-red-600">*</span>
              </div>
              <Select
                id="airport_code"
                value={data.airport_code}
                onChange={(event) => {
                  const { value } = event.target;
                  setData((prevState) => ({
                    ...prevState,
                    airport_code: value,
                    building_number: "",
                    floor_number: "",
                  }));
                }}
              >
                <option value="" disabled>
                  Select an option
                </option>
                {Object.keys(buildingsByCities).map((item) => {
                  return (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  );
                })}
              </Select>
            </div>

            <div className="flex">
              <div className="flex flex-col flex-1 mr-4">
                <div className="mb-2 block">
                  <Label htmlFor="building_number" value="Building Number" />
                  <span className="text-red-600">*</span>
                </div>
                {!addNewBuilding && (
                  <Select
                    disabled={!data.airport_code}
                    id="building_number"
                    onChange={onChange}
                    value={data.building_number}
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    {data?.airport_code &&
                      buildingsByCities[data.airport_code]?.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                  </Select>
                )}
                {addNewBuilding && (
                  <CustomTextInput
                    disabled={!data.airport_code}
                    id="building_number"
                    value={data.building_number}
                    required
                    onChange={(event) => {
                      if (
                        !/^\d*$/.test(event.target.value) ||
                        !validateNumberField(
                          parseInt(event.target.value),
                          1,
                          999,
                        )
                      ) {
                        setBuildingNumberFieldError(true);
                      } else {
                        setBuildingNumberFieldError(false);
                      }
                      onChange(event);
                    }}
                    color={buildingNumberFieldError ? "failure" : "gray"}
                    helperText={
                      <span>
                        {buildingNumberFieldError
                          ? BUILDING_NUMBER_ERROR_MSG
                          : ""}
                      </span>
                    }
                  />
                )}
                <button
                  className="mt-2 text-sm flex justify-end"
                  onClick={() => {
                    if (addNewBuilding === true) {
                      setData((prevData) => ({
                        ...prevData,
                        building_number: savedBuildingNumber,
                      }));
                    } else {
                      setSavedBuildingNumber(data.building_number);
                      setData((prevData) => ({
                        ...prevData,
                        building_number: "",
                      }));
                    }
                    toggleAddNewBuilding((currentState) => !currentState);
                    setParentIsAddNewBuilding(!addNewBuilding);
                  }}
                >
                  {!addNewBuilding ? <span>+ </span> : <span>- </span>}&nbsp;Add
                  a new building
                </button>
              </div>

              <div className="flex flex-col flex-1">
                <div className="mb-2 block">
                  <Label htmlFor="floor_number" value="Floor Number" />
                  <span className="text-red-600">*</span>
                </div>
                <CustomTextInput
                  color={floorNumberFieldError ? "failure" : "gray"}
                  id="floor_number"
                  disabled={!data.airport_code}
                  value={data.floor_number}
                  required
                  min="1"
                  error={floorNumberFieldError}
                  onChange={(event) => {
                    if (
                      !/^\d*$/.test(event.target.value) ||
                      !validateNumberField(parseInt(event.target.value), 1, 50)
                    ) {
                      setFloorNumberFieldError(true);
                    } else {
                      setFloorNumberFieldError(false);
                    }
                    onChange(event);
                  }}
                  helperText={
                    <span>
                      {floorNumberFieldError ? FLOOR_NUMBER_ERROR_MSG : ""}
                    </span>
                  }
                />
              </div>
            </div>

            {addNewBuilding && (
              <div className="p-2 bg-slate-300 rounded-lg">
                <div className="flex p-2 justify-end">
                  <Popover
                    content={
                      <div>
                        <p>
                          Please find the latitude and longitude from google
                          maps
                        </p>
                      </div>
                    }
                  >
                    <InfoCircleOutlined className="ml-1" />
                  </Popover>
                </div>
                <div className="flex">
                  <div className="flex flex-col flex-1">
                    <div className="mb-2 block">
                      <Label htmlFor="latitude" value="Latitude" />
                      <span className="text-red-600">*</span>
                    </div>
                    <CustomTextInput
                      id="latitude"
                      step="0.000001"
                      type="number"
                      className="mr-4"
                      value={data.latitude}
                      required
                      onChange={onChange}
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="mb-2 block">
                      <Label htmlFor="longitude" value="Longitude" />
                      <span className="text-red-600">*</span>
                    </div>
                    <CustomTextInput
                      id="longitude"
                      type="number"
                      step="0.000001"
                      value={data.longitude}
                      required
                      onChange={onChange}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 block">
                <Label htmlFor="capacity" value="Capacity" />
                <span className="text-red-600">*</span>
              </div>
              <CustomTextInput
                onChange={(event) => {
                  if (
                    !/^\d*$/.test(event.target.value) ||
                    !validateNumberField(parseInt(event.target.value), 1, 100)
                  ) {
                    setCapacityFieldError(true);
                  } else {
                    setCapacityFieldError(false);
                  }
                  onChange(event);
                }}
                value={data.capacity}
                id="capacity"
                required
                color={capacityFieldError ? "failure" : "gray"}
                helperText={
                  <span>{capacityFieldError ? CAPACITY_ERROR_MSG : ""}</span>
                }
              />
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="facility" value="Facility" />
                <span className="text-red-600">*</span>
              </div>
              <Select id="facility" value={data.facility} onChange={onChange}>
                <option value="" disabled>
                  Select an option
                </option>
                <option value="N/A">N/A</option>
                <option value="AV">AV</option>
                <option value="VC">VC</option>
                <option value="AV/VC">AV/VC</option>
              </Select>
            </div>

            <div className="w-full flex justify-center">
              <Button disabled={!formValid} onClick={onSubmit}>
                Submit
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

const CustomTextInput = ({ ...props }) => {
  const theme = {
    field: {
      input: {
        base: "block box-border w-full border disabled:cursor-not-allowed disabled:opacity-50 bg-gray-50 border-gray-300 text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-cyan-500 dark:focus:ring-cyan-500 p-2.5 text-sm rounded-lg",
      },
    },
  };

  return <TextInput theme={theme} {...props} />;
};

export default RoomForm;
