const assert = require("assert");
const request = require("../support/wrapper");

const metaWeatherHost = "www.metaweather.com";
const searchPath = "/api/location/search/";
const locationPath = "/api/location";

const cityName = "San Diego";

var memory = {};

describe("Get data for San Diego", function() {
    describe("When requesting location data for San Diego", function() {
        it("Location data for San Diego will return", function() {
            return doLocationSearch("San Diego")
                .then(result => {
                    return getLatLongAndWoeid(result, cityName);
                })
                .then(result => {
                    memory.latLong = result.cityLoc;
                    memory.woeid = result.cityWoeid;
                    return result;
                })
                .catch(err => {
                    return Promise.reject(err);
                });
        });
    });
    describe("When getting saved lat+long", function() {
        it("Location data for San Diego will return", function() {
            return searchByLatLong(memory.latLong.split(","))
                .then(result => {
                    return checkCityIsClosest(result, cityName);
                })
                .catch(err => {
                    return Promise.reject(err);
                });
        });
    });
    describe("When requesting weather data for saved woeid", function() {
        it("Weather data for San Diego will return", function() {
            return getWeatherData(memory.woeid)
                .then(result => {
                    return checkIfWeatherDataAndCity(
                        result,
                        cityName,
                        memory.woeid
                    );
                })
                .catch(err => {
                    return Promise.reject(err);
                });
        });
    });
});

function checkIfWeatherDataAndCity(result, cityName, woeid) {
    return new Promise((resolve, reject) => {
        if (result.statusCode > 200)
            reject(`Response code was ${result.statusCode}`);
        var asJson = JSON.parse(result.responseBuffer);
        if (!asJson.consolidated_weather)
            reject(`consolidatedWeather object was not found in the response`);
        var sortedWeather = asJson.consolidated_weather.sort(function(a, b) {
            return a.applicable_date - b.applicable_date;
        });
        var currentWeather = sortedWeather[0];

        console.log(`
        Weather data for ${cityName}:
        State - ${currentWeather.weather_state_name}
        Temperature - ${currentWeather.the_temp}C
        Wind Speed - ${Math.round(currentWeather.wind_speed)}mph
        `);
    });
}

function checkCityIsClosest(result, cityName) {
    return new Promise((resolve, reject) => {
        console.log(result)
        if (result.statusCode > 200)
            reject(`Response code was ${result.statusCode}`);
        var asJson = JSON.parse(result.responseBuffer);
        var sortedResponse = asJson.sort(function(a, b) {
            return a.distance - b.distance;
        });
        var closestCity = sortedResponse[0];
        if (closestCity.title == cityName) {
            resolve();
        } else {
            reject(`Closest city was not ${cityName}`);
        }
    });
}

function getLatLongAndWoeid(result, cityName) {
    return new Promise((resolve, reject) => {
        if (result.statusCode > 200)
            reject(`Response code was ${result.statusCode}`);
        var cityLoc = "";
        var cityWoeid = "";
        var asJson = JSON.parse(result.responseBuffer);
        asJson.forEach(city => {
            if (city.title == cityName) {
                cityLoc = city.latt_long;
                cityWoeid = city.woeid;
            }
        });
        if (!cityLoc || !cityWoeid) {
            reject("City was not found in results");
        } else {
            resolve({ cityLoc, cityWoeid });
        }
    });
}

function doLocationSearch(cityName) {
    return request(
        "",
        makeOptions(
            "https",
            "www.metaweather.com",
            "/api/location/search/",
            "get",
            {
                query: cityName
            }
        )
    );
}

function searchByLatLong(coordinates) {
    return request(
        "",
        makeOptions("https", metaWeatherHost, searchPath, "get", {
            lattlong: coordinates
        })
    );
}

function getWeatherData(woeid) {
    return request(
        "",
        makeOptions(
            "https",
            metaWeatherHost,
            `${locationPath}/${woeid}/`,
            "get"
        )
    );
}

function makeOptions(protocol, host, path, method, query) {
    var tempUri = `${protocol}://${host}${path}`;
    if (query) {
        tempUri += "?";
        let queryKeys = Object.keys(query);
        queryKeys.forEach((key, index) => {
            if (typeof query[key] !== "array") {
                tempUri += `${key}=${query[key]}`;
            } else {
                tempUri += `${key}=${query[key].join()}`;
            }
            if (index < queryKeys.length - 1) {
                tempUri += "&";
            }
        });
    }
    var uriObj = require("url").parse(tempUri);
    uriObj.maxRetries = 3;
    uriObj.defaultTimeout = 10000;
    return uriObj;
}
