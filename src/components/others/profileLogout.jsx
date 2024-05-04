import { useState } from "react";
import profilepic from "../../user.png";
import { useSelector, useDispatch } from "react-redux";
import { resetUserState } from "../../redux/features/currentUser/userSlice";
import { clearSearchState } from "../../redux/features/mainPage/searchSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

// ref: https://flowbite.com/docs/components/dropdowns/
const ProfileLogout = (props) => {
  const { signOut } = props;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.currentUser);
  const email = userData.userEmail;

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          className="text-gray-400 dark:text-white  focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 flex items-center" // Modified class
          id="dropdownUsersButton"
          onClick={toggleDropdown}
        >
          {email}
          <img
            src={profilepic}
            className="ml-3 h-6 sm:h-9"
            alt="User profile"
          />
        </button>

        <div
          id="dropdownUsers"
          className={`absolute z-10 ${
            dropdownOpen ? "" : "hidden"
          } bg-slate-800 rounded-lg shadow w-60 dark:bg-gray-700 mt-[0.60rem]`}
        >
          <p
            className="flex items-center p-3 text-base font-medium text-white border-t border-gray-900 rounded-b-lg bg-slate-800 dark:border-gray-600 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-blue-500"
            onClick={() => {
              dispatch(resetUserState());
              dispatch(clearSearchState());
              signOut();
            }}
          >
            <FontAwesomeIcon
              icon={faRightFromBracket}
              className="mr-2"
              size="lg"
            />
            Logout
          </p>
        </div>
      </div>
    </>
  );
};

export default ProfileLogout;
