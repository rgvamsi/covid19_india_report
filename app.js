const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "covid19India.db");
const app = express();
app.use(express.json());
let db = null;

const initialDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initialDbAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
app.get("/states/", async (request, response) => {
  const statesQuery = `SELECT * FROM state;`;
  const states = await db.all(statesQuery);
  response.send(
    states.map((eachState) => convertStateDbObjectToResponseObject(eachState))
  );
});
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `SELECT 
  state_id AS stateId,
  state_name AS stateName,
  population
   FROM state WHERE state_id=${stateId};`;
  const state = await db.get(stateQuery);
  response.send(state);
});
app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `INSERT INTO 
  district (state_id,district_name, cases, cured, active, deaths)
  VALUES (${stateId},"${districtName}",${cases},${cured},${active},${deaths});`;
  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtQuery = `SELECT 
  district_id AS districtId,
  district_name AS districtName,
  state_id AS stateId,
  cases, cured, active, deaths FROM district WHERE district_id=${districtId};`;
  const dbResponse = await db.get(districtQuery);
  response.send(dbResponse);
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district WHERE district_id=${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, active, deaths } = request.body;
  const updateQuery = `UPDATE district SET 
    district_name="${districtName}",
    state_id=${stateId},
    cases=${cases},
    active=${active},
    deaths=${deaths}
    WHERE 
    district_id=${districtId};`;
  await db.run(updateQuery);
  response.send("District Details Updated");
});
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getSumStatesQuery = `
    SELECT 
      SUM(cases),
      SUM(cured), 
      SUM(active),
      SUM(deaths)
    FROM 
      district
    WHERE 
      state_id=${stateId};`;
  const stats = await db.all(getSumStatesQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateNameQuery = `
  SELECT state_name
  FROM district NATURAL JOIN state
  WHERE district_id=${districtId};`;
  const state = await db.get(stateNameQuery);
  response.send({ stateName: state.state_name });
});
module.exports = app;
