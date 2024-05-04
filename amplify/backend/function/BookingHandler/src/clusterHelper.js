// const { default: axios } = require("axios");
// const { createDBConnection } = require("/opt/connection");

// let dbConnection;

// // Initialize the database connection
// try {
//   dbConnection = createDBConnection("database1");
//   dbConnection.connect();
//   console.log("Database connection established successfully");
// } catch (error) {
//   console.error("Error connecting to database:", error);
//   // If there's an error connecting to the database, terminate the application
//   process.exit(1);
// }

// Enable CORS for all methods

async function getBuildingDetails(dbConnection) {
  return new Promise((resolve, reject) => {
    dbConnection.query(
      "SELECT * FROM temp_building_location",
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          // console.log(results);
          resolve(results);
        }
      }
    );
  });
}

async function getParticipantDetails(participants, dbConnection) {
  return new Promise((resolve, reject) => {
    // console.log("part",participants);
    dbConnection.query(
      "SELECT * FROM employee WHERE id IN (?)",
      [participants],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          // console.log(results);
          getFloorBuildingCityDetails(results, dbConnection)
            .then((buildingDetails) => {
              const mapResults = results.map((user) => {
                const index = buildingDetails.findIndex(
                  (item) => item.id === user.floor_building_id
                );
                if (buildingDetails[index]) {
                  return {
                    ...user,
                    floorNumber: buildingDetails[index].floor_number,
                    buildingNumber: buildingDetails[index].building_number,
                    cityId: buildingDetails[index].city_id,
                    latitude: buildingDetails[index].latitude,
                    longitude: buildingDetails[index].longitude,
                  };
                } else {
                  console.error(
                    "Error getting buildingDetails for participants"
                  );
                  return user;
                }
              });
              // console.log("11",mapResults);
              resolve(mapResults);
            })
            .catch(reject);
          // console.log("11",check);
          // resolve(results);
        }
      }
    );
  });
}

async function getFloorBuildingCityDetails(params, dbConnection) {
  return new Promise((resolve, reject) => {
    // params.data
    const floorBuildingIds = params.map((item) => item.floor_building_id);
    // console.log("check",floorBuildingIds);
    dbConnection.query(
      "SELECT * FROM floor_building WHERE id IN (?)",
      [floorBuildingIds],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          // console.log(results);
          getLatitudeLongitude(results, dbConnection)
            .then((latitudeLongitudeResults) => {
              const mapResults = results.map((floorBuilding) => {
                const index = latitudeLongitudeResults.findIndex(
                  (item) =>
                    (item.building_number === floorBuilding.building_number) &
                    (item.city_id === floorBuilding.city_id)
                );
                if (latitudeLongitudeResults[index]) {
                  return {
                    ...floorBuilding,
                    latitude: latitudeLongitudeResults[index].latitude,
                    longitude: latitudeLongitudeResults[index].longitude,
                  };
                } else {
                  console.error("jsdfhd");
                  return floorBuilding;
                }
              });
              // console.log("map",mapResults);
              resolve(mapResults);
            })
            .catch(reject);
          // }resolve({latitudeLongitude,results})).catch(reject);
          // console.log("!2",latitudeLongitude);
          // resolve(latitudeLongitude,results);
        }
      }
    );
  });
}

async function getLatitudeLongitude(params, dbConnection) {
  return new Promise((resolve, reject) => {
    // params.data
    const buildingIds = params.map((item) => item.building_number);
    const cityIds = params.map((item) => item.city_id);
    // console.log("check",floorBuildingIds);
    dbConnection.query(
      "SELECT * FROM temp_building_location WHERE building_number IN (?) AND city_id IN (?)",
      [buildingIds, cityIds],
      function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          // console.log(results);
          resolve(results);
        }
      }
    );
  });
}

