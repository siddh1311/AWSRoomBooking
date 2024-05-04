import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Outlet, Link } from "react-router-dom";
import { Loader } from "@aws-amplify/ui-react";
import logo from "../../logo.png";
import ProfileLogout from "./profileLogout";
import {
  fetchCurrentUser,
  setSignedIn,
} from "../../redux/features/currentUser/userSlice";

// ref: https://tailwindcomponents.com/component/tailwind-header
const Navbar = (props) => {
  const { signOut, user } = props;
  const [menuState, setMenuState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionUserGroup, setUserGroup] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
	const userDataRedux = useSelector((state) => state.currentUser);
	const { editMode } = useSelector((state) => state.search);
	const dispatch = useDispatch();

	useEffect(() => {
		if (user) dispatch(setSignedIn());
	}, [dispatch]);

	useEffect(() => {
		if (!userDataRedux.authenticated && userDataRedux.isSignedIn) {
			dispatch(fetchCurrentUser());
		}

		setUserGroup(userDataRedux.sessionGroup);
		setCurrentUserRole(userDataRedux.role);
		setLoading(userDataRedux.loading);
	}, [dispatch, userDataRedux]);

  if (loading) {
    return <Loader variation="linear" />;
  }

  const toggleHamburger = () => {
    setMenuState(!menuState);
  };

  return (
		<header>
			<nav
				className={`fixed w-full top-0 left-0 bg-slate-900 border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-gray-800 z-50 ${editMode ? "hidden" : ""}`}>
				<div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
					<Link to="/" aria-current="page">
						<p className="flex items-center">
							<img src={logo} className="mr-3 h-6 sm:h-9" alt="AWS RBS logo" />
							<span className="self-center text-xl font-semibold whitespace-nowrap text-white dark:text-white">
								AWS RBS
							</span>
						</p>
					</Link>

					<div className="flex items-center lg:order-2">
						<ProfileLogout signOut={signOut} />
						{
							<button
								onClick={toggleHamburger}
								className="inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
								aria-expanded={menuState}>
								<svg
									className={`w-6 h-6 ${menuState ? "hidden" : ""}`}
									fill="currentColor"
									viewBox="0 0 20 20"
									xmlns="http://www.w3.org/2000/svg">
									<path
										fillRule="evenodd"
										d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
										clipRule="evenodd"></path>
								</svg>
								<svg
									className={`w-6 h-6 ${menuState ? "" : "hidden"}`}
									fill="currentColor"
									viewBox="0 0 20 20"
									xmlns="http://www.w3.org/2000/svg">
									<path
										fillRule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clipRule="evenodd"></path>
								</svg>
							</button>
						}
					</div>
					<div
						className={`${
							menuState ? "" : "hidden"
						} justify-between items-center w-full lg:flex lg:w-auto lg:order-1 `}
						id="mobile-menu-2">
						<ul className="flex flex-col items-center font-medium lg:flex-row lg:space-x-8 lg:mt-0">
							{(sessionUserGroup === "Admin" ||
								currentUserRole === "ADMIN") && (
								<>
									<li>
										<Link
											to="/managerooms"
											className=" text-gray-400 dark:text-white hover:bg-slate-600 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800"
											aria-current="page">
											Manage Rooms
										</Link>
									</li>
									<li>
										<Link
											to="/manageusers"
											className="text-gray-400 dark:text-white hover:bg-slate-600  focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800"
											aria-current="page">
											Manage Users
										</Link>
									</li>
								</>
							)}
							<li>
								<Link
									to="/managebookings"
									className="text-gray-400 dark:text-white hover:bg-slate-600  focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800"
									aria-current="page">
									Manage Bookings
								</Link>
							</li>
						</ul>
					</div>
				</div>
			</nav>
			<Outlet />
		</header>
	);
};

export default Navbar;
