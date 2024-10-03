var express = require('express');
var app = express();
var bodyParser = require( 'body-parser' );

app.use( bodyParser( { extended: false } ));

const fs = require( 'fs' );
const path = require( 'path' );

const rolesdir = './roles/';
const datadir = './data/';
const hostname = "http://localhost:8080";

// helper: convert string to lowercase with no spaces, useful to make keys
function lcns( str ) {
  return str.replaceAll( ' ', '' ).toLowerCase();
}

function saveDoc( docid, doc ) {
  var json = JSON.stringify( doc );
  var filename = `${datadir}${docid}.json`;
  fs.writeFileSync( filename, json );
}

function loadDoc( docid ) {
  var json = {};
  var filename = `${datadir}${docid}.json`;
  try {
    json = require( filename );
    // console.log( `Loaded ${filename}`  );
  }
  catch( e ) {
    console.log( `Could not Load doc ${docid} from ${filename}`  );
    //console.log( `${e.name} : ${e.message}` )
    //console.log( e )
  }
  return json;
}

function isDocIdExists( docid ) {
  var filename = `${datadir}${docid}.json`;
  return fs.existsSync( filename );
}

// helper: get directory listing of json role description files
function getRoles() {
  const filename = rolesdir + '*'; 
  const dirname = path.dirname(filename);
  const dirContents = fs.readdirSync(dirname);
  return dirContents.filter( (filename) => filename.endsWith( '.json' ) );
}

var roleNames = [];   /* close yer eyes this is bad :-) */

// help: make a kv of roles, keyed by lcns(role name)
function getRolesDB() {
  var jsonfiles = getRoles();
  var db = {};

  for (var i in jsonfiles) {
    try {
      var json = require( "./roles/" + jsonfiles[i] );
      console.log( `Loaded ${json.role} from ${jsonfiles[i]}`  );
      roleNames.push( json.role );
      db[ lcns( json.role ) ] = json;
    }
    catch( e ) {
      console.log( `Error when loading ${jsonfiles[i]}` );
      console.log( `${e.name} : ${e.message}` )
      console.log( e )
    }
  }
  return db;
}

const db = getRolesDB();

console.log( '--->' );
for (const [key, value] of Object.entries(db)) {
  console.log(`${key}: ${value.role}`);
}

function getMenuData( role, activeKey, docid ) {
  var json = db[ role ];
  var menuData = [];

  for (var x in json.skills) {
    var menuItem = {};
    menuItem.name = json.skills[x].name;
    menuItem.key = lcns( menuItem.name );
    menuItem.description = json.skills[x].description;
    menuItem.evidence = json.skills[x].evidence;
    menuItem.url = `${hostname}/role/${role}/${menuItem.key}/${docid || ''}`;
    menuItem.group = 'skill';
    menuItem.active = (menuItem.key == activeKey);
    menuData.push( menuItem );
  }
  for (var x in json.behaviours) {
    var menuItem = {};
    menuItem.name = json.behaviours[x].name;
    menuItem.key = lcns( menuItem.name );
    menuItem.description = json.behaviours[x].description;
    menuItem.evidence = json.behaviours[x].evidence;
    menuItem.url = `${hostname}/role/${role}/${menuItem.key}/${docid || ''}`;
    menuItem.group = 'behaviour';
    menuItem.active = (menuItem.key == activeKey);
    menuData.push( menuItem );
  }

  return menuData;
}

function getScoreAndEvidence( skill, docid ) {
  var doc = loadDoc( docid );
  var data = doc[ skill ];
  if (!data) {
    data = { score: '0', evidence: '' };
  }
  return data;
}

// set the view engine to ejs
app.set('view engine', 'ejs');

// use res.render to load up an ejs view file

// index page
app.get('/', function(req, res) {
  // res.render( 'go' );
  res.redirect( '/go' );
});

app.get('/go', function(req, res) {
  res.render( 'go' );
});

app.post('/go', function(req, res) {
  console.log( `POST /go` );
  console.log( req.body );

  var docid = req.body.docid;
  if (docid == '') {
    res.redirect( '/go' );
  }
  else {
    var doc = loadDoc( docid );
    var role = doc.role;
    if (!role) {
      role = roleNames[ 0 ];
      doc.role = role;
      saveDoc( docid, doc );
    }
    res.redirect( `${hostname}/admin/${lcns(role)}/${docid}` ); 
  }
});

