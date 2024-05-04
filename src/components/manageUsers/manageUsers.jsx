import UploadFileModalUsers from "./uploadFileModalUsers";
import { useEffect, useState, useRef } from "react";
import { Input, Space, notification, Button, Table, Tag } from "antd";
import { EditOutlined, SearchOutlined } from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowUp } from "@fortawesome/free-solid-svg-icons";
import ManageUsersModal from "./manageUsersModal";
import { tailChase } from "ldrs";
import Highlighter from "react-highlight-words";
import {
  getAllUserDetails,
  getBuildingIdsByCities,
  addUser,
  updateUser,
  toggleStatus,
} from "../../apis/apis";
import { ADD_ACTION, EDIT_ACTION, DELETE_ACTION } from "./manageUsersModal";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ManageUsers = () => {
  tailChase.register();
  const [fetchUsersLoading, setFetchUsersLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showModalUpload, setShowModalUpload] = useState(false);
  const [actionType, setActionType] = useState("");
  const [userData, setUserData] = useState({});
  const [tableData, setTableData] = useState([]);
  const [api, contextHolder] = notification.useNotification();
  const [searchedColumn, setSearchedColumn] = useState("");
  const [searchText, setSearchText] = useState("");
  const [buildingsByCities, setBuildingsByCities] = useState({});

  const currentUserSub = useSelector(
    (state) => state.currentUser?.idToken?.sub,
  );

  const currentUserRole = useSelector(
    (state) => state.currentUser?.idToken?.["custom:role"],
  );

  const AWS = require("aws-sdk");
  const searchInput1 = useRef(null);
  
  var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({
    region: "ca-central-1",
    apiVersion: "2016-04-18",
  });

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

  const closeModal = () => {
    setUserData({});
    setShowModal(false);
  };

  async function fetchUserDataFromServer() {
    try {
      const response = await getAllUserDetails();
      setTableData(response);
      setFetchUsersLoading(false);
    } catch (e) {
      console.error(e);
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
    fetchUserDataFromServer();
    fetchBuildingsByCities();
  }, []);

  if (currentUserRole !== "ADMIN") {
    return (
      <>
        <Navigate to="/" aria-current="page" />
      </>
    );
  }

  const createUser = async (user) => {
    try {
      const params = {
        UserPoolId: "ca-central-1_tkrhcbWqO",
        Username: user.email,
        UserAttributes: [
          {
            Name: "email",
            Value: user.email,
          },
          {
            Name: "email_verified",
            Value: "true",
          },
          {
            Name: "custom:role",
            Value: user.employee_role,
          },
          {
            Name: "name",
            Value: user.employee_name,
          },
        ],
        TemporaryPassword: Math.random().toString(36).slice(-8),
      };
      let response = await cognitoidentityserviceprovider
        .adminCreateUser(params)
        .promise();
      if (user.employee_role === "ADMIN") {
        const groupParams = {
          UserPoolId: "ca-central-1_tkrhcbWqO",
          Username: user.email,
          GroupName: "Admin",
        };
        await cognitoidentityserviceprovider
          .adminAddUserToGroup(groupParams)
          .promise();
      }
      const rdsData = {
        id: response.User.Username,
        name: user.employee_name,
        email: user.email,
        role: user.employee_role,
        floor_number: user.floor_number,
        building_number: user.building_number,
        airport_code: user.airport_code,
      };
      await addUser(rdsData);
      successNotification(
        "User " + user.employee_name + " created successfully!",
      );
    } catch (err) {
      warningNotification("Error creating user!");
      console.error("Error creating user:", err);
    }
  };

  const editUser = async (user) => {
    try {
      let updatedRole = user.employee_role;
      let updatedName = user.employee_name;
      const updatedUserAttributes = [
        {
          Name: "custom:role",
          Value: updatedRole,
        },
        {
          Name: "name",
          Value: updatedName,
        },
      ];

      const rdsData = {
        employee_name: updatedName,
        employee_role: updatedRole,
        floor_number: user.floor_number,
        building_number: user.building_number,
        airport_code: user.airport_code,
      };
      await updateUser(user.id, rdsData);

      const updateParams = {
        UserPoolId: "ca-central-1_tkrhcbWqO",
        Username: user.email,
        UserAttributes: updatedUserAttributes,
      };
      await cognitoidentityserviceprovider
        .adminUpdateUserAttributes(updateParams)
        .promise();

      if (updatedRole !== null) {
        const updateGroupParams = {
          UserPoolId: "ca-central-1_tkrhcbWqO",
          Username: user.email,
          GroupName: "Admin",
        };
        if (updatedRole === "ADMIN") {
          await cognitoidentityserviceprovider
            .adminAddUserToGroup(updateGroupParams)
            .promise();
        } else if (updatedRole === "USER") {
          await cognitoidentityserviceprovider
            .adminRemoveUserFromGroup(updateGroupParams)
            .promise();
        }
      }
      successNotification(
        "User " + user.employee_name + " edited successfully!",
      );
    } catch (err) {
      warningNotification("Error updating User Info!");
      console.error("Error updating User Info", err);
    }
  };

  // Deactivate user
  const deleteUser = async (user) => {
    try {
      const params = {
        UserPoolId: "ca-central-1_tkrhcbWqO",
        Username: user.email,
      };
      let cognitoResponse = await cognitoidentityserviceprovider
        .adminGetUser(params)
        .promise();
      const id = cognitoResponse.Username;
      const updatedIsActive = !user.is_active;
      const rdsData = {
        is_active: updatedIsActive,
      };
      await toggleStatus(id, rdsData);
      let successMessage = "";
      if (!updatedIsActive) {
        await cognitoidentityserviceprovider.adminDisableUser(params).promise();
        successMessage = "Successfully deactivated user.";
      } else {
        await cognitoidentityserviceprovider.adminEnableUser(params).promise();
        successMessage = "Successfully activated user.";
      }
      successNotification(successMessage);
      fetchUserDataFromServer();
    } catch (err) {
      warningNotification("Error Deleting User!");
      console.error("Error Deleting User", err);
    }
  };

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <div
        style={{
          padding: 8,
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Input
          ref={searchInput1}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{
            marginBottom: 8,
            display: "block",
          }}
        />
        <Space>
          <Button
            type="link"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{
              width: 90,
            }}
          >
            Search
          </Button>
          <Button
            type="link"
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{
              width: 90,
            }}
          >
            Reset
          </Button>
          <Button
            size="small"
            onClick={() => {
              close();
            }}
          >
            Close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined
        style={{
          color: filtered ? "#1677ff" : undefined,
        }}
      />
    ),
    onFilter: (value, record) =>
      record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput1.current?.select(), 100);
      }
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{
            backgroundColor: "#ffc069",
            padding: 0,
          }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  });

  const columns = [
    {
      title: "Id",
      dataIndex: "id",
    },
    {
      title: "Name",
      dataIndex: "name",
      ...getColumnSearchProps("name"),
    },
    {
      title: "Email",
      dataIndex: "email",
      ...getColumnSearchProps("email"),
    },
    {
      title: "Location",
      dataIndex: "location",
      ...getColumnSearchProps("location"),
    },

    {
      title: "Role",
      dataIndex: "role",
      render: (_, { role }) => {
        const color = role === "ADMIN" ? "purple" : "orange";

        return (
          <>
            <Tag color={color} key={role}>
              {role && role.toUpperCase()}
            </Tag>
          </>
        );
      },
      filters: [
        {
          text: "Admin",
          value: "ADMIN",
        },
        {
          text: "User",
          value: "USER",
        },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (_, { id, status }) => {
        const color = status === 1 ? "green" : "red";
        const label = status === 1 ? "ACTIVE" : "INACTIVE";

        return (
          <>
            <Tag color={color} key={id}>
              {label && label.toUpperCase()}
            </Tag>
          </>
        );
      },
      filters: [
        {
          text: "Active",
          value: 1,
        },
        {
          text: "Inactive",
          value: 0,
        },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setShowModal(true);
              setActionType(EDIT_ACTION);
              setUserData(record);
            }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  const onSave = async (userData, actionType) => {
    if (Object.keys(userData).length === 0) {
      return;
    }
    const { floorNumber, buildingNumber, city, ...rest } = userData;
    if (userData.employee_name === "") {
      warningNotification("Please fill out a value for Name!");
      return;
    } else if (userData.email === "") {
      warningNotification("Please fill out a value for Email!");
      return;
    } else if (userData.airport_code === "") {
      warningNotification("Please select a value for City!");
      return;
    } else if (userData.building_number === "") {
      warningNotification("Please select a building number!");
      return;
    } else if (userData.floor_number === "") {
      warningNotification("Please select a floor number!");
      return;
    } else if (userData.employee_role === "") {
      warningNotification("Please select a role!");
      return;
    }

    const userDataBeforeReset = userData;
    closeModal();
    if (actionType === EDIT_ACTION) {
      await editUser(userDataBeforeReset);
    } else if (actionType === ADD_ACTION) {
      await createUser(userDataBeforeReset);
    } else if (actionType === DELETE_ACTION) {
      await deleteUser(userDataBeforeReset);
    }
    fetchUserDataFromServer();
  };

  return (
    <>
      <UploadFileModalUsers
        show={showModalUpload}
        setClose={() => {
          setShowModalUpload(false);
        }}
        cognitoidentityserviceprovider={cognitoidentityserviceprovider}
        buildingsByCities={buildingsByCities}
        onUploadSuccess={fetchUserDataFromServer}
        tableData={tableData}
      />
      <div style={styles.main_container} className="p-12">
        {contextHolder}
        <div className="flex justify-between items-center py-8">
          <h1 className="text-2xl font-semibold">Manage Users</h1>

          <div className="flex justify-center items-center">
            <button
              style={styles.add_button}
              onClick={() => {
                setShowModal(true);
                setActionType(ADD_ACTION);
              }}
            >
              + Add User
            </button>
            <button
              style={styles.add_button}
              onClick={() => {
                setShowModalUpload(true);
              }}
            >
              <FontAwesomeIcon icon={faFileArrowUp} className="mx-1" />
              <span>Import Users</span>
            </button>
          </div>
        </div>
        {fetchUsersLoading && (
          <div className="mt-24 flex flex-col justify-center items-center self-center">
            <l-tail-chase size="80" speed="1.75" color="#1677ff"></l-tail-chase>
            <span className="text-center my-4 text-2xl font-bold text-[#1677ff]">
              Loading...
            </span>
          </div>
        )}
        {!fetchUsersLoading && (
          <div>
            <div>
              <Table columns={columns} dataSource={tableData} rowKey="id" />
            </div>
          </div>
        )}

        <ManageUsersModal
          show={showModal}
          setClose={closeModal}
          actionType={actionType}
          data={userData}
          onSave={onSave}
          currentUserSub={currentUserSub}
          buildingsByCities={buildingsByCities}
        />
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

export default ManageUsers;
