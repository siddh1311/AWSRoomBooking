import { useRef, useState } from "react";
import { Button, Label, Modal, TextInput, FileInput } from "flowbite-react";
import { tailChase } from "ldrs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { uploadImportRooms } from "../../apis/apis";
import { Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
// import csvTemplate from "../../../public/import_rooms_template.csv";

const Status = {
  NOT_STARTED: 0,
  LOADING: 1,
  SUCCESS: 2,
  ERROR: 3,
};

function UploadFileModal({ show, setClose, onSubmit }) {
  tailChase.register();
  const uploadContainerRef = useRef();
  const [selectedFile, setSelectedFile] = useState("");
  const [status, setStatus] = useState(Status.NOT_STARTED);
  const [errorMessage, setErrorMessage] = useState("");

  const closeModal = () => {
    setSelectedFile("");
    setStatus(Status.NOT_STARTED);
    setClose();
  };

  // const downloadTemplate = () => {
  //   const anchor = document.createElement("a");
  //   anchor.href = csvTemplate;
  //   anchor.download = "import_rooms_template.csv";
  //   anchor.click();
  // };

  const handleAddRooms = async () => {
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await uploadImportRooms(formData);
      onSubmit();
      setStatus(Status.SUCCESS);
    } catch (error) {
      console.error(
        "Error uploading file:",
        error.response ? error.response.data : error.message
      );
      setStatus(Status.ERROR);
      setErrorMessage(error.response.data.details);
    }
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
        <Modal.Header className="m-4">
          Import Rooms
          <Popover
            content={
              <div>
                <p>
                  <a
                    className="text-sky cursor-pointer"
                    href="https://drive.usercontent.google.com/download?id=15vlzAjCbyvVgZxqrSHLyFi1PzPkN1xqf&export=download&authuser=0"
                  >
                    Click here to download a template CSV file.
                  </a>
                  <br />
                  Ensure that for facilities, you only use one of the 
                  four options: "N/A", "A/V", "V/C", or "AV/VC".
                  <br />
                  Ensure that for city, you only use one of the 
                  three options: "YVR", "YYZ" or "YUL".
                </p>
              </div>
            }
          >
            <InfoCircleOutlined className="ml-1" />
          </Popover>
        </Modal.Header>
        <Modal.Body>
          <div className="flex flex-col items-center justify-center">
            {status === Status.NOT_STARTED && (
              <div
                className="flex w-full items-center justify-center"
                ref={uploadContainerRef}
              >
                <Label
                  htmlFor="dropzone-file"
                  className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600"
                >
                  <div className="flex flex-col items-center justify-center pb-6 pt-5">
                    <svg
                      className="mb-4 h-8 w-8 text-gray-500 dark:text-gray-400"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Only CSV files
                    </p>
                  </div>

                  <FileInput
                    id="dropzone-file"
                    className="hidden"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setSelectedFile(file);
                    }}
                  />

                  {!selectedFile && (
                    <h2 className={`text-center text-sm text-red-600 mb-4`}>
                      Please upload your file
                    </h2>
                  )}

                  {selectedFile && (
                    <h2 className={`text-center text-sm text-green-500 mb-4`}>
                      Selected file: {selectedFile.name}
                    </h2>
                  )}
                </Label>
              </div>
            )}

            {status === Status.LOADING && (
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

            {status === Status.SUCCESS && (
              <div className="mt-16 flex flex-col justify-center items-center self-center">
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  size="7x"
                  className="text-green-500"
                />
                <span className="text-center my-4 text-2xl font-bold text-green-500 ">
                  Your file has been imported successfully
                </span>
              </div>
            )}

            {status === Status.ERROR && (
              <div className="mt-16 flex flex-col justify-center items-center self-center">
                <FontAwesomeIcon
                  icon={faCircleXmark}
                  size="7x"
                  className="text-red-500"
                />
                <span className="text-center my-4 text-2xl font-bold text-red-500 ">
                  There was an error importing your file
                </span>
                <span className="text-center my-4 text-base font-bold text-red-500 ">
                  {errorMessage}
                </span>
              </div>
            )}

            {status !== Status.SUCCESS && status !== Status.ERROR && (
              <Button
                onClick={() => {
                  if (selectedFile) {
                    setStatus(Status.LOADING);
                    handleAddRooms();
                  } else {
                    uploadContainerRef.current.classList.add("shake-animation");
                    setTimeout(() => {
                      uploadContainerRef.current.classList.remove(
                        "shake-animation"
                      );
                    }, 600);
                  }
                }}
                className="my-4"
              >
                Import Rooms
              </Button>
            )}

            {(status === Status.SUCCESS || status === Status.ERROR) && (
              <Button
                onClick={() => {
                  setStatus(Status.NOT_STARTED);
                  setSelectedFile("");
                }}
                className="my-4"
              >
                Import Again
              </Button>
            )}
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

export default UploadFileModal;
