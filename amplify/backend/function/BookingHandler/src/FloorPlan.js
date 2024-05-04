// a set of functions to rank rooms of a given building based on their closeness to the participants' floors

// a set of functions to rank rooms of a given building based on their closeness to the participants' floors

// THIS IS THE FUNCTION CALLED TO FIND THE OPTIMAL FLOOR OF A SPECIFIC MEETING BUILDING
// takes in a list of participants
// finds the average floor for all of the participants
// if a participant lives in that building - it is their floor
// if a participant does not live in that building - the closest floor is the first floor
// TODO: figure out if the lowest floor is 'G' or '1'
function findOptimalFloor(buildingId, participants) {
    var optimalFloor = 0;
    for (var participant of participants) {
        if (buildingId === participant.building_number) {
            optimalFloor += participant.floor_number;
        } else {
            optimalFloor += 1;
        }
    }
    return Math.floor(optimalFloor / participants.length);
}

// THIS IS THE FUNCTION CALLED TO SORT ROOMS OF A SPECIFIC BUILDING BY THEIR FLOOR NUMBER
// takes in a list of rooms (ARRAY) of a specific building (must be all in one building)
// sorts the rooms by their floor number's closeness to the optimal floor
function rankRoomsByFloor(optimalFloor, rooms) {
    sortRoomsByFloor(optimalFloor, rooms, 0, rooms.length - 1)
}

// helper function for the rooms quicksort function to partition the given array of rooms
function partition(optimalFloor, rooms, lo, hi) {
    let pivot = Math.abs(optimalFloor - rooms[hi].floor_number)
        let i = lo - 1;
        for (let j = lo; j < hi; j++) {
            if (Math.abs(optimalFloor - rooms[j].floor_number) <= pivot) {
                i++;
                let temp = rooms[i];
                rooms[i] = rooms[j];
                rooms[j] = temp;
            }
        }
        let temp = rooms[i + 1];
        rooms[i+1] = rooms[hi];
        rooms[hi] = temp;
        return i+1;
}
// quicksort helper function (encapsulate the details of the array)
function sortRoomsByFloor(optimalFloor, rooms, lo, hi) {
    if (lo < hi) {
        let p = partition(optimalFloor, rooms, lo, hi);

        sortRoomsByFloor(optimalFloor, rooms, lo, p-1);
        sortRoomsByFloor(optimalFloor, rooms, p+1, hi);
    }
}

module.exports = {findOptimalFloor, rankRoomsByFloor}