let computed_distances = {};
async function xyDistance(room1, room2) {
  let room1_tuple = room1;
  let room2_tuple = room2;
  // console.log("room_tuple",room1_tuple);
  // Check if distance between these rooms has already been computed
  // if (computed_distances.hasOwnProperty(room1_tuple) && computed_distances[room1_tuple].hasOwnProperty(room2_tuple)) {
  //     return computed_distances[room1_tuple][room2_tuple];
  // } else if (computed_distances.hasOwnProperty(room2_tuple) && computed_distances[room2_tuple].hasOwnProperty(room1_tuple)) {
  //     return computed_distances[room2_tuple][room1_tuple];
  // }

  // Compute distance
  let lat1 = room1.latitude * (Math.PI / 180);
  let lon1 = room1.longitude * (Math.PI / 180);
  let lat2 = room2.latitude * (Math.PI / 180);
  let lon2 = room2.longitude * (Math.PI / 180);
  let dlat = lat2 - lat1;
  let dlon = lon2 - lon1;
  let a =
    Math.pow(Math.sin(dlat / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let radius_earth = 6371; // Radius of the Earth in kilometers
  let distance = radius_earth * c;

  // Store computed distance
  // if (!computed_distances.hasOwnProperty(room1_tuple)) {
  //     computed_distances[room1_tuple] = {};
  // }
  // computed_distances[room1_tuple][room2_tuple] = distance;
  // console.log("jhgdhfsfjsdjf",distance)
  return distance;
}

async function distance(room1, room2) {
  const heightMultiplier = 0.003;
  // console.log("room1",room1);
  // console.log("room2",room2);
  const room1LatLon = { latitude: room1.latitude, longitude: room1.longitude };
  const room2LatLon = { latitude: room2.latitude, longitude: room2.longitude };
  // console.log("room1l",room1LatLon);
  // console.log("height",room1.floorNumber*heightMultiplier);
  if (
    room1.latitude === room2.latitude &&
    room1.longitude === room2.longitude
  ) {
    return Math.abs(room1.floorNumber - room2.floorNumber) * heightMultiplier;
  } else {
    return (
      (await xyDistance(room1LatLon, room2LatLon)) +
      room1.floorNumber * heightMultiplier +
      room2.floorNumber * heightMultiplier
    );
  }

  // return Math.sqrt(Math.pow(room1.latitude - room2.latitude, 2) + Math.pow(room1.longitude - room2.longitude, 2)) + (room1.floorNumber*10)+(room2.floorNumber*10);
}

async function kmeansPlusPlus(participantsWithDetails, numClusters) {
  const latitudeLongitudeFloor = participantsWithDetails.map(
    ({ latitude, longitude, floorNumber }) => ({
      latitude,
      longitude,
      floorNumber,
    })
  );
  const centroids = [];

  // first centroid
  centroids.push(
    latitudeLongitudeFloor[
      Math.floor(Math.random() * latitudeLongitudeFloor.length)
    ]
  );

  // next centroids
  for (let k = 1; k < numClusters; k++) {
    const closestDistances = [];
    for (let i = 0; i < latitudeLongitudeFloor.length; i++) {
      const closestDistance = await nearestCentroidDistance(
        latitudeLongitudeFloor[i],
        centroids
      );
      closestDistances[i] = closestDistance;
    }
    // next centroid
    const sumDistances = closestDistances.reduce(
      (accumulator, value) => accumulator + value,
      0
    );
    let randomValue = Math.random() * sumDistances;
    let currentIndex = 0;

    if (randomValue === 0) {
      currentIndex++;
    }

    while (randomValue > 0) {
      randomValue -= closestDistances[currentIndex];
      currentIndex++;
    }
    // Add the chosen centroid to the list
    centroids.push(latitudeLongitudeFloor[currentIndex - 1]);
  }

  return centroids;
}

async function nearestCentroidDistance(dataPoint, centroids) {
  let minDistance = Infinity;

  for (const centroid of centroids) {
    const dist = await distance(dataPoint, centroid);
    minDistance = Math.min(minDistance, dist);
  }
  return minDistance;
}

async function assignToCentroid(dataPoints, centroids) {
  const assignments = [];

  for (let point of dataPoints) {
    let distancesToCentroids = [];
    for (let centroid of centroids) {
      // console.log("chchchchch",centroid);
      let distanceToCentroid = await distance(point, centroid);
      // console.log("dsfsdf",distanceToCentroid)
      distancesToCentroids.push(distanceToCentroid);
    }
    let closestCentroidIndex = distancesToCentroids.indexOf(
      Math.min(...distancesToCentroids)
    );
    assignments.push(closestCentroidIndex);
  }
  return assignments;
}

async function reCluster(dataPoints, assignments, numClusters, centroids) {
  const newCentroids = [];
  const counts = new Array(numClusters).fill(0);
  // Array has sum of coordinates for each centroid
  const sumCoordinates = [];
  for (let i = 0; i < numClusters; i++) {
    sumCoordinates.push({ latitude: 0, longitude: 0, floorNumber: 0 });
  }
  for (let i = 0; i < dataPoints.length; i++) {
    const centroidIndex = assignments[i];
    const point = dataPoints[i];
    sumCoordinates[centroidIndex].latitude += point.latitude;
    sumCoordinates[centroidIndex].longitude += point.longitude;
    sumCoordinates[centroidIndex].floorNumber += point.floorNumber;
    counts[centroidIndex]++;
  }

  for (let i = 0; i < numClusters; i++) {
    if (counts[i] > 0) {
      const centroid = {
        latitude: sumCoordinates[i].latitude / counts[i],
        longitude: sumCoordinates[i].longitude / counts[i],
        floorNumber: sumCoordinates[i].floorNumber / counts[i],
      };
      newCentroids.push(centroid);
    } else {
      newCentroids.push(centroids[i]);
    }
  }
  return newCentroids;
}

async function checkConvergence(oldCentroids, newCentroids) {
  for (let i = 0; i < oldCentroids.length; i++) {
    if (
      oldCentroids[i].latitude !== newCentroids[i].latitude ||
      oldCentroids[i].longitude !== newCentroids[i].longitude ||
      oldCentroids[i].floorNumber !== newCentroids[i].floorNumber
    ) {
      return false;
    }
  }
  return true;
}

async function compute(participants, numClusters, dbConnection) {
  return new Promise((resolve, reject) => {
    try {
      // const numClusters = 2;
      getParticipantDetails(participants, dbConnection)
        .then(async (participantsWithDetails) => {
          let centroids = await kmeansPlusPlus(
            participantsWithDetails,
            numClusters
          );
          let converged = false;
          let iterations = 0;
          let maxIterations = numClusters * 50;
          console.log("aaaa", centroids);
          while (!converged && iterations < maxIterations) {
            iterations += 1;
            const assignments = await assignToCentroid(
              participantsWithDetails,
              centroids
            );
            // console.log("assi",assignments);
            const newCentroids = await reCluster(
              participantsWithDetails,
              assignments,
              numClusters,
              centroids
            );
            // console.log("new",newCentroids);
            converged = await checkConvergence(centroids, newCentroids);
            centroids = newCentroids;
          }

          console.log("Converged after", iterations, "iterations.");
          for (let i = 0; i < numClusters; i++) {
            console.log(
              `Final centroid for Cluster ${i + 1}: ${centroids[i].latitude},${
                centroids[i].longitude
              },${centroids[i].floorNumber}`
            );
          }
          console.log("cene", centroids);
          const emptyClusterCheck = new Array(numClusters).fill(0);
          let countArray = new Array(centroids.length).fill(0);
          // Loop through participants
          for (let participant of participantsWithDetails) {
            let distancesToCentroids = [];
            for (let centroid of centroids) {
              let distanceToCentroid = await distance(participant, centroid);
              distancesToCentroids.push(distanceToCentroid);
            }
            // console.log("dissttt",distancesToCentroids);
            const dist = Math.min(...distancesToCentroids);
            // let closestCentroidIndex = distancesToCentroids.indexOf(
            //   dist
            // );
            let count = 0;
            let indexes = distancesToCentroids
              .map((value, index) => {
                if (value === dist) {
                  count = count + 1;
                  return index;
                }
                return null;
              })
              .filter((index) => index !== null);
            let minimum = countArray[indexes[0]];
            let minIndex = indexes[0];
            for (let i of indexes) {
              if (countArray[i] < minimum) {
                minimum = countArray[i];
                minIndex = i;
              }
            }
            let closestCentroidIndex = minIndex;
            countArray[minIndex]++;
            participant.closestCentroidIndex = closestCentroidIndex + 1;
            // console.log("dfdf");
            console.log(`${participant.name} in ${closestCentroidIndex + 1}`);
            emptyClusterCheck[closestCentroidIndex]++;
          }
          const emptyCheck = emptyClusterCheck.findIndex((item) => item === 0);
          if (emptyCheck >= 0) {
            console.log("AGAIN");
            return compute(participants, numClusters, dbConnection);
          } else {
            resolve(participantsWithDetails);
          }
        })
        .catch((error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { getBuildingDetails, compute, getParticipantDetails };