// about page
app.get('/about', function(req, res) {
  res.render('pages/about');
});

function isValidRole( role ) {
  var success = false;
  var json = db[ role ]
  if (json) {
    success = true;
  }
  return success;
}

function isValidRoleAndSkill( role, skill ) {
  var success = false;
  var json = db[ role ]
  if (json) {
    var menuData = getMenuData( role );
    for (var item of menuData) {
      if (lcns( item.name ) == skill ) {
        success = true;
      }
    }
  }
  return success;
}


function getDescriptions( role, skill ) {
  var success = false;
  var json = db[ role ]
  if (json) {
    var menuData = getMenuData( role );
    for (var item of menuData) {
      if (item.key == skill ) {
        var desc = {};
        desc.evidence = item.evidence;
        desc.description = item.description;
        desc.title = item.name;
        return desc;
      }
    }
  }
  return null;
}

function getReport( role, docid ) {
  var success = false;
  var json = db[ role ]
  var report = [];
  if (json) {
    var menuData = getMenuData( role );
    for (var item of menuData) {
      var r = {};
      r.description = item.description;
      r.title = item.name;
      r.group = item.group;
      var ev = getScoreAndEvidence( item.key, docid );
      r.score = ev.score;
      r.evidence = ev.evidence;
      console.log( r );
      report.push( r );
    }
  }
  return report;
}

function getFinalScores( report ) {
  var total = 0;
  var average = 0;
  var profiency = '?';
  var count = 0;
  var badScores = 0;
  var badEvidences = 0;
  var warning = '';

  for (var item of report) {
    if (item.score == '0') {
      badScores = badScores + 1;
    }
    else {
      total = total + parseFloat( item.score );
    }

    if (item.evidences == '') {
      badEvidences = badEvidences + 1;
    }
    count = count + 1;
  }
  if (count > 0) {
    average = total / count;
    average = average.toFixed(1);
  }

  if ((average >= 1) && (average < 4.0)) {
    proficiency = 'Developing';
  }
  else if ((average >= 4) && (average < 7)) {
    proficiency = 'Proficient';
  }
  else {
    proficiency = 'Accomplished';
  } 

  if (badScores > 0) {
    warning = "Warning - not all scores have been entered.";
    average = '-';
    total = '-';
    proficiency = '-';
  }

  console.log( `average is ${average}` );
  console.log( `warning is ${warning}` );
  console.log( `total is ${total}` );
  console.log( `profiency is ${proficiency}` );

  return { total: total, average: average, proficiency: proficiency, warning: warning };
}

function urlRoleToRoleString( role ) {
  var json = db[ role ]
  if (json) {
    return json.role;
  }
  return '?';
}

function loadAdmin( docid, role ) {
  var doc = loadDoc( docid );
  var name = doc.name || '?'; 
  var grade = doc.grade || 'Junior';
  var capability = doc.capability || 'Developing';
  var date = doc.date || 'date';
  return { name: name, grade: grade, capability: capability, date: date, rolenames: roleNames, role: urlRoleToRoleString(role), grades: [ 'Junior', 'HEO', 'SEO', 'Grade 7', 'Grade 6' ], capabilities: [ 'Developing', 'Accomplished', 'Proficient' ] };
}

app.get('/report/:role/:docid', function(req, res) {
  var role = req.params.role;
  var docid = req.params.docid;

  var report = getReport( role, docid );
  var summaryScores = getFinalScores( report );

  console.log( `GET /report/${role}/${docid}` );

  if (isValidRole( role ) && isDocIdExists( docid )) {
    res.render( 'report', {
      report : report,
      summary: summaryScores,
      admin : loadAdmin( docid, role )
    });
  }
  else {
    console.log( '404 ^^' );
    res.sendStatus( 404 );
  }
});


