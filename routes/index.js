var express = require('express');
var router = express.Router();
var axios = require('axios');
var apiKey = process.env.apiKey;
var billInfo = require('./billInfo/billInfo.js').billInfo;
const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

async function getVehicles() {
  var vehicles;
  var request = {
    url: "https://api.airtable.com/v0/appdiwrmhPAhEoa5O/VEHICLE?view=Grid%20view",
    headers: {
        'Authorization': 'Bearer ' + apiKey
    },
  }
  await axios(request)
    .then(function(res) {
      vehicles = res.data.records;
    }).catch(function(e){
      console.log(e)
    })
  return vehicles;
}

async function getTrips() {
  var trips;
  var request = {
    url: "https://api.airtable.com/v0/appdiwrmhPAhEoa5O/TRIPS?&view=Grid%20view",
    headers: {
        'Authorization': 'Bearer ' + apiKey
    },
  }
  await axios(request)
    .then(function(res) {
      trips = res.data.records;
    }).catch(function(e){
      console.log(e)
    })
  return trips;
}

async function getCompany(id) {
  var company;
  var request = {
    url: "https://api.airtable.com/v0/appdiwrmhPAhEoa5O/COMPANY/"+id,
    headers: {
        'Authorization': 'Bearer ' + apiKey
    },
  }
  await axios(request)
    .then(function(res) {
      company = res.data;
    }).catch(function(e){
      console.log(e)
    })
  return company;
}

async function getCompanies() {
  var companies;
  var request = {
    url: "https://api.airtable.com/v0/appdiwrmhPAhEoa5O/COMPANY?view=Grid%20view",
    headers: {
        'Authorization': 'Bearer ' + apiKey
    },
  }
  await axios(request)
    .then(function(res) {
      companies = res.data.records;
    }).catch(function(e){
      console.log(e)
    })
  return companies;
}

async function getContractors() {
  var contractors;
  var request = {
    url: "https://api.airtable.com/v0/appdiwrmhPAhEoa5O/CONTRACTORS?&view=Grid%20view",
    headers: {
        'Authorization': 'Bearer ' + apiKey
    },
  }
  await axios(request)
    .then(function(res) {
      contractors = res.data.records;
    }).catch(function(e){
      console.log(e)
    })
  return contractors;
}

/* GET home page. */
router.post('/invoice', async function(req, res, next) {
  var vehicles = await getVehicles();
  var trips = await getTrips();
  var company = await getCompany(req.body.companyId);
  var contractors = await getContractors();
  var start = new Date(req.body.fromDate)
  var end = new Date(req.body.toDate)
  if(start > end) {
    res.redirect("/")
    return
  }

  var summary = vehicles.map(function(v) {
    var vehicleId = v.id;
    return trips.filter(function(t) {

      var createdTime = new Date(t.createdTime);
      end.setDate(end.getDate() + 1);
      return t.fields.VEHICLENO == vehicleId && t.fields.COMPANY == req.body.companyId &&
      (createdTime >= start && createdTime <= end)
    }).reduce(function(acc, t) {
      acc.totalTrips = acc.totalTrips + 1;
      acc.amount = acc.amount + t.fields.CHARGE;
      return acc;
    }, {vehicleNo: v.fields.VEHICLENO, totalTrips: 0, perTripCapacity: v.fields.CAPACITY, amount: 0})
  }).filter(function(x) {
    return x.amount > 0;
  }).map(function(s, i) {
    s.serialNo = i + 1;
    return s;
  })
  var totalTrips = summary.reduce(function(acc, s){return acc + s.totalTrips}, 0)
  var totalAmount = summary.reduce(function(acc, s){return acc + s.amount}, 0)
  summary.totalTrips = totalTrips;
  summary.totalAmount = totalAmount;
  summary.billInfo = billInfo;
  if(trips.length > 0) {
    summary.billInfo.contractorName = contractors
      .filter(function(c) {return c.id == trips[0].fields.CONTRACTOR})[0].fields.Name;
  }
  summary.billInfo.companyName = company.fields.Name;
  summary.billInfo.subject = billInfo.sub+' (Vehicle No.' +
  summary.map(function(s){return s.vehicleNo}).join(",")+')';
  summary.phone = company.fields.PHONE_NUMBER;
  summary.mobile = company.fields.MOBILE_NO;
  summary.refNo = "dummy";
  summary.date = new Date().toLocaleDateString();
  summary.month = monthNames[start.getMonth()] + ' ' + start.toLocaleDateString() + ' TO ' + end.toLocaleDateString()


  res.render('index', { title: 'Billing', summary: summary});
});

router.get('/', async function(req, res, next) {
  var companies = await getCompanies();
  res.render('option', { title: 'Billing', companies: companies});
})

module.exports = router;
