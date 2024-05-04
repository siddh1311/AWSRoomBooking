import SearchForm from "./searchForm.jsx";
import { useSelector } from "react-redux";

const SearchMain = () => {
  const { booking_title, booking_id, editMode } = useSelector(
    (state) => state.search,
  );

  return (
    <div className="bg-[#f9f1e6] w-full min-h-screen flex flex-col items-center justify-center relative pt-40">
      <div className="relative">
        {editMode && (
          <div>
            <h1 className="flex items-center justify-center font-extrabold text-[2.75rem] tracking-[0.025em] leading-relaxed">
              Editing Your Booking... <br />
              Meeting Title: {booking_title}
            </h1>
          </div>
        )}
        {!editMode && (
          <>
            <h1
              id="search-heading"
              className="flex flex-col items-center justify-center font-extrabold text-[2.75rem] tracking-[0.075em] leading-relaxed text-center px-4"
            >
              Finding Available Meeting Space<span>Just Got Simpler.</span>
            </h1>
            <h3 className="text-center font-medium py-4 px-4">
              Our Room Booking App Makes It Easy To Search Across AWS Buildings
              And Book The Perfect Room For Your Needs.
            </h3>
          </>
        )}
        <div className="mx-8 mt-8 mb-16 flex px-3 py-3 items-center justify-center rounded-lg bg-slate-200 shadow-md dark:bg-slate-200 dark:text-slate-200">
          <SearchForm />
        </div>
      </div>
    </div>
  );
};

export default SearchMain;
