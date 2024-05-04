import { useRef, useState } from "react";
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { Button, Input, Space, Table, Popconfirm, Tag } from "antd";
import Highlighter from "react-highlight-words";

const RoomTable = (props) => {
  const { data, handleDelete, handleEdit, handleStatus } = props;
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const getStatusButtonLabel = (roomStatus) => {
    return roomStatus === 1 ? "Deactivate" : "Activate";
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

  const ROOM_TABLE_COLUMNS = [
    {
      title: "Room ID",
      dataIndex: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Room Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      ...getColumnSearchProps("name"),
    },
    {
      title: "Room Number",
      dataIndex: "room_number",
      sorter: (a, b) => a.room_number - b.room_number,
    },
    {
      title: "Floor",
      dataIndex: "floor_number",
      sorter: (a, b) => a.floor_number - b.floor_number,
    },
    {
      title: "Building",
      dataIndex: "building_number",
      sorter: (a, b) => a.building_number - b.building_number,
    },
    {
      title: "City (Airport Code)",
      dataIndex: "airport_code",
      ...getColumnSearchProps("airport_code"),
    },
    {
      title: "Capacity",
      dataIndex: "capacity",
      sorter: (a, b) => a.capacity - b.capacity,
    },
    {
      title: "Facility",
      dataIndex: "facility",
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
      onFilter: (value, record) => record.facility === value,
      sortDirections: ["descend"],
      sorter: (a, b) => a.facility.localeCompare(b.facility),
    },
    {
      title: "Room Status",
      key: "room_status",
      render: (text, record) => {
        const status = record.room_status === 1 ? "ACTIVE" : "INACTIVE";
        const color = status === "ACTIVE" ? "green" : "red";
        return (
          <>
            <Tag color={color}>{status}</Tag>
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
      onFilter: (value, record) => record.room_status === value,
    },
    {
      title: "Actions",
      key: "actions",
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
            title="Are you sure you want to continue?"
            onConfirm={() => handleStatus(record)}
            okType="link"
          >
            <Button
              type="danger"
              icon={
                record.room_status === 1 ? (
                  <DeleteOutlined />
                ) : (
                  <CheckCircleOutlined />
                )
              }
            >
              {getStatusButtonLabel(record.room_status)}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return <Table columns={ROOM_TABLE_COLUMNS} dataSource={data} rowKey="id" />;
};

export default RoomTable;
