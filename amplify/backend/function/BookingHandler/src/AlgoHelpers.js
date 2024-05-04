const {YVR_MAP} = require("./BuildingMap")

function mainSearch(map, participantBuildingIds) {
	const optimalBuildings = map.sortedTotalTravelDistances(
		participantBuildingIds
	);
	return optimalBuildings;
}

module.exports = {mainSearch}