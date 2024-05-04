import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Table,
  Space,
  Button,
  Popconfirm,
  Tag,
  notification,
  Input,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import Highlighter from "react-highlight-words";
import {
  deleteBookingById,
  deactivateBookingById,
  getCreatedBookingsMulti,
  getInvitedBookingsMulti,
} from "../../apis/apis.js";
import ParticipantsPopUp from "./participantsPopUp.jsx";
import { tailChase } from "ldrs";
import { setEditState } from "../../redux/features/mainPage/searchSlice.js";
import { useNavigate } from "react-router-dom";

function BookingsList() {
  const [api, contextHolder] = notification.useNotification();

  const successNotification = (message) => {
    api.success({
      message: message,
      placement: "bottomRight",
      duration: 3,
    });
  };

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [createdBookings, setCreatedBookings] = useState([]);
  const [invitedBookings, setInvitedBookings] = useState([]);
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const userId = useSelector((state) => state.currentUser.userId);
  const [fetchingBookingsLoading, setFetchingLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);
  tailChase.register();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  async function fetchBookingsFromServer() {
    try {
      const createdResponse = await getCreatedBookingsMulti(userId);
      const invitedResponse = await getInvitedBookingsMulti(userId);
      setCreatedBookings(createdResponse);
      setInvitedBookings(invitedResponse);
      setFetchingLoading(false);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (userId) {
      fetchBookingsFromServer();
    }
  }, [userId]);

  async function handleDeleteCreatedBooking(bookingId) {
    await deleteBookingById(bookingId);
    fetchBookingsFromServer(userId);
    successNotification("Successfully deleted meeting.");
  }

  const FACILITY_MAP = {
    AV: [{ value: "AV", label: "Audio Visual" }],
    VC: [{ value: "VC", label: "Video Conferencing" }],
    "AV/VC": [
      { value: "AV", label: "Audio Visual" },
      { value: "VC", label: "Video Conferencing" },
    ],
    "N/A": [],
  };

  async function handleEdit(record) {
    // RECORD NEEDS TO INCLUDE NUM ROOMS NOW TO KEEP IT BETWEEN STAGES
    const { rooms, employee_email_name } = record;
    const facilities = FACILITY_MAP[rooms[0].facility];
    const numRooms = rooms.length;
    const dispatchedRecord = { ...record, facilities, numRooms };
    let removedHostParticipants = employee_email_name.filter(
      (obj) => obj.value !== userId,
    );
    dispatchedRecord.employee_email_name = removedHostParticipants;

    try {
      await deactivateBookingById(record.booking_id);
      dispatch(setEditState(dispatchedRecord));
      navigate("/");
    } catch (e) {
      console.log(e);
    }
  }

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
          ref={searchInput}
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
        setTimeout(() => searchInput.current?.select(), 100);
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

  const createdColumns = [
    {
      title: "Meeting Title",
      dataIndex: "meeting_title",
      sorter: (a, b) => a.meeting_title.localeCompare(b.meeting_title),
      ...getColumnSearchProps("meeting_title"),
    },
    {
      title: "Date",
      dataIndex: "date",
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      defaultSortOrder: "ascend",
    },
    {
      title: "Start time",
      dataIndex: "start_time",
      sorter: (a, b) => a.start_time.localeCompare(b.start_time),
    },
    {
      title: "Duration (min)",
      dataIndex: "length",
      sorter: (a, b) => a.length - b.length,
    },
    {
      title: "Booking Status",
      key: "action",
      render: (text, record) => {
        const status = record.is_active === 1 ? "CONFIRMED" : "CANCELLED";
        const color = record.is_active === 1 ? "green" : "red";

        return (
          <>
            <Tag color={color}>{status}</Tag>
          </>
        );
      },
    },
    {
      title: "Actions",
      key: "action",
      render: (text, record) => (
        <Space size="medium" style={{ display: "inline-block" }}>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>

          <Popconfirm
            title="Are you sure you want to delete this booking?"
            okType="link"
            onConfirm={() => handleDeleteCreatedBooking(record.booking_id)}
          >
            <Button type="danger" icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const invitedColumns = [
    {
      title: "Meeting Title",
      dataIndex: "meeting_title",
      sorter: (a, b) => a.meeting_title.localeCompare(b.meeting_title),
      ...getColumnSearchProps("meeting_title"),
    },
    {
      title: "Date",
      dataIndex: "date",
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      defaultSortOrder: "ascend",
    },
    {
      title: "Start time",
      dataIndex: "start_time",
      sorter: (a, b) => a.start_time.localeCompare(b.start_time),
    },
    {
      title: "Duration (min)",
      dataIndex: "length",
      sorter: (a, b) => a.length - b.length,
    },
    {
      title: "Room",
      dataIndex: "location",
      sorter: (a, b) => a.location.localeCompare(b.location),
    },
    {
      title: "Room Name",
      dataIndex: "room_name",
      sorter: (a, b) => a.room_name.localeCompare(b.room_name),
    },
    {
      title: "Facilities",
      dataIndex: "facility",
      sorter: (a, b) => a.facility.localeCompare(b.facility),
    },
    {
      title: "Booking Status",
      dataIndex: "is_active",
      render: (is_active) => {
        const status = is_active === 1 ? "CONFIRMED" : "CANCELLED";
        const color = is_active === 1 ? "green" : "red";

        return (
          <>
            <Tag color={color}>{status}</Tag>
          </>
        );
      },
    },
    {
      title: "Participants",
      key: "action",
      render: (text, record) => (
        <Space size="medium">
          <Button
            type="link"
            onClick={() => {
              setData(record.participants);
              showModal();
            }}
          >
            View Participants
          </Button>
        </Space>
      ),
    },
    {
      title: "Created by",
      dataIndex: "host_name",
      sorter: (a, b) => a.host_name.localeCompare(b.host_name),
    },
  ];

  const multiRoomColumns = [
    {
      title: "Room",
      dataIndex: "location",
      sorter: (a, b) => a.location.localeCompare(b.location),
    },
    {
      title: "Room Name",
      dataIndex: "room_name",
      sorter: (a, b) => a.room_name.localeCompare(b.room_name),
    },
    {
      title: "Facilities",
      dataIndex: "facility",
      sorter: (a, b) => a.facility.localeCompare(b.facility),
    },
    {
      title: "Participants",
      key: "action",
      render: (text, record) => (
        <Space size="medium">
          <Button
            type="link"
            onClick={() => {
              setData(record.participants);
              showModal();
            }}
          >
            View Participants
          </Button>
        </Space>
      ),
    },
  ];

  const onChange = (pagination, filters, sorter, extra) => {
    console.log("params", pagination, filters, sorter, extra);
  };

  return (
    <>
      {fetchingBookingsLoading && (
        <div className="mt-24 flex flex-col justify-center items-center self-center">
          <l-tail-chase size="80" speed="1.75" color="#1677ff"></l-tail-chase>
          <span className="text-center my-4 text-2xl font-bold text-[#1677ff]">
            Loading...
          </span>
        </div>
      )}
      {!fetchingBookingsLoading && (
        <div className="bg-[#FFFFFF] w-full h-screen">
          {contextHolder}
          <div className="bg-[#FFFFFF] w-full">
            <h1 className="font-bold p-2">Bookings you've created:</h1>
            <Table
              columns={createdColumns}
              dataSource={createdBookings}
              onChange={onChange}
              rowKey="booking_id"
              pagination={false}
              expandable={{
                defaultExpandAllRows: false,
                expandedRowRender: (record, parentIndex) => (
                  <div>
                    <Table
                      style={{ marginTop: "20px" }}
                      columns={multiRoomColumns}
                      dataSource={record.rooms}
                      rowKey="room_id"
                    />
                  </div>
                ),
              }}
            />
          </div>
          <div className="bg-[#FFFFFF] py-8"></div>
          <div className="bg-[#FFFFFF] w-full">
            <h1 className="font-bold p-2">Bookings you're participating in:</h1>
            <Table
              columns={invitedColumns}
              dataSource={invitedBookings}
              onChange={onChange}
              rowKey="booking_id"
            />
          </div>
          <ParticipantsPopUp
            open={isModalOpen}
            onClose={closeModal}
            dataSource={data}
          />
        </div>
      )}
    </>
  );
}

export default BookingsList;
