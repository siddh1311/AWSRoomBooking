import { useEffect, useRef, useState } from "react";
import { Button, Label, Modal, FileInput } from "flowbite-react";
import { tailChase } from "ldrs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { addUser } from "../../apis/apis";
import { Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
// import csvTemplate from "./import_users_template.csv";
const Papa = require("papaparse");

const Status = {
  NOT_STARTED: 0,
  LOADING: 1,
  SUCCESS: 2,
  ERROR: 3,
  IMPORTING: 4,
};

function UploadFileModalUsers({
  show,
  setClose,
  cognitoidentityserviceprovider,
  buildingsByCities,
  onUploadSuccess,
  tableData,
}) {
  tailChase.register();
  const uploadContainerRef = useRef();
  const [selectedFile, setSelectedFile] = useState("");
  const [status, setStatus] = useState(Status.NOT_STARTED);
  const [errorMessage, setErrorMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    if (isImporting) {
      window.addEventListener("beforeunload", handleBeforeUnload, {
        capture: true,
      });
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isImporting]);

  const closeModal = () => {
    setSelectedFile("");
    setStatus(Status.NOT_STARTED);
    setClose();
  };

  const createUser = async (user, unsuccessfulEmails) => {
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
        MessageAction: "SUPPRESS",
        TemporaryPassword: "AWSRBS123",
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
    } catch (err) {
      console.error("Error creating user:", err);
      unsuccessfulEmails.add(user.email);
    }
  };

  const handleAddUsers = () => {
    const formData = new FormData();
    formData.append("file", selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      complete: async function (results) {
        const data = results.data.filter((row) =>
          Object.values(row).some((value) => value.trim() !== "")
        );

        const headers = Object.keys(data[0] || {});
        const expectedHeaders = [
          "employee_name",
          "email",
          "employee_role",
          "floor_number",
          "building_number",
          "airport_code",
        ];

        if (!arraysEqual(headers, expectedHeaders)) {
          setStatus(Status.ERROR);
          setErrorMessage("Incorrect columns. Please check your CSV file.");
          return;
        }

        const dataUpperCase = data.map((row) => ({
          ...row,
          airport_code: row.airport_code.toUpperCase(),
          employee_role: row.employee_role.toUpperCase(),
        }));

        const emptyFieldIndexes = dataUpperCase.reduce((acc, row, index) => {
          if (Object.values(row).some((value) => value.trim() === "")) {
            acc.push(index);
          }
          return acc;
        }, []);
        if (emptyFieldIndexes.length > 0) {
          setStatus(Status.ERROR);
          setErrorMessage(
            `Some rows contain empty fields. Please ensure all fields are filled. Rows: ${emptyFieldIndexes.join(", ")} (0 based row index)`
          );
          return;
        }

        const invalidRoleIndexes = dataUpperCase.reduce((acc, row, index) => {
          if (row.employee_role !== "ADMIN" && row.employee_role !== "USER") {
            acc.push(index);
          }
          return acc;
        }, []);
        if (invalidRoleIndexes.length > 0) {
          setStatus(Status.ERROR);
          setErrorMessage(
            `Invalid employee role(s). Please specify either 'ADMIN' or 'USER'. Rows: ${invalidRoleIndexes.join(", ")} (0 based row index)`
          );
          return;
        }

        const invalidBuildingIndexes = dataUpperCase.reduce(
          (acc, row, index) => {
            const airportCode = row.airport_code;
            const buildingNumber = parseInt(row.building_number);

            if (
              !buildingsByCities[airportCode] ||
              !buildingsByCities[airportCode].includes(buildingNumber)
            ) {
              acc.push(index);
            }
            return acc;
          },
          []
        );
        if (invalidBuildingIndexes.length > 0) {
          setStatus(Status.ERROR);
          setErrorMessage(
            `Invalid airport code(s) or building number(s). Rows: ${invalidBuildingIndexes.join(", ")} (0 based row index)`
          );
          return;
        }

        const seenEmails = new Set();
        const duplicateEmails = [];
        for (const row of data) {
          if (seenEmails.has(row.email)) {
            duplicateEmails.push(row.email);
          } else {
            seenEmails.add(row.email);
          }
        }

        if (duplicateEmails.length > 0) {
          setStatus(Status.ERROR);
          setErrorMessage(
            `Duplicate email(s) found in the CSV: ${duplicateEmails.join(", ")}`
          );
          return;
        }

        const duplicateEmailsTable = data.filter((row) =>
          tableData.some((existingRow) => existingRow.email === row.email)
        );

        if (duplicateEmailsTable.length > 0) {
          setStatus(Status.ERROR);
          setErrorMessage(
            `Email(s) already exist: ${duplicateEmailsTable.map((row) => row.email).join(", ")}`
          );
          return;
        }

        setIsImporting(true);
        setStatus(Status.IMPORTING);
        const unsuccessfulEmails = new Set();

        for (const row of dataUpperCase) {
          let retries = 3;
          let success = false;

          while (retries > 0 && !success) {
            try {
              await createUser(row, unsuccessfulEmails);
              success = true;
            } catch (error) {
              retries--;
              console.error(`Error creating user for ${row.email}:`, error);

              if (retries === 0) {
                unsuccessfulEmails.push(row.email);
              }
            }
          }
        }

        if (unsuccessfulEmails.size > 0) {
          setErrorMessage(
            `Some users could not be imported successfully. Please try again for the following email(s): ${Array.from(
              unsuccessfulEmails
            ).join(", ")}`
          );
          setIsImporting(false);
          setStatus(Status.ERROR);
          await onUploadSuccess();
        } else {
          setIsImporting(false);
          setStatus(Status.SUCCESS);
          await onUploadSuccess();
        }
      },
      error: function (error) {
        setStatus(Status.ERROR);
        setErrorMessage("Error parsing CSV file.");
      },
    });
  };

  const arraysEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  };

  // const downloadTemplate = () => {
  //   const anchor = document.createElement("a");
  //   anchor.href = csvTemplate;
  //   anchor.download = "import_users_template.csv";
  //   anchor.click();
  // };

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
          Import Users
          <Popover
            content={
              <div>
                <p>
                  <a
                    className="text-sky cursor-pointer"
                    href="https://drive.usercontent.google.com/download?id=1Sqxe-mTaMWX9rKH0_KmwYH50ob_Db06E&export=download&authuser=0"
                  >
                    Click here to download a template CSV file.
                  </a>
                  <br />
                  Ensure a valid airport_code and building_number combination is
                  used - that already exists in the system.
                  <br />
                  Imported users would not recieve an email unlike manually
                  added users and would be assigned a Temporary Password as
                  AWSRBS123 for login.
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

            {status === Status.IMPORTING && (
              <div className="mt-24 flex flex-col justify-center items-center self-center">
                <l-tail-chase
                  size="80"
                  speed="1.75"
                  color="#1677ff"
                ></l-tail-chase>
                <span className="text-center my-4 text-2xl font-bold text-[#1677ff]">
                  Users are being imported, please don't close popup or close
                  tab...
                </span>
              </div>
            )}

            {status !== Status.SUCCESS && status !== Status.ERROR && (
              <Button
                onClick={() => {
                  if (selectedFile) {
                    setStatus(Status.LOADING);
                    handleAddUsers();
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
                Import Users
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

export default UploadFileModalUsers;
