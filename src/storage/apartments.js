const fs = require('fs');
const { config } = require('../config/env');

const APTS_FILE = config.paths.apartments;

function load() {
  try {
    if (fs.existsSync(APTS_FILE)) {
      return JSON.parse(fs.readFileSync(APTS_FILE, 'utf8'));
    }
  } catch (err) {
    console.log('Error reading apartments file:', err.message);
  }
  return { lastCheckIndex: 0, apartments: [] };
}

function save(data) {
  fs.writeFileSync(APTS_FILE, JSON.stringify(data, null, 2));
}

function getSeenIds(data) {
  return data.apartments.map(apt => apt.id);
}

function filterByLocation(apartments) {
  const locationFilter = config.olx.locationFilter;
  return apartments.filter(apt =>
    locationFilter.some(location =>
      apt.location.toLowerCase().includes(location.toLowerCase())
    )
  );
}

function addNewApartments(data, newApartments, checkIndex) {
  const checkTimestamp = new Date().toISOString();

  const apartmentsWithMeta = newApartments.map(apt => ({
    ...apt,
    checkIndex,
    checkTimestamp
  }));

  data.lastCheckIndex = checkIndex;
  data.apartments = [...data.apartments, ...apartmentsWithMeta];

  save(data);
  return data;
}

function updateCheckIndex(data, checkIndex) {
  data.lastCheckIndex = checkIndex;
  save(data);
  return data;
}

module.exports = {
  load,
  save,
  getSeenIds,
  filterByLocation,
  addNewApartments,
  updateCheckIndex
};
