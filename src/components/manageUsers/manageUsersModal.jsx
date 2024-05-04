import { useEffect, useState } from "react";
import { Popconfirm } from "antd";
import { Button, Label, Modal, TextInput, Select } from "flowbite-react";

const reg = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const ADD_ACTION = "ADD";
export const EDIT_ACTION = "EDIT";
export const DELETE_ACTION = "DELETE";

const DEFAULT_FORM_VALUES = {
  id: "",
  employee_name: "",
  email: "",
  employee_role: "",
  is_active: "",
  floor_number: "",
  building_number: "",
  airport_code: "",
};

function ManageUsersModal({
  show,
  setClose,
  actionType,
  data,
  onSave,
  currentUserSub,
  buildingsByCities,
}) {
  const [floorNumberFieldError, setFloorNumberFieldError] = useState(false);
  const [emailFieldError, setEmailFieldError] = useState(false);
  const FLOOR_NUMBER_ERROR_MSG =
    "Floor number must be a number and in the range 0-50";
  const EMAIL_ERROR_MSG = "Wrong email format";
  const [userInfo, setUserInfo] = useState(DEFAULT_FORM_VALUES);
  const cities = Object.keys(buildingsByCities);

  const closeModal = () => {
    setClose();
    setUserInfo(DEFAULT_FORM_VALUES);
  };

  useEffect(() => {
    if (actionType === EDIT_ACTION && show) {
      setUserInfo(data);
    }
  }, [show]);

  const getStatusButtonLabel = () => {
    return userInfo.status === 1 ? "Deactivate" : "Activate";
  };

  const validateNumberField = (input, min, max) => {
    return input >= min && input <= max;
  };
  return (
    <>
      <Modal
        show={show}
        size="md"
        onClose={() => {
          closeModal();
        }}
        popup
      >
        <Modal.Header />
        <Modal.Body>
          <div className="space-y-6">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="name" value="Name" />
                <span className="text-red-600">*</span>
              </div>
              <CustomTextInput
                theme={{
                  field: {
                    input: {
                      base: "block box-border w-full border disabled:cursor-not-allowed disabled:opacity-50",
                    },
                  },
                }}
                id="name"
                placeholder="Enter user name"
                value={userInfo.employee_name}
                onChange={(event) =>
                  setUserInfo((prevState) => ({
                    ...prevState,
                    employee_name: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="relative">
              <div className="mb-2 block">
                <Label htmlFor="email" value="Email" />
                <span className="text-red-600">*</span>
              </div>
              <CustomTextInput
                disabled={actionType === EDIT_ACTION ? true : false}
                theme={{
                  field: {
                    input: {
                      base: "block box-border w-full border disabled:cursor-not-allowed disabled:opacity-50",
                    },
                  },
                }}
                id="email"
                placeholder="name@gmail.com"
                value={userInfo.email}
                onChange={(event) => {
                  setEmailFieldError(!reg.test(event.target.value));
                  if (actionType !== EDIT_ACTION) {
                    setUserInfo((prevState) => ({
                      ...prevState,
                      email: event.target.value,
                    }));
                  }
                }}
                color={emailFieldError ? "failure" : "gray"}
                helperText={
                  <span>{emailFieldError ? EMAIL_ERROR_MSG : ""}</span>
                }
                required
                className=""
                autoComplete="off"
              />
            </div>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="city" value="City" />
                <span className="text-red-600">*</span>
              </div>
              <Select
                value={userInfo.airport_code}
                onChange={(event) => {
                  const { value } = event.target;
                  setUserInfo((prevState) => ({
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
                {cities.map((item) => {
                  return (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  );
                })}
              </Select>
            </div>
            <div className="flex">
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="building" value="Building Number" />
                  <span className="text-red-600">*</span>
                </div>
                <Select
                  className="mr-2"
                  disabled={!userInfo.airport_code}
                  value={userInfo.building_number}
                  onChange={(event) => {
                    const { value } = event.target;
                    setUserInfo((prevState) => ({
                      ...prevState,
                      building_number: value,
                    }));
                  }}
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  {userInfo?.airport_code &&
                    buildingsByCities[userInfo.airport_code]?.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="floor" value="Floor Number" />
                  <span className="text-red-600">*</span>
                </div>
                <CustomTextInput
                  min="0"
                  disabled={!userInfo.airport_code}
                  id="floor"
                  className="mr-4 ml-1"
                  value={userInfo.floor_number}
                  required
                  color={floorNumberFieldError ? "failure" : "gray"}
                  helperText={
                    <span>
                      {floorNumberFieldError ? FLOOR_NUMBER_ERROR_MSG : ""}
                    </span>
                  }
                  onChange={(event) => {
                    if (
                      !/^\d*$/.test(event.target.value) ||
                      !validateNumberField(parseInt(event.target.value), 1, 50)
                    ) {
                      setFloorNumberFieldError(true);
                    } else {
                      setFloorNumberFieldError(false);
                    }
                    setUserInfo((prevState) => ({
                      ...prevState,
                      floor_number: event.target.value,
                    }));
                  }}
                />
              </div>
            </div>

            {/* Admins can't edit their own role */}
            {data.id !== currentUserSub && (
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="role" value="Role" />
                  <span className="text-red-600">*</span>
                </div>
                <Select
                  value={userInfo.employee_role}
                  onChange={(event) =>
                    setUserInfo((prevState) => ({
                      ...prevState,
                      employee_role: event.target.value,
                    }))
                  }
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option value="ADMIN">Admin</option>
                  <option value="USER">User</option>
                </Select>
              </div>
            )}

            <div className="w-full flex justify-center">
              {actionType === EDIT_ACTION && data.id !== currentUserSub && (
                <Popconfirm
                  title="Are you sure you want to continue?"
                  onConfirm={() => {
                    onSave(userInfo, DELETE_ACTION);
                  }}
                  okType="link"
                >
                  <Button className="mr-4" color="red">
                    {getStatusButtonLabel()}
                  </Button>
                </Popconfirm>
              )}
              <Button
                onClick={() => {
                  onSave(userInfo, actionType);
                }}
              >
                {actionType === ADD_ACTION ? "Add User" : "Save"}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

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

export default ManageUsersModal;