app.get('/admin/:role/:docid', function(req, res) {
  var role = req.params.role;
  var skill = req.params.skill;
  var docid = req.params.docid;

  console.log( `GET /admin/${role}/${docid}` );

  skill = 'admin';

  if (isValidRole( role ) && isDocIdExists( docid )) {
    res.render( 'admin', {
      menudata : getMenuData( role, skill, docid ),
      score : getScoreAndEvidence( skill, docid ),
      meta : { role: role, skill: skill, docid: docid, hostname: hostname },
//      admin : { name: 'name', role: urlRoleToRoleString(role), grade: 'grade', capability: 'cap', date: '', rolenames: roleNames }
      admin : loadAdmin( docid, role )
    });
  }
  else {
    console.log( '404 ^^' );
    res.sendStatus( 404 );
  }
});

app.post('/admin/:role/:docid', function(req, res) {
  var role = req.params.role;
  var docid = req.params.docid;
  var skill = 'admin';

  console.log( `POST /admin/${role}/${docid}` );
  console.log( req.body );

  role = lcns(req.body.role);
// ---
  var doc = loadDoc( req.params.docid );
  doc.name = req.body.name;
  doc.grade = req.body.grade;
  doc.capability = req.body.capability;
  doc.date = req.body.date;
  doc.role = req.body.role;
  saveDoc( docid, doc );
  console.log( "saving" );
  console.log( doc );
// ---
  res.redirect( `${hostname}/admin/${role}/${docid}` ); 
/*

  if (isValidRole( role ) && isDocIdExists( docid )) {
    res.render( 'admin', {
      menudata : getMenuData( role, skill, docid ),
      score : getScoreAndEvidence( skill, docid ),
      meta : { role: role, skill: skill, docid: docid, hostname: hostname },
      admin : { name: 'name', role: urlRoleToRoleString(role), grade: 'grade', capability: 'cap', date: '', rolenames: roleNames }
    });
  }
  else {
    console.log( '404 ^^' );
    res.sendStatus( 404 );
  }
*/

});


app.get('/role/:role/:skill/:docid', function(req, res) {
  var role = req.params.role;
  var skill = req.params.skill;
  var docid = req.params.docid;

  console.log( `GET /role/${role}/${skill}/${docid}` );

  if (isValidRoleAndSkill( role, skill ) && isDocIdExists( docid )) {
    res.render('test', {
      menudata : getMenuData( role, skill, docid ),
      score : getScoreAndEvidence( skill, docid ),
      desc : getDescriptions( role, skill ),
      meta : { role: role, skill: skill, docid: docid, hostname: hostname },
      admin : loadAdmin( docid, role )
    });
  }
  else {
    console.log( '404 ^^' );
    res.sendStatus( 404 );
  }
});

function isValidScore( score ) {
  var success = false;
//  var regexp = /^\d+(\.\d{1,2})?$/;
  var regexp = /^\d+(\.\d{1,1})?$/;
  if (regexp.test( score )) {
    var f = parseFloat( score );
    success = (f >= 0) && (f <= 8);
  }
  return success;
}

app.post('/role/:role/:skill/:docid', function(req, res) {
  console.log( 'posted' );
/*
  console.log( req.params );
  console.log( req.params.role );
  console.log( req.params.skill );
  console.log( req.params.docid );
*/
  //console.log( req.body );
  console.log( `posted to ${req.params.docid}.${req.params.skill}` );
  console.log( `score is ${req.body.score}` );
  console.log( `evidence is ${req.body.evidence}` );
  var role = req.params.role;
  var skill = req.params.skill;
  var docid = req.params.docid;

  var doc = loadDoc( req.params.docid );

  var score = req.body.score;
  if (!isValidScore( score )) {
    score = '0';
  }
  var data = { score: score, evidence: req.body.evidence };

  doc[ req.params.skill ] = data;
  saveDoc( req.params.docid, doc );

  if (isValidRoleAndSkill( req.params.role, req.params.skill )) {
    //res.render('test', { testhello: "hello world", menudata : getMenuData( req.params.role, req.params.skill, req.params.docid ) } );
    res.render('test', {
      menudata : getMenuData( role, skill, docid ),
      score : getScoreAndEvidence( skill, docid ),
      desc : getDescriptions( role, skill ),
      meta : { role: role, skill: skill, docid: docid, hostname: hostname },
      admin : loadAdmin( docid, role )
    });
  }
  else {
    res.sendStatus( 404 );
  }
});

app.listen(8080);
console.log('Server is listening on port 8080');

