import {
  Button,
  Form,
  Table,
  Checkbox,
  Space,
  notification,
  Input,
  Tag,
  Popover,
} from "antd";
import {
  SearchOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import Highlighter from "react-highlight-words";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import SearchForm from "./searchForm";
import { tailChase } from "ldrs";
import {
  setSearchClicked,
  setRoomBooked,
  clearSearchState,
  setConflictSearchState,
} from "../../redux/features/mainPage/searchSlice";
import {
  deleteBookingById,
  getMultiSearch,
  doMultiAddBooking,
} from "../../apis/apis";

const TIME_CONFLICT_ERROR = "TIME_CONFLICT";

const Booking = () => {
  tailChase.register();
  const {
    startTime,
    duration,
    date,
    facilities,
    participants,
    numRooms,
    searchClicked,
    editMode,
    booking_id,
    booking_title,
  } = useSelector((state) => state.search);
  const currentUserId = useSelector((state) => state.currentUser.userId);
  const currentUser = useSelector((state) => state.currentUser);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [meetingTitle, setMeetingTitle] = useState("");
  const meetingTitleRef = useRef(null);
  const [meetingTitleStatus, setMeetingTitleStatus] = useState("");
  const [showOtherRooms, setShowOtherRooms] = useState(false);
  const [roomsData, setRoomsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [shownRoomsList, setShownRoomsList] = useState([]);

  const [enterFields, setEnterFields] = useState(false);

  const searchInput = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");

  const [api, contextHolder] = notification.useNotification();

  const errorNotification = (message) => {
    api.error({
      message: message,
      placement: "bottomRight",
      duration: 3,
    });
  };

  const multiRoomColumns = [
    {
      title: "Group Number",
      dataIndex: "key",
      key: "key",
      width: 150,
      className: "font-semibold",
    },
    {
      title: "Selected Room",
      dataIndex: "selectedRoom",
      key: "selectedRoom",
      className: "font-semibold p-0",
    },
    {
      title: "Participants",
      dataIndex: "participants",
      key: "participants",
      className: "flex-auto",
      render: (text, record) => (
        <>
          <div>
            {record.participants.map((tag) => {
              let color = "geekblue";
              return (
                <Tag color={color} key={tag}>
                  {tag.toLowerCase()}
                </Tag>
              );
            })}
          </div>
        </>
      ),
    },
  ];

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex, title) => ({
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
          placeholder={`Search ${title}`}
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

  const columns = [
    {
      title: "Room",
      dataIndex: "room_name",
      key: "room_name",
      sorter: (a, b) => a.room_name.localeCompare(b.room_name),
      ...getColumnSearchProps("room_name", "name"),
    },
    {
      title: "Capacity",
      dataIndex: "capacity",
      key: "capacity",
      sorter: (a, b) => a.capacity - b.capacity,
    },
    {
      title: "Facilities",
      dataIndex: "facility_name",
      key: "facility_name",
      filters: [
        {
          text: "N/A",
          value: "N/A",
        },
        {
          text: "AV/VC",
          value: "AV/VC",
        },
        {
          text: "AV",
          value: "AV",
        },
        {
          text: "VC",
          value: "VC",
        },
      ],
      onFilter: (value, record) => record.facility_name === value,
      sortDirections: ["descend"],
      sorter: (a, b) => a.facility_name.localeCompare(b.facility_name),
    },
    {
      title: "Location",
      // dataIndex: ["airport_code", "building_number", "floor_number", "room_number"],
      render: (record) => (
        <span>
          {`${record.airport_code}${record.building_number} ${record.floor_number}.${record.room_number}`}
        </span>
      ),
      key: "location",
      sorter: (a, b) => {
        return (
          a.building_number - b.building_number || 
          a.floor_number - b.floor_number ||
          a.room_number - b.room_number
        );
      },
      // ...getColumnSearchProps("location", "location"),
    },

    {
      title: "Average Distance (meters)",
      dataIndex: "avg_distance",
      key: "avg_distance",
      defaultSortOrder: "ascend",
      sorter: (a, b) => a.avg_distance - b.avg_distance,
      render: (text, record) => (
        <>
          <div>
            {text !== "UNAVAILABLE" && <span>{text}</span>}
            {text === "UNAVAILABLE" && (
              <Tag color={"red"}>ROOM UNAVAILABLE</Tag>
            )}
          </div>
        </>
      ),
    },
  ];

  useEffect(() => {
    if (editMode) {
      setMeetingTitle(booking_title);
    }
  }, []);

  useEffect(() => {
    async function fetchRoomsFromServer() {
      try {
        const body = {
          participant_ids: participants.map((participant) => participant.value),
          facilities: facilities.map((facility) => facility.value),
          start_time: `${date} ${moment(startTime, "HH:mm").format("HH:mm:ss")}`,
          duration: duration,
          num_clusters: numRooms,
        };
        const response = await getMultiSearch(currentUserId, body);
        const newRoomsData = {
          ClusterGroups: response.ClusterGroups,
          allAvailableRooms: response.allAvailableRooms,
          optimalRooms: response.optimalRooms,
          unavailableRooms: response.unavailableRooms.map((item) => {
            return {
              ...item,
              avg_distance: "UNAVAILABLE",
            };
          }),
        };
        setRoomsData(newRoomsData);
        setShownRoomsList(
          response.optimalRooms.map((item, index) => {
            const participants = response.ClusterGroups[index];
            var obj = {
              key: index + 1,
              optimalRooms: item,
              participants: participants,
              selectedRoom: "Please select a room!",
            };
            return obj;
          }),
        );
        setLoading(false);
        setEnterFields(false);
        dispatch(setSearchClicked(false));
      } catch (error) {
        console.log(error);
      }
    }

    async function fetchData() {
      if (searchClicked) {
        setLoading(true);
        await fetchRoomsFromServer();
      } else if (participants.length < 1 || !startTime || !date || !duration) {
        setEnterFields(true);
      } else {
        setEnterFields(false);
      }
    }

    fetchData();
  }, [searchClicked, participants, startTime, date, duration]);

  const handleShowOtherRooms = (e) => {
    setShowOtherRooms(e.target.checked);

    const list = roomsData.ClusterGroups.map((item, index) => {
      const roomsList = !e.target.checked
        ? roomsData?.optimalRooms[index]
        : [
            ...roomsData?.allAvailableRooms[index],
            ...roomsData?.unavailableRooms,
          ];
      var obj = {
        key: index + 1,
        optimalRooms: roomsList,
        participants: item,
        selectedRoom: shownRoomsList[index].selectedRoom,
      };
      return obj;
    });

    console.log(list);
    setShownRoomsList(list);
  };

  // const onChange = (value) => {
  //   console.log(`selected ${value}`);
  // };

  // Filter `option.label` match the user type `input`
  // const filterOption = (input, option) =>
  //   (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

  let new_booking_id = -1;
  const handleBookRoom = async (e) => {
    if (selectedRooms.length <= 0) {
      errorNotification("Please select all rooms first!");
      return;
    }
    if (meetingTitle.length < 2) {
      errorNotification("Enter meeting title first!");
      if (meetingTitleRef.current) {
        meetingTitleRef.current.input.classList.add("shake-animation");
        meetingTitleRef.current.focus();

        setTimeout(() => {
          meetingTitleRef.current.input.classList.remove("shake-animation");
        }, 600);
      }
      setMeetingTitleStatus("error");
      return;
    }
    const selectedRoomIds = selectedRooms.map((room) => room.id);
    const roomSet = new Set(selectedRoomIds);
    if (roomSet.size < selectedRooms.length) {
      errorNotification(
        "There are duplicate rooms being booked. Try again with different rooms.",
      );
      return;
    }

    setLoading(true);
    try {
      const clusters = selectedRoomIds.map((item, index) => {
        var current_participants_emails = shownRoomsList[index].participants;

        const participant_ids = current_participants_emails.map(
          (participant_email) => {
            if (participant_email === currentUser.userEmail) {
              return currentUser.userId;
            } else {
              const matching_participant = participants.find(
                (participant) => participant.email === participant_email,
              );
              return matching_participant.value;
            }
          },
        );

        var cluster = {
          participant_ids: participant_ids,
          room_id: item,
        };
        return cluster;
      });
      const body = {
        meeting_title: meetingTitle,
        clusters: clusters,
        start_time: `${date} ${moment(startTime, "HH:mm").format("HH:mm:ss")}`,
        duration: duration,
      };
      dispatch(setRoomBooked(true));
      const response = await doMultiAddBooking(currentUserId, body);

      if (response.status !== 200) {
        errorNotification(response.data.message);
      }
      new_booking_id = response.data.new_booking_id;

      setLoading(false);

      if (editMode) {
        await deleteBookingById(booking_id);
      }

      dispatch(clearSearchState());
      dispatch(setRoomBooked(true));
      navigate("/managebookings");
    } catch (e) {
      dispatch(setRoomBooked(false));

      if (e.response.status === 409) {
        // conflict
        errorNotification(e.response.data.message);

        setTimeout(() => {
          if (e.response.data.type === TIME_CONFLICT_ERROR) {
            dispatch(setConflictSearchState());
            navigate("/");
          }
        }, 3000);
        setLoading(false);
        return;
      }

      if (editMode) {
        errorNotification(
          "There was an error editing your booking. Please try again!",
        );
        await deleteBookingById(new_booking_id);
      } else {
        errorNotification(
          "There was an error booking this room. Please try again!",
        );
      }

      setLoading(false);
      console.log(e);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="p-12 pt-24">
        <h2 className="text-center my-8 text-2xl font-bold">
          Recommended Rooms
        </h2>
        <div className="mx-auto my-8 flex px-3 py-3 items-center justify-center rounded-lg bg-slate-200 shadow-md dark:bg-slate-200 dark:text-slate-200">
          <SearchForm />
        </div>
        <div className="flex flex-col justify-center">
          {enterFields && (
            <span className="text-center my-4 text-2xl font-bold text-red-600">
              Please enter all fields to continue
            </span>
          )}
          {loading && !enterFields && (
            <div className="mt-24 flex flex-col justify-center items-center self-center">
              <l-tail-chase
                size="80"
                speed="1.75"
                color="#1677ff"
              ></l-tail-chase>
              <span className="text-center my-4 text-2xl font-bold text-[#1677ff]">
                Loading...
              </span>
            </div>
          )}
          {!loading && Object.keys(roomsData).length > 0 && (
            <div className="rounded-lg bg-slate-200 shadow-md">
              <span className="flex mx-10 mt-8 pt-4 mb-2 text-lg font-bold">
                Step 3: Select rooms for each group
              </span>
              <Popover
                content={
                  <div className="flex p-10 mx-6 my-6 shadow-md bg-slate-200 rounded-md shadow-md border-2 border-slate-400">
                    <InfoCircleOutlined className="text-5xl text-slate-400" />
                    <span className="ml-7 font-semibold text-slate-600 content-center">
                      Participants have been grouped in each row to{" "}
                      <b>minimize travelling distances</b>.<br></br>
                      <br></br>
                      <b>Click</b> the buttons on each row to expand a list of
                      optimal rooms sorted by distance.<br></br>
                      <b>Select a room</b> for each group, enter your{" "}
                      <b>meeting title</b>, and <b>book</b>!
                    </span>
                  </div>
                }
                trigger="click"
              >
                <Button className="font-semibold border-2 ml-10 h-full border-slate-700 flex items-center bg-slate-100 mb-10">
                  How to select rooms <BulbOutlined />
                </Button>
              </Popover>
              <Form layout="inline" className="mt-2 ml-10 flex justify-between">
                <div className="flex mb-2 justify-items-center items-center">
                  <Form.Item label="" className="">
                    <Checkbox
                      className="ml-1.5 font-semibold"
                      checked={showOtherRooms}
                      onChange={handleShowOtherRooms}
                    >
                      Show all rooms
                    </Checkbox>
                    <Popover
                      content={
                        <div>
                          <p>
                            When this is toggled, show{" "}
                            <b>non-optimal rooms, unavailable rooms</b>, and
                          </p>
                          <p>
                            rooms that{" "}
                            <b>
                              don't meet facility and/or capacity requirements
                            </b>{" "}
                            as well.
                          </p>
                        </div>
                      }
                    >
                      <QuestionCircleOutlined className="text-lg" />
                    </Popover>
                  </Form.Item>
                </div>
              </Form>
              <Table
                bordered
                className="border-4 border-slate-500 rounded-md mx-10 shadow-md"
                columns={multiRoomColumns}
                dataSource={shownRoomsList}
                expandable={{
                  expandedRowRender: (record, parentIndex) => (
                    <div>
                      <div className="inline-flex rounded-md border-2 border-slate-400 py-1.5 p-3 font-semibold">
                        Number of results: {record.optimalRooms.length}
                      </div>
                      <Table
                        size="middle"
                        className="border-2 rounded-md border-slate-400"
                        style={{ marginTop: "20px" }}
                        columns={columns}
                        rowSelection={{
                          type: "radio",
                          onSelect: (record) => {
                            // console.log(roomsData);
                            selectedRooms[parentIndex] = record;
                            const newShownRooms = shownRoomsList.map(
                              (item, index) => {
                                if (index === parentIndex) {
                                  return {
                                    key: item.key,
                                    optimalRooms: item.optimalRooms,
                                    participants: item.participants,
                                    selectedRoom: `${record.room_name} (${record.airport_code}${record.building_number} ${record.floor_number}.${record.room_number})`,
                                  };
                                } else {
                                  return {
                                    ...item,
                                  };
                                }
                              },
                            );
                            setShownRoomsList(newShownRooms);
                          },
                          getCheckboxProps: (record) => ({
                            disabled: record.avg_distance === "UNAVAILABLE",
                          }),
                        }}
                        rowClassName={(record) => {
                          if (record.avg_distance === "UNAVAILABLE") {
                            return "bg-stone-200";
                          }
                        }}
                        dataSource={record.optimalRooms.map((item, index) => ({
                          ...item,
                          key: index,
                        }))}
                      />
                    </div>
                  ),
                }}
                rowClassName={(record, index) => {
                  const currSelectedRooms = shownRoomsList.map((item) => {
                    return item.selectedRoom;
                  });

                  if (
                    record.selectedRoom === "Please select a room!" ||
                    currSelectedRooms.filter(
                      (item) => item === currSelectedRooms[index],
                    ).length > 1
                  ) {
                    return "bg-red-100";
                  } else {
                    return "bg-green-100";
                  }
                }}
                pagination={{
                  hideOnSinglePage: true,
                }}
              ></Table>
              <div className="flex justify-center w-full">
                <div className="flex flex-col justify-center w-full sm:w-[40%] my-8 px-8 py-5 rounded-lg bg-slate-300 shadow-md dark:bg-slate-300 bg-contain dark:text-slate-300">
                  <span className="flex mb-3 justify-center font-semibold">
                    Meeting Title
                    <span className="text-red-600">*</span>
                  </span>
                  <div className="flex flex-nowrap content-center">
                    <Input
                      value={meetingTitle}
                      ref={meetingTitleRef}
                      status={meetingTitleStatus}
                      placeholder="Enter meeting title"
                      className="border border-[#CCCCCC] rounded py-1 hover:border-[#B3B3B3] w-full"
                      onChange={(e) => {
                        const title = e.target.value;
                        setMeetingTitle(title);
                        if (title.length > 0) {
                          setMeetingTitleStatus("");
                        }
                      }}
                    />
                    <Button
                      style={{
                        backgroundColor: "#1677ff",
                        color: "#fff",
                        marginRight: 0,
                      }}
                      className="my-1 mx-2"
                      type="primary"
                      onClick={handleBookRoom}
                    >
                      Book
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Booking;
