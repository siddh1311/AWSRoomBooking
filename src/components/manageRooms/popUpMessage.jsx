// import React, { useState } from "react";
export const POPUP_ERROR = "ERROR";
export const POPUP_GOOD = "GOOD";

const PopUpMessage = ({ message, onClose, type }) => {
  return (
    <div>
      <div
        style={{
          border: "1px solid black",
          padding: "10px",
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "white",
          zIndex: 9999,
        }}
      >
        {type === POPUP_ERROR ? (
          <p style={{ color: "red" }}> {message} </p>
        ) : (
          <p style={{ color: "green" }}> {message} </p>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default PopUpMessage;
