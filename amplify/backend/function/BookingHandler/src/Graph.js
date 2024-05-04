class Graph {
	buildings;
	adjacencyMatrix;

	constructor(buildings) {
		this.buildings = new Set();
		this.adjacencyMatrix = new Map();
		for (var i of buildings) {
			this.buildings.add(i);
			this.adjacencyMatrix.set(i, new Map());
		}
	}

	// REQUIRES: a building
	// MODIFIES: adds the building as a node in the graph (without distances to it)
	addEntry(building) {
		this.buildings.add(building);
		this.adjacencyMatrix.set(building, new Map());
	}

	// REQUIRES: buildingi d1, building id2, distance (integer)
	// MODIFIES: adds this distance to the graph if it does not already exist
	addDistance(building1, building2, distance) {
		if (!this.buildings.has(building1)) {
			this.addEntry(building1);
		}
		if (!this.buildings.has(building2)) {
			this.addEntry(building2);
		}

		var b1distances = this.adjacencyMatrix.get(building1);
		var b2distances = this.adjacencyMatrix.get(building2);

		b1distances.set(building2, distance);
		b2distances.set(building1, distance);

		this.adjacencyMatrix.set(building1, b1distances);
		this.adjacencyMatrix.set(building2, b2distances);
	}

	// REQUIRES: A possible meeting building and a list of participant buildings (participant buildings can appear more than once)
	// EFFECTS: returns the total distance all the participants must travel to get to the meeting building
	getTotalTravelDistance(meetingBuilding, participantBuildings) {
		if (!this.adjacencyMatrix.has(meetingBuilding)) {
			return Number.POSITIVE_INFINITY;
		}
		var distances = this.adjacencyMatrix.get(meetingBuilding);
		var totalDistance = 0;
		for (var b of participantBuildings) {
			// OK THIS IS NOT WORKING -
			// Outputs Infinity in test.js instead of the right value - change to 10000000 and it works
			if (!distances.has(b.building_number)) {
				totalDistance += 10000000;
				break;
			}
			if (b === meetingBuilding) {
				totalDistance += 0;
			} else {
				var dist = distances.get(b.building_number);
				totalDistance += dist * b.participants_num;
			}
		}
		return totalDistance;
	}

	// REQUIRES: A list of meeting buildings, a list of participant buildings (participant buildings can appear more than once)
	// EFFECTs: for each meeting building, returns the distance all of the participants must travel to get to it
	getTotalTravelDistances(meetingBuildings, participantBuildings) {
		var travelDistances = [];
		for (var b of meetingBuildings) {
			travelDistances.push({
				meeting_building: b,
				distance: this.getTotalTravelDistance(b, participantBuildings),
			});
		}
		return travelDistances;
	}

	// quick sort helper function
	partition(travelDistances, lo, hi) {
		let pivot = travelDistances[hi].distance;
		let i = lo - 1;
		for (let j = lo; j < hi; j++) {
			if (travelDistances[j].distance <= pivot) {
				i++;
				let temp = travelDistances[i];
				travelDistances[i] = travelDistances[j];
				travelDistances[j] = temp;
			}
		}
		let temp = travelDistances[i + 1];
		travelDistances[i + 1] = travelDistances[hi];
		travelDistances[hi] = temp;
		return i + 1;
	}

	// REQUIRES: A list of travel distances, and a direction to sort in ("increasing" or "decreasing")
	// MODIFIES: sorts array in place
	sortTravelDistances(travelDistances, lo, hi) {
		if (lo < hi) {
			let p = this.partition(travelDistances, lo, hi);

			this.sortTravelDistances(travelDistances, lo, p - 1);
			this.sortTravelDistances(travelDistances, p + 1, hi);
		}
	}

	// REQUIRES: A list of meeting buildings, a list of participant buildings (participant buildings can appear more than once),
	//          direction (string - "increasing" or "decreasing")
	// EFFECTS: returns a sorted list of travelDistances
	sortedTotalTravelDistances(participantBuildings) {
		var travelDistances = this.getTotalTravelDistances(
			Array.from(this.buildings),
			participantBuildings
		);
		this.sortTravelDistances(travelDistances, 0, travelDistances.length - 1);
		return travelDistances;
	}
}

module.exports = { Graph };
