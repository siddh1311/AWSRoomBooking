const mysql = require("mysql");

function createDBConnection(dbName) {
  const connection = mysql.createConnection({
    host: "database-1.chy2o0w0cl5i.ca-central-1.rds.amazonaws.com",
    user: "admin",
    password: "password",
    database: dbName,
  });

  return connection;
}

function endDBConnection(dbConnection) {
  dbConnection.destroy();
  console.log("DESTROYING CONNECTION");
}

module.exports = {
  createDBConnection,
  endDBConnection,
};
