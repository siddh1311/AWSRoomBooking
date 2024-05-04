const { Graph } = require("./Graph");

/* 
    32 = YVR11
    41 = YVR25
    74 = YVR20
    63 = YVR14
    73 = YVR19
*/

function getDistanceFromLatLonInMeter(lat1, lon1, lat2, lon2) {
	var R = 6371; // Radius of the earth in km
	var dLat = deg2rad(lat2 - lat1); // deg2rad below
	var dLon = deg2rad(lon2 - lon1);
	var a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(deg2rad(lat1)) *
			Math.cos(deg2rad(lat2)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c; // Distance in km
	return d * 1000;
}

function deg2rad(deg) {
	return deg * (Math.PI / 180);
}

function generateMap(building_ids, coords) {
	const graph = new Graph(building_ids);

	for (var src_coord of coords) {
		for (var dst_coord of coords) {
			if (src_coord.building_number === dst_coord.building_number) {
				graph.addDistance(
					src_coord.building_number,
					src_coord.building_number,
					0
				);
			} else {
				let distance = getDistanceFromLatLonInMeter(
					src_coord.latitude,
					src_coord.longitude,
					dst_coord.latitude,
					dst_coord.longitude
				);

				graph.addDistance(
					src_coord.building_number,
					dst_coord.building_number,
					distance
				);
			}
		}
	}
	return graph;
}

module.exports = { generateMap };
