import React from "react";
import { Modal, Table } from "antd";

function ParticipantsPopUp({ open, onClose, dataSource }) {
  const columns = [
    {
      title: "Email",
      key: "email",
    },
  ];
  return (
    <>
      <Modal
        footer={null}
        title="Participants List"
        open={open}
        onCancel={onClose}
      >
        <Table columns={columns} dataSource={dataSource}></Table>
      </Modal>
    </>
  );
}

export default ParticipantsPopUp;
